import os
import sys
import pandas as pd
import numpy as np
import re

from django.db import transaction
from IFRS9.models import (
    FCT_Stage_Determination, 
    DimProductSegmentGroup, 
    Dim_Delinquency_Band,
    FSIFlowRateHistory,
    FSITransitionMatrix,      # New model for raw transition counts.
    Ldn_PD_Term_Structure_Dtl,
    FSICUMULATIVEPD,
    Ldn_PD_Term_Structure,  # Used to retrieve frequency unit and structure type.
    HistoricalDateRange
)

# Import the logging function.
from .save_log import save_log

EPSILON = 1e-6  # Small value to avoid division by zero
MIN_TRANSITION_PROB = 0.001  # Smoothing threshold for zero transition probability

# ---------------------------------------------------------------------
# Decorator to log entry, exit, and errors for each function.
# ---------------------------------------------------------------------
def log_function(func):
    def wrapper(*args, **kwargs):
        save_log(func.__name__, "INFO", f"Entered function {func.__name__}")
        try:
            result = func(*args, **kwargs)
            save_log(func.__name__, "INFO", f"Exiting function {func.__name__}")
            return result
        except Exception as e:
            save_log(func.__name__, "ERROR", f"Error in function {func.__name__}: {e}")
            raise
    return wrapper

def extract_numeric(value):
    """
    Extracts a numeric value from a band string.
    For known non-numeric labels (like 'active'), returns a preset value.
    """
    if isinstance(value, str):
        mapping = {"active": 0, "pending": 10, "suspended": 20}  # adjust as needed
        if value.lower() in mapping:
            return mapping[value.lower()]
        match = re.search(r'\d+', value)
        return float(match.group()) if match else None
    return value

@log_function
def get_band_order():
    """
    Returns a list of band codes sorted by their n_delq_lower_value as defined in Dim_Delinquency_Band.
    The codes are returned in lowercase.
    """
    from IFRS9.models import Dim_Delinquency_Band
    bands = Dim_Delinquency_Band.objects.all().order_by('n_delq_lower_value')
    return [band.n_delq_band_code.lower() for band in bands]

@log_function
def load_stage_data():
    """
    Load raw delinquency data from FCT_Stage_Determination into a DataFrame.
    Filters records whose n_segment_skey appears in Ldn_PD_Term_Structure (v_pd_term_structure_type = 'D').
    Fields: fic_mis_date, n_segment_skey, n_prod_type, n_delq_band_code, v_amrt_term_unit, n_account_number.
    """
    dpd_segments = Ldn_PD_Term_Structure.objects.filter(v_pd_term_structure_type='D').values_list('v_pd_term_structure_id', flat=True)
    # Example: retrieve the first date range from your HistoricalDateRange table.
    date_range = HistoricalDateRange.objects.first()
    if date_range:
        qs = FCT_Stage_Determination.objects.filter(
            n_segment_skey__in=list(dpd_segments),
            fic_mis_date__gte=date_range.start_date,
            fic_mis_date__lte=date_range.end_date
        ).values(
            'fic_mis_date', 
            'n_segment_skey', 
            'n_prod_type', 
            'n_delq_band_code', 
            'v_amrt_term_unit', 
            'n_account_number'
        )

    qs_list = list(qs)
    if not qs_list:
        save_log("load_stage_data", "WARNING", "No records found with matching n_segment_skey for DPD.")
        df = pd.DataFrame(columns=['fic_mis_date','n_segment_skey','n_prod_type','n_delq_band_code','v_amrt_term_unit','n_account_number'])
    else:
        df = pd.DataFrame.from_records(qs_list)
    if 'fic_mis_date' not in df.columns:
        df['fic_mis_date'] = pd.NaT
    else:
        df['fic_mis_date'] = pd.to_datetime(df['fic_mis_date'])
    save_log("load_stage_data", "INFO", f"Loaded {len(df)} records.")
    return df



