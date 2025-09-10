import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from IFRS9.models import *
from .save_log import save_log
from django.db import transaction



# Term structure interpolation functions
def perform_interpolation(mis_date):
    """
    Perform PD interpolation based on the term structure details and preferences,
    processing items in batches of 5, with database consistency and thread safety.
    """
    try:
        preferences = FSI_LLFP_APP_PREFERENCES.objects.first()
        pd_interpolation_method = preferences.pd_interpolation_method or 'NL-POISSON'
        pd_model_proj_cap = preferences.n_pd_model_proj_cap

        # Clear previous interpolated results for the given date to ensure consistency
        FSI_PD_Interpolated.objects.filter(fic_mis_date=mis_date).delete()

        # Fetch term structure details and process in batches of 5
        term_structure_details = list(Ldn_PD_Term_Structure_Dtl.objects.filter(fic_mis_date=mis_date))
        batch_size = 5
        
        for i in range(0, len(term_structure_details), batch_size):
            batch = term_structure_details[i:i + batch_size]
            save_log('perform_interpolation', 'INFO', f"Processing batch {i // batch_size + 1} with {len(batch)} items")

            # Atomic transaction to ensure batch consistency
            with transaction.atomic():
                with ThreadPoolExecutor(max_workers=batch_size) as executor:
                    futures = {
                        executor.submit(process_interpolation, detail, pd_model_proj_cap, pd_interpolation_method): detail.id
                        for detail in batch
                    }
                    
                    for future in as_completed(futures):
                        detail_id = futures[future]
                        try:
                            future.result()  # Wait for the thread to complete
                            save_log('perform_interpolation', 'INFO', f"Interpolation completed for detail ID {detail_id}")
                        except Exception as e:
                            save_log('perform_interpolation', 'ERROR', f"Interpolation failed for detail ID {detail_id} with error: {e}")
                            raise  # Rollback if an error occurs in the batch

        save_log('perform_interpolation', 'INFO', "Term structure interpolation completed for all batches.")
        return '1'

    except Exception as e:
        save_log('perform_interpolation', 'ERROR', f"Error during interpolation: {e}")
        return '0'

def process_interpolation(detail, pd_model_proj_cap, pd_interpolation_method):
    """
    Process PD interpolation for a given term structure detail.
    """
    credit_risk_band = detail.v_credit_risk_basis_cd
    save_log('process_interpolation', 'INFO', f"Processing interpolation for credit risk band: {credit_risk_band}")

    bucket_length = detail.v_pd_term_structure_id.v_pd_term_frequency_unit

    if bucket_length == 'M':
        bucket_frequency = 12
        cash_flow_bucket_unit = 'M'
    elif bucket_length == 'H':
        bucket_frequency = 2
        cash_flow_bucket_unit = 'H'
    elif bucket_length == 'Q':
        bucket_frequency = 4
        cash_flow_bucket_unit = 'Q'
    else:
        bucket_frequency = 1
        cash_flow_bucket_unit = 'Y'

   
    if pd_interpolation_method == 'NL-POISSON':
        interpolate_poisson(detail, bucket_frequency, pd_model_proj_cap, cash_flow_bucket_unit)
    elif pd_interpolation_method == 'NL-GEOMETRIC':
        interpolate_geometric(detail, bucket_frequency, pd_model_proj_cap, cash_flow_bucket_unit)
    elif pd_interpolation_method == 'NL-ARITHMETIC':
        interpolate_arithmetic(detail, bucket_frequency, pd_model_proj_cap, cash_flow_bucket_unit)
    elif pd_interpolation_method == 'EXPONENTIAL_DECAY':
        interpolate_exponential_decay(detail, bucket_frequency, pd_model_proj_cap, cash_flow_bucket_unit)

