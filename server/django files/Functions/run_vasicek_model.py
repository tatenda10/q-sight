import math
from bisect import bisect_right
from collections import defaultdict
from scipy.stats import norm
from django.db.models import Q
from IFRS9.models import (
    FSI_PD_Interpolated, 
    MacroeconomicProjection, 
    IFRS9PDSensitivityFactors, 
    IFRS9PDSensitivity,
    IFRS9ScenarioWeights
)
from .save_log import save_log

# Default Basel values for sensitivity factors and asset correlation
DEFAULT_BETA1 = -0.300  # For Real GDP Growth
DEFAULT_BETA2 = 0.200   # For Inflation Rate
DEFAULT_BETA3 = 0.400   # For Unemployment Rate
DEFAULT_BETA4 = 0.100   # For Government Debt
DEFAULT_RHO   = 0.1     # Asset correlation


def get_scenario_weights():
    try:
        weights = IFRS9ScenarioWeights.objects.first()
        return {
            'BASE': float(weights.weight_base),
            'BEST': float(weights.weight_best),
            'WORST': float(weights.weight_worst)
        }
    except IFRS9ScenarioWeights.DoesNotExist:
        # Fallback defaults if no record exists
        return {'BASE': 0.333, 'BEST': 0.333, 'WORST': 0.333}
    
def load_sensitivity_cache(mis_date):
    """
    Pre-fetch sensitivity factors and asset correlation for all PD term structures 
    appearing in FSI_PD_Interpolated for the given MIS date.
    Returns two dictionaries keyed by pd_term_structure id.
    """
    records = FSI_PD_Interpolated.objects.filter(fic_mis_date=mis_date)
    pd_term_ids = {r.v_pd_term_structure_id for r in records if r.v_pd_term_structure_id}
    
    sensitivity_cache = {}
    correlation_cache = {}
    
    sens_qs = IFRS9PDSensitivityFactors.objects.filter(pd_term_structure__in=pd_term_ids)
    for obj in sens_qs:
        sensitivity_cache[obj.pd_term_structure] = obj

    corr_qs = IFRS9PDSensitivity.objects.filter(pd_term_structure__in=pd_term_ids)
    for obj in corr_qs:
        correlation_cache[obj.pd_term_structure] = obj

    return sensitivity_cache, correlation_cache

def load_macro_projection_cache(mis_date, scenarios=('BASE','BEST','WORST')):
    """
    Pre-fetch all macroeconomic projections for the given MIS date and scenarios.
    Returns a dictionary: macro_cache[scenario] = sorted list of tuples (projection_year, macro_dict)
    """
    macro_cache = defaultdict(list)
    qs = MacroeconomicProjection.objects.filter(
        fic_mis_date=mis_date,
        scenario__in=scenarios
    ).order_by('projection_year')
    for proj in qs:
        macro = {
            'X1': float(proj.real_gdp_growth) if proj.real_gdp_growth is not None else 0.0,
            'X2': float(proj.inflation_rate) if proj.inflation_rate is not None else 0.0,
            'X3': float(proj.unemployment_rate) if proj.unemployment_rate is not None else 0.0,
            'X4': float(proj.government_gross_debt) if proj.government_gross_debt is not None else 0.0,
        }
        macro_cache[proj.scenario].append((proj.projection_year, macro))
    # Ensure lists are sorted by projection_year (they should be already)
    for scenario in scenarios:
        macro_cache[scenario].sort(key=lambda x: x[0])
    return macro_cache

def get_macro_for_record(macro_list, target_year):
    """
    Given a sorted list of (projection_year, macro_dict) and a target_year,
    return the macro_dict for the target_year if present; otherwise, return the last available macro.
    """
    years = [item[0] for item in macro_list]
    idx = bisect_right(years, target_year)
    if idx == 0:
        return macro_list[0][1]  # Use the first available if target_year is below available range.
    elif idx >= len(years):
        return macro_list[-1][1]  # Use the last available if target_year is above available range.
    else:
        # Exact match or closest lower value.
        return macro_list[idx-1][1]