@log_function
def merge_product_segments(stage_data_df):
    """
    Merge stage data with DimProductSegmentGroup using n_segment_skey.
    
    Steps:
      1. Initially assign each record’s n_segment_skey as its own v_combined_group.
      2. Convert n_segment_skey to integer in both the stage data and the mapping data.
      3. Merge stage_data_df with the mapping data from DimProductSegmentGroup.
      4. If a mapped value for v_combined_group exists, use it; otherwise, retain the original n_segment_skey.
      5. Convert the resulting v_combined_group to integer to avoid float values (e.g. 2.0).
    """
    # Step 1: Initial mapping.
    stage_data_df['v_combined_group'] = stage_data_df['n_segment_skey']
    
    # Step 2: Ensure n_segment_skey is integer in stage_data_df.
    stage_data_df['n_segment_skey'] = stage_data_df['n_segment_skey'].astype(int)
    
    # Step 3: Retrieve mapping data.
    qs = DimProductSegmentGroup.objects.all().values('n_segment_skey', 'v_combined_group')
    mapping_df = pd.DataFrame.from_records(qs)
    
    if not mapping_df.empty:
        # Ensure n_segment_skey in mapping_df is integer.
        mapping_df['n_segment_skey'] = mapping_df['n_segment_skey'].astype(int)
        
        # Merge stage_data_df with mapping_df on n_segment_skey using a left join.
        merged_df = pd.merge(stage_data_df, mapping_df, on='n_segment_skey', how='left', suffixes=("", "_db"))
        
        # Step 4: Update v_combined_group:
        # Use the mapped value if it exists; otherwise, retain the initial value.
        merged_df['v_combined_group'] = merged_df['v_combined_group_db'].combine_first(merged_df['v_combined_group'])
        
        # Remove the extra column.
        merged_df.drop(columns=['v_combined_group_db'], inplace=True)
        
        stage_data_df = merged_df

    # Step 5: Convert v_combined_group to integer (to avoid values like 2.0)
    stage_data_df['v_combined_group'] = stage_data_df['v_combined_group'].apply(
        lambda x: int(float(x)) if pd.notnull(x) else x
    )
    
    save_log("merge_product_segments", "INFO", f"Columns after merge: {list(stage_data_df.columns)}")
    return stage_data_df






@log_function
def get_default_delinq_band(term_unit):
    """
    Return the default delinquency band code from Dim_Delinquency_Band for a given term unit.
    (Default is the band with the highest n_delq_lower_value.)
    """
    bands = Dim_Delinquency_Band.objects.filter(v_amrt_term_unit=term_unit).order_by('n_delq_lower_value')
    if bands.exists():
        default_band = bands.last()
        return default_band.n_delq_band_code
    return None

@log_function
def build_group_default_band_mapping(stage_data_df):
    """
    For each combined group, determine the default delinquency band.
    """
    mapping = {}
    if 'v_combined_group' not in stage_data_df.columns:
        raise KeyError("Missing 'v_combined_group' column.")
    for group, df_group in stage_data_df.groupby('v_combined_group'):
        term_unit = df_group['v_amrt_term_unit'].iloc[0]
        default_band = get_default_delinq_band(term_unit)
        mapping[group] = default_band
        print(f"For group '{group}', default band is: {default_band}")
    return mapping

