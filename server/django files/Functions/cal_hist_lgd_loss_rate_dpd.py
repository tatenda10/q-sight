import os
import sys
import pandas as pd
import numpy as np
import re
from decimal import Decimal

from django.db import transaction
from IFRS9.models import (
    FCT_Stage_Determination, 
    Dim_Delinquency_Band,
    HistoricalDateRange,
    Ldn_LGD_Term_Structure,  # Overall portfolio LGD (the PD term structure for LGD)
    Ldn_LGD_Detailed,        # Detailed default event calculations per account
    Ldn_LGD_Aggregated,      # Aggregated LGD by segment
    Ldn_LGD_Default_Band,    # Dynamic default band configuration per segment
    FSI_Product_Segment,     # Product segment model for segment_id
    Credit_Rating_Code_Band, # Rating codes for rating-based term structures
    FSI_LGD_Term_Structure   # The model to save overall LGD when rating/delinquency based
)
from django.conf import settings
from .save_log import save_log

# Define EPSILON as a Decimal to avoid float/Decimal issues.
EPSILON = Decimal("0.000001")

# ---------------------------------------------------------------------
# Decorator for logging function entry/exit/errors
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
    Extracts a numeric value from a string (if applicable).
    """
    if isinstance(value, str):
        mapping = {"active": 0, "pending": 10, "suspended": 20}
        if value.lower() in mapping:
            return mapping[value.lower()]
        match = re.search(r'\d+', value)
        return float(match.group()) if match else None
    return value

@log_function
def get_band_order():
    """
    Returns a list of delinquency band codes (sorted by n_delq_lower_value).
    """
    bands = Dim_Delinquency_Band.objects.all().order_by('n_delq_lower_value')
    return [band.n_delq_band_code.lower() for band in bands]

@log_function
def load_stage_data():
    """
    Loads raw data from FCT_Stage_Determination.
    Retrieves:
      - fic_mis_date, n_segment_skey, n_prod_type, n_delq_band_code,
        v_amrt_term_unit, n_account_number, n_carrying_amount_ncy,
        n_collateral_amount.
    Data is filtered using the HistoricalDateRange table.
    """
    dpd_segments = FCT_Stage_Determination.objects.values_list('n_segment_skey', flat=True)
    date_range = HistoricalDateRange.objects.first()
    if not date_range:
        raise ValueError("No historical date range defined.")

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
        'n_account_number',
        'n_carrying_amount_ncy',
        'n_collateral_amount'
    )

    qs_list = list(qs)
    if not qs_list:
        save_log("load_stage_data", "WARNING", "No records found for LGD calculation.")
        df = pd.DataFrame(columns=[
            'fic_mis_date','n_segment_skey','n_prod_type','n_delq_band_code',
            'v_amrt_term_unit','n_account_number','n_carrying_amount_ncy','n_collateral_amount'
        ])
    else:
        df = pd.DataFrame.from_records(qs_list)

    if 'fic_mis_date' in df.columns:
        df['fic_mis_date'] = pd.to_datetime(df['fic_mis_date'])
    else:
        df['fic_mis_date'] = pd.NaT

    save_log("load_stage_data", "INFO", f"Loaded {len(df)} records for LGD calculation.")
    return df

@log_function
def get_default_delinq_band(term_unit):
    """
    Fallback: returns the default delinquency band from Dim_Delinquency_Band for a given term unit.
    (Typically the one with the highest n_delq_lower_value, e.g. '90+').
    """
    bands = Dim_Delinquency_Band.objects.filter(v_amrt_term_unit=term_unit).order_by('n_delq_lower_value')
    if bands.exists():
        return bands.last().n_delq_band_code
    return None

@log_function
def build_default_band_mapping(df):
    """
    For each segment (n_segment_skey), determine the default delinquency band.
    First tries Ldn_LGD_Default_Band (dynamic config), otherwise uses get_default_delinq_band().
    """
    mapping = {}
    for segment, df_segment in df.groupby('n_segment_skey'):
        dynamic_record = Ldn_LGD_Default_Band.objects.filter(n_segment_skey=segment).first()
        if dynamic_record:
            default_band = dynamic_record.lgd_default_band
        else:
            term_unit = df_segment['v_amrt_term_unit'].iloc[0]
            default_band = get_default_delinq_band(term_unit)
        mapping[segment] = default_band
        print(f"For segment '{segment}', default band is: {default_band}")
    return mapping

@log_function
def calculate_lgd():
    """
    Calculates LGD as follows:
      1. Load data and sort by (n_account_number, fic_mis_date).
      2. Flag the first default event (where n_delq_band_code == default band for that segment).
      3. Determine the exposure at default (n_carrying_amount_ncy) and collateral at default.
      4. Find the minimum carrying amount after default (proxy for recovery).
      5. Compute cash_recovered + collateral_amount, cap at exposure.
      6. Calculate LGD = (exposure - adjusted_recovered) / (exposure + EPSILON).
      7. Aggregate results by segment (average LGD and default event count).
      8. Compute overall LGD as the average across all default events.
    """
    df = load_stage_data()
    df = df.sort_values(by=['n_account_number', 'fic_mis_date'])

    default_band_mapping = build_default_band_mapping(df)

    def is_default(row):
        seg = row['n_segment_skey']
        default_band = default_band_mapping.get(seg)
        if default_band and isinstance(row['n_delq_band_code'], str):
            return row['n_delq_band_code'].lower() == default_band.lower()
        return False

    df['is_default_event'] = df.apply(is_default, axis=1)

    # For each account, pick the first default event.
    default_events = df[df['is_default_event']].groupby('n_account_number').first().reset_index()
    default_events = default_events[[
        'n_account_number', 'fic_mis_date', 'n_carrying_amount_ncy',
        'n_collateral_amount', 'n_segment_skey'
    ]]
    default_events.rename(columns={
        'fic_mis_date': 'default_date',
        'n_carrying_amount_ncy': 'exposure_at_default'
    }, inplace=True)

    # Merge back for after_default
    df = pd.merge(df, default_events[['n_account_number','default_date']], on='n_account_number', how='left')
    df['after_default'] = df['fic_mis_date'] > df['default_date']

    # Min carrying amount after default
    recovery = df[df['after_default']].groupby('n_account_number')['n_carrying_amount_ncy'].min().reset_index()
    recovery.rename(columns={'n_carrying_amount_ncy': 'min_carrying_amount'}, inplace=True)

    default_events = pd.merge(default_events, recovery, on='n_account_number', how='left')

    default_events['cash_recovered'] = default_events['exposure_at_default'] - default_events['min_carrying_amount']
    default_events['cash_recovered'] = default_events['cash_recovered'].fillna(0)

    default_events['n_collateral_amount'] = default_events['n_collateral_amount'].fillna(0)
    default_events['adjusted_recovered'] = default_events['cash_recovered'] + default_events['n_collateral_amount']
    default_events['adjusted_recovered'] = default_events.apply(
        lambda r: min(r['adjusted_recovered'], r['exposure_at_default']),
        axis=1
    )

    default_events['lgd'] = default_events.apply(
        lambda r: (r['exposure_at_default'] - r['adjusted_recovered']) / (r['exposure_at_default'] + EPSILON),
        axis=1
    )
    default_events['lgd'] = default_events['lgd'].fillna(0)

    # Aggregation
    segment_lgd = default_events.groupby('n_segment_skey')['lgd'].agg(['mean','count']).reset_index()
    segment_lgd.rename(columns={'mean':'segment_lgd','count':'default_event_count'}, inplace=True)

    overall_lgd = default_events['lgd'].mean()
    overall_lgd = overall_lgd if not pd.isna(overall_lgd) else 0

    save_log("calculate_lgd", "INFO", f"Calculated overall LGD: {overall_lgd:.4f} based on {len(default_events)} default events.")
    return overall_lgd, segment_lgd, default_events

@log_function
def save_lgd_detailed(fic_mis_date, detailed_df):
    """
    Saves records to Ldn_LGD_Detailed (detailed LGD).
    """
    try:
        def safe_decimal(num):
            if pd.isna(num):
                return Decimal("0.00")
            return Decimal(str(num))

        detailed_records = []
        for _, row in detailed_df.iterrows():
            exposure   = safe_decimal(row['exposure_at_default'])
            collateral = safe_decimal(row.get('n_collateral_amount', 0))
            min_carry  = safe_decimal(row.get('min_carrying_amount', 0))
            recovered  = safe_decimal(row['adjusted_recovered'])
            lgd_val    = safe_decimal(row['lgd'])

            rec = Ldn_LGD_Detailed(
                n_account_number = row['n_account_number'],
                n_segment_skey   = row['n_segment_skey'],
                default_date     = row['default_date'],
                exposure_at_default  = exposure,
                n_collateral_amount  = collateral,
                min_carrying_amount  = min_carry,
                recovered_amount     = recovered,
                lgd                 = lgd_val,
                fic_mis_date        = fic_mis_date
            )
            detailed_records.append(rec)

        if detailed_records:
            Ldn_LGD_Detailed.objects.bulk_create(detailed_records)
            save_log("save_lgd_detailed", "INFO", f"Saved {len(detailed_records)} detailed LGD records.")
        else:
            save_log("save_lgd_detailed", "WARNING", "No detailed LGD records to save.")
        return True
    except Exception as e:
        save_log("save_lgd_detailed", "ERROR", f"Error saving detailed LGD records: {e}")
        raise

@log_function
def save_lgd_aggregated(fic_mis_date, segment_lgd_df):
    """
    Saves records to Ldn_LGD_Aggregated (aggregated LGD by segment).
    """
    try:
        def safe_decimal(num):
            if pd.isna(num):
                return Decimal("0.00")
            return Decimal(str(num))

        aggregated_records = []
        for _, row in segment_lgd_df.iterrows():
            seg_lgd = safe_decimal(row['segment_lgd'])
            rec = Ldn_LGD_Aggregated(
                n_segment_skey      = row['n_segment_skey'],
                default_event_count = row['default_event_count'],
                segment_lgd         = seg_lgd,
                fic_mis_date        = fic_mis_date
            )
            aggregated_records.append(rec)

        if aggregated_records:
            Ldn_LGD_Aggregated.objects.bulk_create(aggregated_records)
            save_log("save_lgd_aggregated", "INFO", f"Saved {len(aggregated_records)} aggregated LGD records.")
        else:
            save_log("save_lgd_aggregated", "WARNING", "No aggregated LGD records to save.")
        return True
    except Exception as e:
        save_log("save_lgd_aggregated", "ERROR", f"Error saving aggregated LGD records: {e}")
        raise

@log_function
def save_lgd_overall(fic_mis_date, segment_lgd_df):
    """
    Saves overall LGD records into Ldn_LGD_Term_Structure (per segment).
    Then saves a record for each code in FSI_LGD_Term_Structure, 
    referencing Ldn_PD_Term_Structure as required by your model. 
    """
    try:
        from IFRS9.models import FSI_Product_Segment, FSI_LGD_Term_Structure, Ldn_PD_Term_Structure, Credit_Rating_Code_Band

        def safe_decimal(num):
            if pd.isna(num):
                return Decimal("0.00")
            return Decimal(str(num))

        for _, row in segment_lgd_df.iterrows():
            segment_id = row['n_segment_skey']
            product_segment = FSI_Product_Segment.objects.get(segment_id=segment_id)
            seg_lgd = safe_decimal(row['segment_lgd'])

            # (1) Save a record in Ldn_LGD_Term_Structure 
            overall_record = Ldn_LGD_Term_Structure(
                v_lgd_term_structure_id=segment_id,
                v_lgd_term_structure_name=product_segment,
                v_lgd_term_structure_desc=product_segment.v_prod_desc,
                n_lgd_percent=seg_lgd,
                ttc_lgd_percent=seg_lgd,
                fic_mis_date=fic_mis_date
            )
            overall_record.save()

            # (2) Build v_credit_risk_basis_cd logic
            if hasattr(product_segment, 'v_pd_term_structure_type') and product_segment.v_pd_term_structure_type == 'R':
                # rating-based
                codes_list = list(Credit_Rating_Code_Band.objects.order_by('order').values_list('v_rating_code', flat=True))
            else:
                # DPD-based
                codes_list = list(Dim_Delinquency_Band.objects.order_by('n_delq_lower_value').values_list('n_delq_band_code', flat=True))

            # (3) Retrieve or create the Ldn_PD_Term_Structure instance 
            #     because FSI_LGD_Term_Structure references that.
            ldn_pd_ts, created = Ldn_PD_Term_Structure.objects.get_or_create(
                v_pd_term_structure_id=segment_id,
                defaults={
                    # If needed, fill required fields for Ldn_PD_Term_Structure
                    'v_pd_term_structure_name': product_segment,
                    'v_pd_term_frequency_unit': 'M',  # or Q/H/Y if you want
                    'v_pd_term_structure_type': 'D', # or 'R' if rating-based
                    'fic_mis_date': fic_mis_date,
                }
            )

            # (4) For each code, create an FSI_LGD_Term_Structure row referencing the Ldn_PD_Term_Structure instance
            for single_code in codes_list:
                overall_fsi_record = FSI_LGD_Term_Structure(
                    v_lgd_term_structure_id=ldn_pd_ts,    # must be Ldn_PD_Term_Structure object
                    fic_mis_date=fic_mis_date,
                    v_credit_risk_basis_cd=single_code,
                    n_lgd_percent=seg_lgd,
                    ttc_lgd_percent=seg_lgd
                )
                overall_fsi_record.save()

            save_log("save_lgd_overall", "INFO", f"Segment {segment_id}: Saved Ldn_LGD_Term_Structure + {len(codes_list)} FSI_LGD_Term_Structure rows.")
        return True
    except Exception as e:
        save_log("save_lgd_overall", "ERROR", f"Error saving overall LGD: {e}")
        raise



@log_function
def run_lgd_calculation_dpd(fic_mis_date):
    """
    Main function that orchestrates the entire LGD calculation.
    Returns 1 if successful, or 0 if there's an error.
    """
    try:
        final_reporting_date = pd.to_datetime(fic_mis_date).date()
        
        # 1. Calculate LGD
        overall_lgd, segment_lgd_df, detailed_df = calculate_lgd()

        # 2. Delete existing records for final_reporting_date in detail, aggregated, and overall
        Ldn_LGD_Detailed.objects.filter(fic_mis_date=final_reporting_date).delete()
        save_lgd_detailed(fic_mis_date, detailed_df)

        Ldn_LGD_Aggregated.objects.filter(fic_mis_date=final_reporting_date).delete()
        save_lgd_aggregated(fic_mis_date, segment_lgd_df)

        Ldn_LGD_Term_Structure.objects.filter(fic_mis_date=final_reporting_date).delete()
        FSI_LGD_Term_Structure.objects.filter(fic_mis_date=final_reporting_date).delete()
        # Save new overall
        save_lgd_overall(fic_mis_date, segment_lgd_df)

        return 1
    except Exception as e:
        return 0
