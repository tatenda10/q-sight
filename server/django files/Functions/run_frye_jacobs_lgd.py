import math
from django.db.models import Q
from scipy.stats import norm

from IFRS9.models import (
    IFRS9ScenarioWeights,
    IFRS9PDSensitivity,           # Correlation model
    FSI_LGD_Term_Structure,
    FSI_PD_Interpolated
)
from .save_log import save_log

###############################################################################
# Configuration & Helpers
###############################################################################

DEFAULT_RHO_LGD = 0.15  # Fallback correlation if none found in IFRS9PDSensitivity

def get_scenario_weights():
    """
    Retrieves scenario weights (BASE, BEST, WORST) from IFRS9ScenarioWeights.
    """
    try:
        w = IFRS9ScenarioWeights.objects.first()
        return {
            'BASE': float(w.weight_base),
            'BEST': float(w.weight_best),
            'WORST': float(w.weight_worst)
        }
    except IFRS9ScenarioWeights.DoesNotExist:
        return {'BASE': 0.333, 'BEST': 0.333, 'WORST': 0.333}

def get_12m_bucket_id(unit):
    """
    Maps v_cash_flow_bucket_unit to the ID for a 12-month horizon:
      M -> 12, Q -> 4, H -> 2, Y -> 1
    Returns None if unrecognized.
    """
    mapping = {
        'M': 12,  # monthly => 12 months
        'Q': 4,   # quarterly => 4 quarters
        'H': 2,   # half-year => 2 half-years
        'Y': 1,   # yearly => 1 year
    }
    return mapping.get(unit)

def clamp_to_plus_minus_10pct(pit_value, ttc_value):
    """
    Ensures pit_value stays within ±10 percentage points of TTC LGD.
    E.g., if TTC LGD=0.40, clamp to [0.30, 0.50], also ensuring [0,1].
    """
    lower_bound = max(0.0, ttc_value - 0.10)
    upper_bound = min(1.0, ttc_value + 0.10)
    return max(lower_bound, min(pit_value, upper_bound))

###############################################################################
# Main Implementation (Mimicking Excel Formula & TTC PD = 100% Shortcut)
###############################################################################