@log_function
def compute_transition_counts_by_period(df_group, previous_period, current_period, band_order):
    """
    For a given group and adjacent periods (previous_period and current_period),
    compute transition counts only for accounts common to both periods.
    
    For each adjacent pair in band_order, count:
      - n_prev_period_accounts: unique accounts in previous_period for that band (that also appear in current_period)
      - n_next_period_accounts: unique accounts in current_period for the adjacent band (common accounts)
      - transition_prob = n_next_period_accounts / (n_prev_period_accounts + EPSILON)
    
    Returns a DataFrame with columns:
      v_combined_group, prev_delq_band, n_delq_band_code_to, n_prev_period_accounts, n_next_period_accounts, transition_prob.
    """
    df_prev = df_group[df_group['period'] == previous_period].copy()
    df_curr = df_group[df_group['period'] == current_period].copy()
    
    # Standardize band codes to lowercase.
    df_prev['n_delq_band_code'] = df_prev['n_delq_band_code'].str.lower()
    df_curr['n_delq_band_code'] = df_curr['n_delq_band_code'].str.lower()
    
    # Consider only accounts present in both periods.
    common_accounts = set(df_prev['n_account_number'].unique()).intersection(set(df_curr['n_account_number'].unique()))
    
    records = []
    for i in range(len(band_order) - 1):
        prev_band = band_order[i]
        next_band = band_order[i + 1]
        accounts_prev = set(df_prev[df_prev['n_delq_band_code'] == prev_band]['n_account_number'].unique())
        common_prev = accounts_prev.intersection(common_accounts)
        accounts_next = set(df_curr[df_curr['n_delq_band_code'] == next_band]['n_account_number'].unique())
        common_transition = common_prev.intersection(accounts_next)
        n_prev = len(common_prev)
        n_next = len(common_transition)
        prob = n_next / (n_prev + EPSILON) if n_prev > 0 else 0.0
        records.append({
            'v_combined_group': df_group['v_combined_group'].iloc[0],
            'prev_delq_band': prev_band,
            'n_delq_band_code_to': next_band,
            'n_prev_period_accounts': n_prev,
            'n_next_period_accounts': n_next,
            'transition_prob': prob
        })
    return pd.DataFrame(records)

@log_function
def save_flow_rates_to_history(flow_rates_df, transition_date):
    """
    Save computed flow rates into FSIFlowRateHistory.
    The field 'transition_date' marks the period end.
    """
    records = []
    group_to_seg = get_group_to_segments_mapping()
    for _, row in flow_rates_df.iterrows():
        group = row['v_combined_group']
        seg_list = group_to_seg.get(group, [])
        segment_key = seg_list[0] if seg_list else group
        instance = Ldn_PD_Term_Structure.objects.filter(v_pd_term_structure_id=segment_key).first()
        if not instance:
            raise ValueError(f"No instance for segment key {segment_key} on {transition_date}")
        record = FSIFlowRateHistory(
            fic_mis_date=transition_date,
            n_segment_skey=instance,
            v_combined_group=row['v_combined_group'],
            v_credit_risk_basis_cd_from=row['prev_delq_band'],
            v_credit_risk_basis_cd_to=row['n_delq_band_code_to'],
            n_transition_prob=row['transition_prob'],
            transition_date=transition_date
        )
        records.append(record)
    batch_size = 1000
    for i in range(0, len(records), batch_size):
        FSIFlowRateHistory.objects.bulk_create(records[i:i+batch_size], batch_size=batch_size)
    print(f"Saved {len(records)} flow rate records for period {transition_date}.")

@log_function
def save_transition_matrix(counts_df, transition_date, group_prod_type):
    """
    Save computed transition counts into FSITransitionMatrix.
    Uses descriptive count field names.
    """
    records = []
    group_to_seg = get_group_to_segments_mapping()
    for _, row in counts_df.iterrows():
        group = row['v_combined_group']
        seg_list = group_to_seg.get(group, [])
        segment_key = seg_list[0] if seg_list else group
        instance = Ldn_PD_Term_Structure.objects.filter(v_pd_term_structure_id=segment_key).first()
        if not instance:
            raise ValueError(f"No instance for segment key {segment_key} on {transition_date}")
        record = FSITransitionMatrix(
            fic_mis_date=transition_date,
            n_segment_skey=instance,
            n_prod_type=group_prod_type.get(group, ""),
            v_combined_group=group,
            v_credit_risk_basis_cd_from=row['prev_delq_band'],
            v_credit_risk_basis_cd_to=row['n_delq_band_code_to'],
            n_accounts_moved=row['n_next_period_accounts'],
            n_total_accounts=row['n_prev_period_accounts'],
            transition_date=transition_date
        )
        records.append(record)
    FSITransitionMatrix.objects.bulk_create(records, batch_size=1000)
    print(f"Saved {len(records)} transition matrix records for period {transition_date}.")