# Poisson Interpolation
def interpolate_poisson(detail, bucket_frequency, pd_model_proj_cap, cash_flow_bucket_unit):
    periods = bucket_frequency * pd_model_proj_cap
    pd_percent = float(detail.n_pd_percent)
    cumulative_pd = 0
    epsilon = 1e-6  # Small value to adjust pd_percent

    pd_percent = min(max(pd_percent, epsilon), 1 - epsilon)
    records = []
    for bucket in range(1, periods + 1):
        try:
            marginal_pd = 1 - math.exp(math.log(1 - pd_percent) / bucket_frequency)
        except ValueError as e:
            save_log('interpolate_poisson', 'ERROR', f"Error calculating marginal_pd: {e}")
            return
        cumulative_pd = 1 - (1 - cumulative_pd) * (1 - marginal_pd)

        records.append(FSI_PD_Interpolated(
        v_pd_term_structure_id=detail.v_pd_term_structure_id.v_pd_term_structure_id,
        fic_mis_date=detail.v_pd_term_structure_id.fic_mis_date,
        v_int_rating_code=detail.v_credit_risk_basis_cd if detail.v_pd_term_structure_id.v_pd_term_structure_type == 'R' else None,
        v_delq_band_code=detail.v_credit_risk_basis_cd if detail.v_pd_term_structure_id.v_pd_term_structure_type == 'D' else None,
        v_pd_term_structure_type=detail.v_pd_term_structure_id.v_pd_term_structure_type,
        n_pd_percent=detail.n_pd_percent,
        n_per_period_default_prob=marginal_pd,
        n_cumulative_default_prob=cumulative_pd,
        v_cash_flow_bucket_id=bucket,
        v_cash_flow_bucket_unit=cash_flow_bucket_unit
    ))
    try:
        FSI_PD_Interpolated.objects.bulk_create(records)
        save_log('interpolation', 'INFO', f"Successfully saved records for credit risk band: {detail.v_credit_risk_basis_cd}")
    except Exception as e:
        save_log('interpolation', 'ERROR', f"Failed to save records for credit risk band {detail.v_credit_risk_basis_cd}: {e}")

def interpolate_geometric(detail, bucket_frequency, pd_model_proj_cap, cash_flow_bucket_unit):
    """
    Perform Geometric interpolation for a given term structure detail.
    """
    periods = bucket_frequency * pd_model_proj_cap
    pd_percent = float(detail.n_pd_percent)
    cumulative_pd = 0
    records = []
    for bucket in range(1, periods + 1):
        marginal_pd = (1 + pd_percent) ** (1 / bucket_frequency) - 1
        cumulative_pd = 1 - (1 - cumulative_pd) * (1 - marginal_pd)

        records.append(FSI_PD_Interpolated(
        v_pd_term_structure_id=detail.v_pd_term_structure_id.v_pd_term_structure_id,
        fic_mis_date=detail.v_pd_term_structure_id.fic_mis_date,
        v_int_rating_code=detail.v_credit_risk_basis_cd if detail.v_pd_term_structure_id.v_pd_term_structure_type == 'R' else None,
        v_delq_band_code=detail.v_credit_risk_basis_cd if detail.v_pd_term_structure_id.v_pd_term_structure_type == 'D' else None,
        v_pd_term_structure_type=detail.v_pd_term_structure_id.v_pd_term_structure_type,
        n_pd_percent=detail.n_pd_percent,
        n_per_period_default_prob=marginal_pd,
        n_cumulative_default_prob=cumulative_pd,
        v_cash_flow_bucket_id=bucket,
        v_cash_flow_bucket_unit=cash_flow_bucket_unit
    ))
    try:
        FSI_PD_Interpolated.objects.bulk_create(records)
        save_log('interpolation', 'INFO', f"Successfully saved records for credit risk band: {detail.v_credit_risk_basis_cd}")
    except Exception as e:
        save_log('interpolation', 'ERROR', f"Failed to save records for credit risk band {detail.v_credit_risk_basis_cd}: {e}")


def interpolate_arithmetic(detail, bucket_frequency, pd_model_proj_cap, cash_flow_bucket_unit):
    """
    Perform Arithmetic interpolation for a given term structure detail.
    """
    periods = bucket_frequency * pd_model_proj_cap
    pd_percent = detail.n_pd_percent
    pd_percent=float(pd_percent)
    cumulative_pd = 0
    marginal_pd = pd_percent / bucket_frequency
    records = []
    for bucket in range(1, periods + 1):
        cumulative_pd = 1 - (1 - cumulative_pd) * (1 - marginal_pd)

        records.append(FSI_PD_Interpolated(
        v_pd_term_structure_id=detail.v_pd_term_structure_id.v_pd_term_structure_id,
        fic_mis_date=detail.v_pd_term_structure_id.fic_mis_date,
        v_int_rating_code=detail.v_credit_risk_basis_cd if detail.v_pd_term_structure_id.v_pd_term_structure_type == 'R' else None,
        v_delq_band_code=detail.v_credit_risk_basis_cd if detail.v_pd_term_structure_id.v_pd_term_structure_type == 'D' else None,
        v_pd_term_structure_type=detail.v_pd_term_structure_id.v_pd_term_structure_type,
        n_pd_percent=detail.n_pd_percent,
        n_per_period_default_prob=marginal_pd,
        n_cumulative_default_prob=cumulative_pd,
        v_cash_flow_bucket_id=bucket,
        v_cash_flow_bucket_unit=cash_flow_bucket_unit
    ))
    try:
        FSI_PD_Interpolated.objects.bulk_create(records)
        save_log('interpolation', 'INFO', f"Successfully saved records for credit risk band: {detail.v_credit_risk_basis_cd}")
    except Exception as e:
        save_log('interpolation', 'ERROR', f"Failed to save records for credit risk band {detail.v_credit_risk_basis_cd}: {e}")