def apply_vasicek_adjustment_all_scenarios(mis_date):
    """
    For each FSI_PD_Interpolated record with the given MIS date:
      - Uses the record's projection_year to retrieve macroeconomic variables from the pre-cached macro projections.
      - Uses cached sensitivity factors and asset correlation for each PD term structure.
      - Computes the PIT PD for each scenario (BASE, BEST, WORST) using the Vasicek model.
      - Stores computed PIT PDs in n_pit_pd_base, n_pit_pd_best, n_pit_pd_worst.
      - Updates n_cumulative_default_prob to the average of these PIT PDs.
      - Leaves n_cumulative_default_prob_base unchanged.
    """
    records = list(FSI_PD_Interpolated.objects.filter(fic_mis_date=mis_date))
    if not records:
        save_log('apply_vasicek_adjustment_all_scenarios', 'INFO', f"No records found for MIS date {mis_date}")
        return
    
    # Pre-fetch sensitivity and correlation objects
    sensitivity_cache, correlation_cache = load_sensitivity_cache(mis_date)
    # Pre-fetch macro projections for each scenario
    macro_cache = load_macro_projection_cache(mis_date)
    
    updated_records = []
    
    for record in records:
        # Use original TTC PD from n_cumulative_default_prob_base
        try:
            base_pd = float(record.n_cumulative_default_prob_base)
        except (TypeError, ValueError):
            save_log('apply_vasicek_adjustment_all_scenarios', 'ERROR', f"Record ID {record.id} has invalid n_cumulative_default_prob_base.")
            continue
        base_pd = min(max(base_pd, 1e-6), 1 - 1e-6)
        proj_year = record.projection_year
        
        pit_pd_values = {}
        for scenario in ['BASE', 'BEST', 'WORST']:
            # Get macro projection from cache; if none available, use zeros.
            macro_list = macro_cache.get(scenario, [])
            if macro_list:
                macro = get_macro_for_record(macro_list, proj_year)
            else:
                macro = {'X1': 0.0, 'X2': 0.0, 'X3': 0.0, 'X4': 0.0}
            
            X1, X2, X3, X4 = macro['X1'], macro['X2'], macro['X3'], macro['X4']
            
            # Retrieve sensitivity factors from cache; use default if not found.
            sens_obj = sensitivity_cache.get(record.v_pd_term_structure_id)
            if sens_obj:
                beta1 = float(sens_obj.beta1)
                beta2 = float(sens_obj.beta2)
                beta3 = float(sens_obj.beta3)
                beta4 = float(sens_obj.beta4)
            else:
                beta1, beta2, beta3, beta4 = DEFAULT_BETA1, DEFAULT_BETA2, DEFAULT_BETA3, DEFAULT_BETA4
                save_log('apply_vasicek_adjustment_all_scenarios', 'WARNING',
                         f"No sensitivity factors found for PD term structure {record.v_pd_term_structure_id}. Using default Basel values.")
            
            # Retrieve asset correlation from cache; use default if not found.
            corr_obj = correlation_cache.get(record.v_pd_term_structure_id)
            if corr_obj:
                rho = float(corr_obj.asset_correlation) if corr_obj.asset_correlation is not None else DEFAULT_RHO
                if rho <= 0 or rho >= 1:
                    save_log('apply_vasicek_adjustment_all_scenarios', 'WARNING',
                             f"Asset correlation {rho} for PD term structure {record.v_pd_term_structure_id} is invalid. Using default {DEFAULT_RHO}.")
                    rho = DEFAULT_RHO
            else:
                rho = DEFAULT_RHO
                save_log('apply_vasicek_adjustment_all_scenarios', 'WARNING',
                         f"No asset correlation found for PD term structure {record.v_pd_term_structure_id}. Using default {DEFAULT_RHO}.")
            
            # Compute adjusted factor and PIT PD.
            adjusted_factor = beta1 * X1 + beta2 * X2 + beta3 * X3 + beta4 * X4
            x = norm.ppf(base_pd)
            pit_input = (x - adjusted_factor) / math.sqrt(1 - rho)
            pit_pd = norm.cdf(pit_input)
            pit_pd = min(max(pit_pd, 1e-6), 1 - 1e-6)  # Ensure PD stays within a reasonable range
            pit_pd_values[scenario] = pit_pd
            save_log('apply_vasicek_adjustment_all_scenarios', 'INFO',
                     f"Record ID {record.id} ({scenario}): Base PD = {base_pd}, PIT PD = {pit_pd} using adjusted factor = {adjusted_factor} "
                     f"(betas: {beta1}, {beta2}, {beta3}, {beta4}; macro: {X1}, {X2}, {X3}, {X4}; ρ = {rho})")
        
        # Calculate average PIT PD from scenarios.
        weights = get_scenario_weights()
        avg_pit_pd =(weights['BASE'] * pit_pd_values.get('BASE', 0.0) +
                     weights['BEST'] * pit_pd_values.get('BEST', 0.0) +
                     weights['WORST'] * pit_pd_values.get('WORST', 0.0))
        
        # Update record fields.
        record.n_pit_pd_base = pit_pd_values.get('BASE')
        record.n_pit_pd_best = pit_pd_values.get('BEST')
        record.n_pit_pd_worst = pit_pd_values.get('WORST')
        record.n_cumulative_default_prob = avg_pit_pd
        updated_records.append(record)
        save_log('apply_vasicek_adjustment_all_scenarios', 'INFO',
                 f"Record ID {record.id} updated: Average PIT PD = {avg_pit_pd} stored in n_cumulative_default_prob; "
                 f"Original TTC PD remains in n_cumulative_default_prob_base; Scenario PIT PDs: {pit_pd_values}")
    
    # Bulk update all changed records at once.
    if updated_records:
        FSI_PD_Interpolated.objects.bulk_update(
            updated_records, 
            ['n_pit_pd_base', 'n_pit_pd_best', 'n_pit_pd_worst', 'n_cumulative_default_prob']
        )

def run_vasicek_pit_PD_values(mis_date):
    """
    Main function to run the Vasicek adjustment for a given MIS date.
    Returns "1" if the process completes successfully, "0" if an error occurs.
    """
    try:
        apply_vasicek_adjustment_all_scenarios(mis_date)
        return "1"
    except Exception as e:
        save_log('run_vasicek_pit_PD_values', 'ERROR', f"Error in Vasicek adjustment: {e}")
        return "0"