@log_function
def get_group_to_segments_mapping():
    """
    Retrieve a mapping from each combined group to a list of product segment keys from DimProductSegmentGroup.
    """
    mapping = {}
    qs = DimProductSegmentGroup.objects.all().values('n_segment_skey', 'v_combined_group')
    if not qs:
        return mapping
    for rec in qs:
        group = rec.get('v_combined_group') or rec['n_segment_skey']
        segment = rec['n_segment_skey']
        mapping.setdefault(group, []).append(segment)
    save_log("get_group_to_segments_mapping", "INFO", f"Mapping: {mapping}")
    return mapping

@log_function
def build_group_frequency_mapping(reporting_date):
    """
    Build a mapping from each combined group to its PD frequency unit using Ldn_PD_Term_Structure.
    """
    qs = Ldn_PD_Term_Structure.objects.values('v_pd_term_structure_id', 'v_pd_term_frequency_unit')
    freq_by_segment = {}
    for rec in qs:
        freq_by_segment[str(rec['v_pd_term_structure_id'])] = rec['v_pd_term_frequency_unit']
    group_to_segments = get_group_to_segments_mapping()
    group_frequency = {}
    if not group_to_segments:
        for seg, freq in freq_by_segment.items():
            group_frequency[seg] = freq
    else:
        for group, segments in group_to_segments.items():
            freq = None
            for seg in segments:
                if seg in freq_by_segment:
                    freq = freq_by_segment[seg]
                    break
            if freq is None:
                freq = 'M'
            group_frequency[group] = freq
    save_log("build_group_frequency_mapping", "INFO", f"Group frequency: {group_frequency}")
    return group_frequency