def interpolate_exponential_decay(detail, bucket_frequency, pd_model_proj_cap, cash_flow_bucket_unit):
    """
    Perform Exponential Decay interpolation for a given term structure detail.
    """
    periods = bucket_frequency * pd_model_proj_cap
    pd_percent = float(detail.n_pd_percent)

    if cash_flow_bucket_unit == 'Q':
        pd_percent = 1 - (1 - pd_percent) ** (1 / 4)
    elif cash_flow_bucket_unit == 'H':
        pd_percent = 1 - (1 - pd_percent) ** (1 / 2)
    elif cash_flow_bucket_unit == 'M':
        pd_percent = 1 - (1 - pd_percent) ** (1 / 12)

    cumulative_pd = 0
    population_remaining = 1
    records = []
    for bucket in range(1, periods + 1):
        marginal_pd = round(population_remaining * pd_percent, 4)
        population_remaining = round(population_remaining - marginal_pd, 4)
        cumulative_pd = round(cumulative_pd + marginal_pd, 4)

        records.append(FSI_PD_Interpolated(
        v_pd_term_structure_id=detail.v_pd_term_structure_id.v_pd_term_structure_id,
        fic_mis_date=detail.v_pd_term_structure_id.fic_mis_date,
        v_int_rating_code=detail.v_credit_risk_basis_cd if detail.v_pd_term_structure_id.v_pd_term_structure_type == 'R' else None,
        v_delq_band_code=detail.v_credit_risk_basis_cd if detail.v_pd_term_structure_id.v_pd_term_structure_type == 'D' else None,
        v_pd_term_structure_type=detail.v_pd_term_structure_id.v_pd_term_structure_type,
        n_pd_percent=detail.n_pd_percent,
        n_per_period_default_prob=marginal_pd,
        n_cumulative_default_prob=cumulative_pd,
        v_cash_flow_bucket_id=bucket,
        v_cash_flow_bucket_unit=cash_flow_bucket_unit
        ))
        try:
            FSI_PD_Interpolated.objects.bulk_create(records)
            save_log('interpolation', 'INFO', f"Successfully saved records for credit risk band: {detail.v_credit_risk_basis_cd}")
        except Exception as e:
            save_log('interpolation', 'ERROR', f"Failed to save records for credit risk band {detail.v_credit_risk_basis_cd}: {e}")
      

        # Stop the loop if the population reaches 0
        if population_remaining <= 0:
            break

# Account-level interpolation functions
def pd_interpolation_account_level(mis_date):
    """
    Perform PD interpolation at the account level based on the PD details and cashflow buckets.
    """
    try:
        accounts = Ldn_Financial_Instrument.objects.filter(fic_mis_date=mis_date)
        if not accounts.exists():
            save_log('pd_interpolation_account_level', 'ERROR', f"No accounts found for mis_date {mis_date}.")
            return '0'

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(process_account_interpolation, account, mis_date)
                for account in accounts
            ]

            for future in futures:
                future.result()

        save_log('pd_interpolation_account_level', 'INFO', "Account-level PD interpolation completed successfully.")
        return '1'

    except Exception as e:
        save_log('pd_interpolation_account_level', 'ERROR', f"Error during account-level interpolation: {e}")
        return '0'

def process_account_interpolation(account, mis_date):
    """
    Process PD interpolation for a given account-level PD detail.
    """
    account_number = account.v_account_number
    save_log('process_account_interpolation', 'INFO', f"Processing interpolation for account: {account_number}")

    try:
        pd_percent = Ldn_Financial_Instrument.objects.get(fic_mis_date=account.fic_mis_date, v_account_number=account_number).n_pd_percent
        pd_percent = float(pd_percent)
    except Ldn_Financial_Instrument.DoesNotExist:
        save_log('process_account_interpolation', 'ERROR', f"No PD found for account {account_number}")
        return

    max_bucket = FSI_Expected_Cashflow.objects.filter(v_account_number=account_number, fic_mis_date=mis_date).aggregate(max_bucket=models.Max('n_cash_flow_bucket'))['max_bucket']
    if max_bucket is None:
        save_log('process_account_interpolation', 'ERROR', f"No cashflow buckets found for account {account_number}")
        return

    bucket_length = account.v_interest_freq_unit
    if bucket_length == 'M':
        bucket_frequency = 12
        cash_flow_bucket_unit = 'M'
    elif bucket_length == 'H':
        bucket_frequency = 2
        cash_flow_bucket_unit = 'H'
    elif bucket_length == 'Q':
        bucket_frequency = 4
        cash_flow_bucket_unit = 'Q'
    else:
        bucket_frequency = 1
        cash_flow_bucket_unit = 'Y'

    FSI_PD_Account_Interpolated.objects.filter(fic_mis_date=account.fic_mis_date, v_account_number=account_number).delete()

    preferences = FSI_LLFP_APP_PREFERENCES.objects.first()
    pd_interpolation_method = preferences.pd_interpolation_method or 'NL-POISSON'

    if pd_interpolation_method == 'NL-POISSON':
        interpolate_poisson_account(account, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit)
    elif pd_interpolation_method == 'NL-GEOMETRIC':
        interpolate_geometric_account(account, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit)
    elif pd_interpolation_method == 'NL-ARITHMETIC':
        interpolate_arithmetic_account(account, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit)
    elif pd_interpolation_method == 'EXPONENTIAL_DECAY':
        interpolate_exponential_decay_account(account, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit)