def apply_frye_jacobs_all_scenarios_lgd(mis_date):
    """
    1) Loads FSI_LGD_Term_Structure for the given mis_date.
    2) For each LGD record, finds the matching PD record in FSI_PD_Interpolated:
       - Same v_pd_term_structure_id
       - v_credit_risk_basis_cd matches v_delq_band_code or v_int_rating_code
       - Must have the correct v_cash_flow_bucket_unit => 12-month horizon
    3) Retrieves:
       - TTC PD from n_cumulative_default_prob_base
       - scenario PDs from n_pit_pd_base, n_pit_pd_best, n_pit_pd_worst
       - asset correlation from IFRS9PDSensitivity
    4) If TTC PD >= ~100%, set PIT LGD = TTC LGD for all scenarios.
       Otherwise:
         k = (NORMSINV(TTC PD) - NORMSINV(TTC PD * TTC LGD)) / sqrt(1 - rho)
         PIT_LGD_scenario = NORMSDIST( NORMSINV(cDR_scenario) - k ) / cDR_scenario
    5) Clamps each PIT LGD ±10% around TTC LGD.
    6) Computes scenario-weighted average & updates DB.
    """

    lgd_records = list(
        FSI_LGD_Term_Structure.objects.filter(fic_mis_date=mis_date)
    )
    if not lgd_records:
        save_log('apply_frye_jacobs_all_scenarios_lgd', 'INFO',
                 f"No LGD records found for MIS date={mis_date}.")
        return

    scenario_weights = get_scenario_weights()
    updated_records = []

    for rec in lgd_records:
        # Ensure we have TTC LGD
        if rec.ttc_lgd_percent is None:
            save_log('apply_frye_jacobs_all_scenarios_lgd', 'WARNING',
                     f"LGD record {rec.id} missing TTC LGD. Skipping.")
            continue

        # Clamp TTC LGD to (0,1)
        ttc_lgd = float(rec.ttc_lgd_percent)
        ttc_lgd = min(max(ttc_lgd, 1e-6), 1 - 1e-6)

        # Find matching PD record(s)
        pd_candidates = FSI_PD_Interpolated.objects.filter(
            v_pd_term_structure_id=rec.v_lgd_term_structure_id.v_pd_term_structure_id
        ).filter(
            Q(v_delq_band_code=rec.v_credit_risk_basis_cd) |
            Q(v_int_rating_code=rec.v_credit_risk_basis_cd)
        )

        matched_pd_record = None
        for pd_rec in pd_candidates:
            desired_id = get_12m_bucket_id(pd_rec.v_cash_flow_bucket_unit)
            if desired_id is not None and pd_rec.v_cash_flow_bucket_id == desired_id:
                matched_pd_record = pd_rec
                break

        if not matched_pd_record:
            save_log('apply_frye_jacobs_all_scenarios_lgd', 'WARNING',
                     f"No 12m PD match for LGD record {rec.id}; skipping PIT LGD.")
            continue

        # Extract TTC PD
        pd_ttc = float(matched_pd_record.n_cumulative_default_prob_base or 0.0)
        if pd_ttc <= 0.0:
            save_log('apply_frye_jacobs_all_scenarios_lgd', 'WARNING',
                     f"LGD record {rec.id}: No valid TTC PD in matched PD record; skipping.")
            continue

        # Check if TTC PD is ~100%
        if pd_ttc >= 0.999999:
            # If TTC PD is effectively 100%, set PIT = TTC for all scenarios
            save_log('apply_frye_jacobs_all_scenarios_lgd', 'INFO',
                     f"TTC PD ~100%. Setting PIT LGD = TTC LGD for LGD record {rec.id}.")
            rec.pit_base_lgd_percent  = ttc_lgd
            rec.pit_best_lgd_percent  = ttc_lgd
            rec.pit_worst_lgd_percent = ttc_lgd
            rec.n_lgd_percent         = ttc_lgd
            updated_records.append(rec)
            continue

        # Otherwise clamp PD to avoid extremes in ppf
        pd_ttc = min(max(pd_ttc, 1e-6), 1 - 1e-6)

        # Extract scenario PD
        cdr_base  = float(matched_pd_record.n_pit_pd_base  or 0.0)
        cdr_best  = float(matched_pd_record.n_pit_pd_best  or 0.0)
        cdr_worst = float(matched_pd_record.n_pit_pd_worst or 0.0)

        cdr_base  = min(max(cdr_base,  1e-6), 1 - 1e-6)
        cdr_best  = min(max(cdr_best,  1e-6), 1 - 1e-6)
        cdr_worst = min(max(cdr_worst, 1e-6), 1 - 1e-6)

        # Fetch correlation
        try:
            corr_obj = IFRS9PDSensitivity.objects.get(
                pd_term_structure=rec.v_lgd_term_structure_id
            )
            rho = float(corr_obj.asset_correlation or DEFAULT_RHO_LGD)
            if rho <= 0 or rho >= 1:
                save_log('apply_frye_jacobs_all_scenarios_lgd', 'WARNING',
                         f"Invalid correlation={rho} for term structure {rec.v_lgd_term_structure_id}; using default={DEFAULT_RHO_LGD}")
                rho = DEFAULT_RHO_LGD
        except IFRS9PDSensitivity.DoesNotExist:
            rho = DEFAULT_RHO_LGD

        # Calculate k (Excel-style):
        # k = (NORMSINV(pd_ttc) - NORMSINV(pd_ttc * ttc_lgd)) / sqrt(1 - rho)
        try:
            pd_ttc_times_lgd = min(pd_ttc * ttc_lgd, 1 - 1e-15)
            part1 = norm.ppf(min(pd_ttc, 1 - 1e-15))
            part2 = norm.ppf(pd_ttc_times_lgd)
            k_val = (part1 - part2) / math.sqrt(1 - rho)
        except Exception as e:
            save_log('apply_frye_jacobs_all_scenarios_lgd', 'ERROR',
                     f"Error computing k for LGD record {rec.id}: {e}")
            continue

        # Excel formula for PIT LGD scenario:
        # =IFERROR( NORMSDIST(NORMSINV(cDR) - k) / cDR, ttc_lgd )
        def excel_style_pit_lgd(cdr):
            try:
                cdr_clamped = min(cdr, 1 - 1e-15)
                numerator = norm.cdf(norm.ppf(cdr_clamped) - k_val)
                pit_est = numerator / cdr_clamped if cdr_clamped > 1e-15 else ttc_lgd
                # clamp to [0,1]
                pit_est = min(max(pit_est, 0.0), 1.0)
                # clamp ±10% around TTC LGD
                return clamp_to_plus_minus_10pct(pit_est, ttc_lgd)
            except:
                return ttc_lgd

        pit_base  = excel_style_pit_lgd(cdr_base)
        pit_best  = excel_style_pit_lgd(cdr_best)
        pit_worst = excel_style_pit_lgd(cdr_worst)

        # Weighted average
        w_base  = scenario_weights['BASE']
        w_best  = scenario_weights['BEST']
        w_worst = scenario_weights['WORST']
        avg_pit_lgd = (pit_base  * w_base +
                       pit_best  * w_best +
                       pit_worst * w_worst)

        # Store results
        rec.pit_base_lgd_percent   = pit_base
        rec.pit_best_lgd_percent   = pit_best
        rec.pit_worst_lgd_percent  = pit_worst
        rec.n_lgd_percent          = avg_pit_lgd

        updated_records.append(rec)

        save_log('apply_frye_jacobs_all_scenarios_lgd', 'INFO',
                 (f"LGD record {rec.id}: PD_ttc={pd_ttc:.6f}, TTC_LGD={ttc_lgd:.4f}, "
                  f"Corr={rho:.3f}, k={k_val:.3f}, "
                  f"BASE_PIT={pit_base:.4f}, BEST_PIT={pit_best:.4f}, "
                  f"WORST_PIT={pit_worst:.4f}, Weighted={avg_pit_lgd:.4f}"))

    # Bulk update
    if updated_records:
        FSI_LGD_Term_Structure.objects.bulk_update(
            updated_records,
            [
                'pit_base_lgd_percent',
                'pit_best_lgd_percent',
                'pit_worst_lgd_percent',
                'n_lgd_percent'
            ]
        )

def run_frye_jacobs_pit_LGD_values(mis_date):
    """
    Main entry point for PIT LGD calculation replicating Excel's formula plus
    the rule: if TTC PD >= 100%, PIT LGD = TTC LGD for all scenarios.
    """
    try:
        apply_frye_jacobs_all_scenarios_lgd(mis_date)
        return "1"
    except Exception as e:
        save_log('run_frye_jacobs_pit_LGD_values', 'ERROR',
                 f"Error in LGD adjustment: {e}")
        return "0"