@log_function
def compute_and_save_cumulative_pd(fic_mis_date):
    """
    Computes cumulative PD per transition date for each delinquency band and saves it into FSICUMULATIVEPD.
    Applies a smoothing threshold (MIN_TRANSITION_PROB) for zero transition probabilities.
    """
    try:
        flow_rates_qs = FSIFlowRateHistory.objects.filter(fic_mis_date=fic_mis_date)
        if not flow_rates_qs.exists():
            save_log("compute_and_save_cumulative_pd", "WARNING", f"No transition data for {fic_mis_date}")
            return 0
        flow_rates_df = pd.DataFrame.from_records(flow_rates_qs.values(
            'n_segment_skey', 'v_combined_group', 'n_prod_type',
            'v_credit_risk_basis_cd_from', 'v_credit_risk_basis_cd_to',
            'n_transition_prob', 'transition_date'
        ))
        if flow_rates_df.empty:
            save_log("compute_and_save_cumulative_pd", "WARNING", "No valid flow rate data available.")
            return 0
        flow_rates_df['n_transition_prob'] = flow_rates_df['n_transition_prob'].astype(float)
        records = []
        for transition_date in sorted(flow_rates_df['transition_date'].unique()):
            transition_df = flow_rates_df[flow_rates_df['transition_date'] == transition_date]
            cumulative_pd = {}
            for group in transition_df['v_combined_group'].unique():
                group_df = transition_df[transition_df['v_combined_group'] == group]
                # Get band order from the Dim_Delinquency_Band table.
                band_order = get_band_order()
                sorted_bands = sorted(group_df['v_credit_risk_basis_cd_from'].unique(), key=extract_numeric, reverse=True)
                cumulative_pd[group] = {}
                # Set the default band cumulative PD to 1.
                cumulative_pd[group]["90+"] = 1.0  
                for band in sorted_bands:
                    if band == "90+":
                        continue  # Skip the default band.
                    transitions = group_df[group_df['v_credit_risk_basis_cd_from'] == band]
                    # Apply smoothing: if a transition probability is zero, use a minimum value.
                    adjusted_probs = transitions['n_transition_prob'].apply(lambda p: p if p > 0 else MIN_TRANSITION_PROB)
                    pd_value = sum(adjusted_probs * transitions['v_credit_risk_basis_cd_to'].map(lambda x: cumulative_pd[group].get(x, 0)))
                    cumulative_pd[group][band] = round(pd_value, 6)
            for group, band_pds in cumulative_pd.items():
                for band, pd_value in band_pds.items():
                    segment_instance = Ldn_PD_Term_Structure.objects.filter(
                        v_pd_term_structure_id=transition_df[transition_df['v_combined_group'] == group]['n_segment_skey'].iloc[0]
                    ).first()
                    if segment_instance:
                        records.append(FSICUMULATIVEPD(
                            fic_mis_date=fic_mis_date,
                            transition_date=transition_date,
                            n_segment_skey=segment_instance,
                            n_prod_type=transition_df[transition_df['v_combined_group'] == group]['n_prod_type'].iloc[0],
                            v_combined_group=group,
                            v_credit_risk_basis_cd=band,
                            n_cumulative_pd=pd_value
                        ))
        with transaction.atomic():
            
            FSICUMULATIVEPD.objects.bulk_create(records)
        save_log("compute_and_save_cumulative_pd", "INFO", f"Cumulative PD successfully computed for {fic_mis_date}.")
        return 1
    except Exception as e:
        save_log("compute_and_save_cumulative_pd", "ERROR", f"Error computing cumulative PD: {e}")
        return 0

# NEW FUNCTIONS FOR ANNUAL PD FROM CUMULATIVE PD

@log_function
def annual_pd_from_cumulative(cum_pd, freq_unit):
    """
    Given a cumulative PD (cum_pd) for one period and a frequency unit,
    compute the annual PD.
    
    For example:
      - For monthly PD (freq_unit='M'): Annual PD = 1 - (1 - cum_pd)^12
      - For quarterly PD (freq_unit='Q'): Annual PD = 1 - (1 - cum_pd)^4
      - For daily PD (freq_unit='D'): Annual PD = 1 - (1 - cum_pd)^365
      - For half-year PD (freq_unit='H'): Annual PD = 1 - (1 - cum_pd)^2
      - For yearly PD (freq_unit='Y'): Annual PD = cum_pd

    Returns the annualized PD.
    """
    freq_map = {'D': 365, 'M': 12, 'Q': 4, 'H': 2, 'Y': 1}
    periods_per_year = freq_map.get(freq_unit.upper(), 12)
    annual_pd = 1 - (1 - cum_pd) ** periods_per_year
    return annual_pd