def interpolate_poisson_account(account, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit):
    """
    Perform Poisson interpolation for a given account-level PD detail.
    """
    cumulative_pd = 0
    records = []
    for bucket in range(1, max_bucket + 1):
        marginal_pd = 1 - math.exp(math.log(1 - pd_percent) / bucket_frequency)
        cumulative_pd = 1 - (1 - cumulative_pd) * (1 - marginal_pd)

        records.append(FSI_PD_Interpolated(
            fic_mis_date=account.fic_mis_date,
            v_account_number=account.v_account_number,
            n_pd_percent=pd_percent,
            n_per_period_default_prob=marginal_pd,
            n_cumulative_default_prob=cumulative_pd,
            v_cash_flow_bucket_id=bucket,
            v_cash_flow_bucket_unit=cash_flow_bucket_unit
        ))
        FSI_PD_Interpolated.objects.bulk_create(records)


def interpolate_geometric_account(account, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit):
    """
    Perform Geometric interpolation for a given account-level PD detail.
    """
    cumulative_pd = 0
    records = []
    for bucket in range(1, max_bucket + 1):
        marginal_pd = (1 + pd_percent) ** (1 / bucket_frequency) - 1
        cumulative_pd = 1 - (1 - cumulative_pd) * (1 - marginal_pd)

        records.append(FSI_PD_Interpolated(
            fic_mis_date=account.fic_mis_date,
            v_account_number=account.v_account_number,
            n_pd_percent=pd_percent,
            n_per_period_default_prob=marginal_pd,
            n_cumulative_default_prob=cumulative_pd,
            v_cash_flow_bucket_id=bucket,
            v_cash_flow_bucket_unit=cash_flow_bucket_unit
        ))
        FSI_PD_Interpolated.objects.bulk_create(records)

def interpolate_arithmetic_account(account, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit):
    """
    Perform Arithmetic interpolation for a given account-level PD detail.
    """
    cumulative_pd = 0
    marginal_pd = pd_percent / bucket_frequency
    records = []
    for bucket in range(1, max_bucket + 1):
        cumulative_pd = 1 - (1 - cumulative_pd) * (1 - marginal_pd)

        records.append(FSI_PD_Interpolated(
            fic_mis_date=account.fic_mis_date,
            v_account_number=account.v_account_number,
            n_pd_percent=pd_percent,
            n_per_period_default_prob=marginal_pd,
            n_cumulative_default_prob=cumulative_pd,
            v_cash_flow_bucket_id=bucket,
            v_cash_flow_bucket_unit=cash_flow_bucket_unit
        ))
        FSI_PD_Interpolated.objects.bulk_create(records)

def interpolate_exponential_decay_account(account, bucket_frequency, max_bucket, pd_percent, cash_flow_bucket_unit):
    """
    Perform Exponential Decay interpolation for a given account-level PD detail.
    """
    if cash_flow_bucket_unit == 'Q':
        pd_percent = 1 - (1 - pd_percent) ** (1 / 4)
    elif cash_flow_bucket_unit == 'H':
        pd_percent = 1 - (1 - pd_percent) ** (1 / 2)
    elif cash_flow_bucket_unit == 'M':
        pd_percent = 1 - (1 - pd_percent) ** (1 / 12)

    cumulative_pd = 0
    population_remaining = 1
    records = []
    for bucket in range(1, max_bucket + 1):
        marginal_pd = round(population_remaining * pd_percent, 4)
        population_remaining = round(population_remaining - marginal_pd, 4)
        cumulative_pd = round(cumulative_pd + marginal_pd, 4)

        records.append(FSI_PD_Interpolated(
            fic_mis_date=account.fic_mis_date,
            v_account_number=account.v_account_number,
            n_pd_percent=pd_percent,
            n_per_period_default_prob=marginal_pd,
            n_cumulative_default_prob=cumulative_pd,
            v_cash_flow_bucket_id=bucket,
            v_cash_flow_bucket_unit=cash_flow_bucket_unit
        ))
        FSI_PD_Interpolated.objects.bulk_create(records)

        if population_remaining <= 0:
            break