@log_function
def compute_annual_pd_from_cumulative(fic_mis_date, frequency_unit='M'):
    """
    Computes the annual PD using the cumulative PD values stored in FSICUMULATIVEPD.
    
    Steps:
      1. Load cumulative PD records for the given fic_mis_date.
      2. Group/average them by v_combined_group and band.
      3. Apply the annualization formula based on the specified frequency.
      4. Return a DataFrame with columns: [v_combined_group, from_band, annual_pd].
    """
    from IFRS9.models import FSICUMULATIVEPD
    qs = FSICUMULATIVEPD.objects.filter(fic_mis_date=fic_mis_date)
    if not qs.exists():
        save_log("compute_annual_pd_from_cumulative", "WARNING", f"No cumulative PD data for {fic_mis_date}")
        return pd.DataFrame(columns=['v_combined_group', 'from_band', 'annual_pd'])
    
    df = pd.DataFrame.from_records(qs.values('v_combined_group', 'v_credit_risk_basis_cd', 'n_cumulative_pd'))
    if df.empty:
        return pd.DataFrame(columns=['v_combined_group', 'from_band', 'annual_pd'])
    
    # Average cumulative PD for each group and band in case there are multiple records.
    df_avg = df.groupby(['v_combined_group', 'v_credit_risk_basis_cd'], as_index=False)['n_cumulative_pd'].mean()
    df_avg['annual_pd'] = df_avg['n_cumulative_pd'].apply(lambda x: annual_pd_from_cumulative(x, frequency_unit))
    df_avg.rename(columns={'v_credit_risk_basis_cd': 'from_band'}, inplace=True)
    save_log("compute_annual_pd_from_cumulative", "INFO", f"Computed annual PD from cumulative PD for {len(df_avg)} records.")
    return df_avg[['v_combined_group', 'from_band', 'annual_pd']]


@log_function
def build_group_prod_type_mapping(stage_data_df):
    """
    Build a mapping from each combined group to its product type from stage data.
    """
    if not isinstance(stage_data_df, pd.DataFrame):
        raise ValueError("Expected a DataFrame for stage_data_df")
    mapping = {}
    for group, df_group in stage_data_df.groupby('v_combined_group'):
        mapping[group] = df_group['n_prod_type'].iloc[0]
    save_log("build_group_prod_type_mapping", "INFO", f"Group product type mapping: {mapping}")
    return mapping

@log_function
def save_ttc_pd(ttc_pd_df, reporting_date, group_prod_type):
    """
    Save the computed annual PD values into Ldn_PD_Term_Structure_Dtl.
    Before inserting, delete any records with the same reporting_date.
    
    For each group:
      - If a mapping exists (e.g. group 3 maps to segments [1, 2]), then for each segment,
        create a record for every row in ttc_pd_df belonging to that group.
      - Additionally, always create records for the group itself.
    This ensures that segments (e.g. 1 and 2) inherit the PD of their group (3) and that
    an extra record for group 3 is also saved.
    """
    records = []
    group_to_segments = get_group_to_segments_mapping()
    save_log("save_ttc_pd", "INFO", f"Group to segments mapping: {group_to_segments}")

    # Group the PD data by v_combined_group.
    grouped = ttc_pd_df.groupby('v_combined_group')
    for group, group_df in grouped:
        # Convert group to integer (the mapping keys are integers)
        try:
            group_key = int(float(group))
        except Exception as e:
            save_log("save_ttc_pd", "ERROR", f"Error converting group {group} to integer: {e}")
            continue

        # Process mapped segments first (if any)
        if group_key in group_to_segments and group_to_segments[group_key]:
            for segment in group_to_segments[group_key]:
                try:
                    seg_int = int(float(segment))
                except Exception as e:
                    save_log("save_ttc_pd", "ERROR", f"Error converting segment {segment} to integer for group {group_key}: {e}")
                    continue

                # Look up the instance for the segment in Ldn_PD_Term_Structure.
                instance = Ldn_PD_Term_Structure.objects.filter(v_pd_term_structure_id=seg_int).first()
                if not instance:
                    save_log("save_ttc_pd", "WARNING", f"No instance found for segment {seg_int} on {reporting_date}")
                    continue

                # For this segment, create a record for each row (i.e. each band PD) from the group.
                for idx, row in group_df.iterrows():
                    from_band = row['from_band']
                    pd_value = row['annual_pd']
                    prod_type = group_prod_type.get(group_key, "")
                    record = Ldn_PD_Term_Structure_Dtl(
                        v_pd_term_structure_id=instance,
                        fic_mis_date=reporting_date,
                        v_credit_risk_basis_cd=from_band,
                        n_pd_percent=pd_value
                    )
                    records.append(record)
                save_log("save_ttc_pd", "INFO", f"Processed all records for segment {seg_int} under group {group_key}.")

        # Now, also create records for the group itself.
        instance = Ldn_PD_Term_Structure.objects.filter(v_pd_term_structure_id=group_key).first()
        if not instance:
            save_log("save_ttc_pd", "WARNING", f"No instance found for group {group_key} on {reporting_date}")
        else:
            for idx, row in group_df.iterrows():
                from_band = row['from_band']
                pd_value = row['annual_pd']
                record = Ldn_PD_Term_Structure_Dtl(
                    v_pd_term_structure_id=instance,
                    fic_mis_date=reporting_date,
                    v_credit_risk_basis_cd=from_band,
                    n_pd_percent=pd_value
                )
                records.append(record)
            save_log("save_ttc_pd", "INFO", f"Processed records for group {group_key} itself.")

    if records:
        Ldn_PD_Term_Structure_Dtl.objects.bulk_create(records)
        save_log("save_ttc_pd", "INFO", f"Saved {len(records)} annual PD records to Ldn_PD_Term_Structure_Dtl.")
    else:
        save_log("save_ttc_pd", "WARNING", f"No records to save for reporting_date {reporting_date} using mapping {group_to_segments}")

@log_function
def provision_matrix(fic_mis_date):
    """
    Main function to compute PDs using cumulative PD values.
    
    1. Derives a monthly period column.
    2. For each group, loops over adjacent periods and computes transitions between adjacent bands,
       using only accounts common to both periods (new accounts are excluded).
    3. Saves the computed flow rates and transition counts.
    4. Computes and saves cumulative PD.
    5. Finally, annualizes the cumulative PD using the formula:
         Annual PD = 1 - (1 - cum_PD)^(# periods per year)
    6. Saves the final annual PD into Ldn_PD_Term_Structure_Dtl and exports the result as CSV.
    
    Returns 1 if successful, or 0 if an exception occurs.
    """
    try:
        final_reporting_date = pd.to_datetime(fic_mis_date).date()
     

        date_range = HistoricalDateRange.objects.first()
        if date_range:
            start_date = date_range.start_date
            end_date = date_range.end_date
        else:
            # Fallback if no date range is defined; for example, use a default range or raise an error.
            raise ValueError("No historical date range defined.")
        
        # Then, clear only the records within that date range:
        band_codes = get_band_order()
        FSITransitionMatrix.objects.filter(
            fic_mis_date__gte=start_date,
            fic_mis_date__lte=end_date,
            v_credit_risk_basis_cd_from__in=band_codes
        ).delete()
        FSIFlowRateHistory.objects.filter(
            fic_mis_date__gte=start_date,
            fic_mis_date__lte=end_date,
            v_credit_risk_basis_cd_from__in=band_codes
        ).delete()
        FSICUMULATIVEPD.objects.filter(
            fic_mis_date__gte=start_date,
            fic_mis_date__lte=end_date,
            v_credit_risk_basis_cd__in=band_codes
        ).delete()


        # Load and merge data.
        stage_data_df = load_stage_data()
        stage_data_df = merge_product_segments(stage_data_df)
        stage_data_df = stage_data_df.sort_values(by='fic_mis_date', ascending=True)
        if 'v_combined_group' not in stage_data_df.columns:
            stage_data_df['v_combined_group'] = stage_data_df['n_segment_skey']
        stage_data_df = stage_data_df[stage_data_df['fic_mis_date'] <= pd.to_datetime(final_reporting_date)]
        stage_data_df['year'] = stage_data_df['fic_mis_date'].dt.year
        stage_data_df['month'] = stage_data_df['fic_mis_date'].dt.month
        # For period grouping, assume monthly periods.
        stage_data_df['period'] = stage_data_df['fic_mis_date'].dt.to_period('M')
       
        save_log("provision_matrix", "INFO", f"Columns: {list(stage_data_df.columns)}")
        
        # Build static mappings.
        group_frequency = build_group_frequency_mapping(final_reporting_date)
        group_default_band = build_group_default_band_mapping(stage_data_df)
        group_prod_type = build_group_prod_type_mapping(stage_data_df)
        
        # Build dynamic multipliers.
        freq_map = {'D': 365, 'M': 12, 'Q': 4, 'H': 2, 'Y': 1}
        dynamic_multiplier = {}
        for group, df_group in stage_data_df.groupby('v_combined_group'):
            freq = group_frequency.get(group, 'M')
            if freq == 'H':
                df_group['period'] = df_group['fic_mis_date'].apply(lambda d: f"{d.year}-H1" if d.month < 7 else f"{d.year}-H2")
            else:
                df_group['period'] = df_group['fic_mis_date'].dt.to_period(freq)
            df_group = df_group.dropna(subset=['period'])
            min_period = df_group['period'].min()
            max_period = df_group['period'].max()
            if freq in ['M', 'Q', 'Y']:
                observed = (max_period - min_period).n if (min_period is not None and max_period is not None) else 1
                multiplier = freq_map[freq.upper()] / observed if observed > 0 else freq_map[freq.upper()]
            elif freq == 'H':
                def half_year_to_num(p):
                    year, half = p.split("-")
                    return int(year) + (0 if half == "H1" else 0.5)
                observed = half_year_to_num(max_period) - half_year_to_num(min_period)
                multiplier = freq_map[freq.upper()] / observed if observed > 0 else freq_map[freq.upper()]
            dynamic_multiplier[group] = multiplier
            save_log("provision_matrix", "INFO", f"Group {group}: Observed period difference: {observed}, dynamic multiplier: {multiplier}")
        
        # Get natural band order.
        band_order = get_band_order()

        # Process transitions for each group between adjacent periods.
        pd_results_list = []
        for group, group_df in stage_data_df.groupby('v_combined_group'):
            periods = sorted(group_df['period'].unique())
            if len(periods) < 2:
                continue
            for i in range(1, len(periods)):
                previous_period = periods[i - 1]
                current_period = periods[i]
                counts_df = compute_transition_counts_by_period(group_df, previous_period, current_period, band_order)
                if counts_df.empty:
                    save_log("provision_matrix", "WARNING", f"No transitions for group {group} between {previous_period} and {current_period}.")
                    continue
                # Use current period as transition_date.
                transition_date = current_period.strftime('%Y-%m-%d')
                counts_df['transition_date'] = transition_date
                save_log("provision_matrix", "INFO", f"Transitions for group {group} between {previous_period} and {current_period}: shape {counts_df.shape}")
                save_flow_rates_to_history(counts_df, transition_date)
                save_transition_matrix(counts_df, transition_date, group_prod_type)
                compute_and_save_cumulative_pd(transition_date)
               
                save_log("provision_matrix", "INFO", f"Cumulative PD computed for group {group} between {previous_period} and {current_period}.")
        # After cumulative PD has been saved, compute annual PD from cumulative PD.
        annual_pd_df = compute_annual_pd_from_cumulative(fic_mis_date, frequency_unit='M')
        

        Ldn_PD_Term_Structure_Dtl.objects.filter(fic_mis_date=final_reporting_date).delete()
        save_ttc_pd(annual_pd_df, final_reporting_date, group_prod_type)
 
        save_log("provision_matrix", "INFO", f"Successfully computed long-term PD for fic_mis_date={fic_mis_date}.")
        output_file = os.path.join(os.getcwd(), "final_pd.csv")
        annual_pd_df.to_csv(output_file, index=False)
        save_log("provision_matrix", "INFO", f"Final annual PD dataframe saved to {output_file}")

        return 1  # Success
    except Exception as e:
        save_log("provision_matrix", "ERROR", f"Error during PD computation for fic_mis_date={fic_mis_date}: {e}")
        return 0  # Error
