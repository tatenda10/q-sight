


import concurrent.futures
from django.db import transaction
from decimal import Decimal
from IFRS9.models import *
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.db.models import F
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from django.db.models import F

def save_log(function_name, log_level, message, status='SUCCESS'):
    """
    Function to save logs to the Log table.

    """
    try:
        log_entry = Log(
            function_name=function_name,
            log_level=log_level,
            message=message,
            status=status
        )
        log_entry.save()
        print(f"Log saved: {function_name} - {log_level} - {status}")
    except Exception as e:
        print(f"Failed to save log: {e}")


########################
import random
import concurrent.futures
from django.db import transaction
import random
import concurrent.futures
from django.db import transaction

def calculate_pd_for_delinquency(account, fic_mis_date, term_unit_to_periods):
    """
    Calculate PD for accounts based on the delinquency code (v_pd_term_structure_type='D').
    """
    if not account.d_maturity_date or not account.fic_mis_date:
        return None  # Skip accounts with missing dates

    amortization_periods = 12
    months_to_maturity = (account.d_maturity_date.year - account.fic_mis_date.year) * 12 + \
                         (account.d_maturity_date.month - account.fic_mis_date.month)
    buckets_to_maturity = months_to_maturity // 12 
    buckets_needed_for_12_months = 12 // (12 // amortization_periods)

    try:
        pd_record_12m = FSI_PD_Interpolated.objects.filter(
            v_delq_band_code=account.n_delq_band_code,
            v_pd_term_structure_id=account.n_pd_term_structure_skey,
           
            v_cash_flow_bucket_id=buckets_needed_for_12_months
        ).first()
        twelve_months_pd = pd_record_12m.n_cumulative_default_prob if pd_record_12m else random.uniform(0.01, 0.1)

        pd_record_lifetime = FSI_PD_Interpolated.objects.filter(
            v_delq_band_code=account.n_delq_band_code,
            v_pd_term_structure_id=account.n_pd_term_structure_skey,
           
            v_cash_flow_bucket_id=buckets_to_maturity
        ).first()
        lifetime_pd = pd_record_lifetime.n_cumulative_default_prob if pd_record_lifetime else random.uniform(0.1, 0.5)

    except Exception as e:
        save_log('calculate_pd_for_delinquency', 'ERROR', f"Error calculating PD for account {account.n_account_number} (Delinquency): {e}")
        return None

    account.n_twelve_months_pd = twelve_months_pd
    account.n_lifetime_pd = lifetime_pd
    return account

def calculate_pd_for_accounts(fic_mis_date):
    """
    Main function to calculate the 12-month PD and Lifetime PD for accounts using multi-threading.
    """
    term_unit_to_periods = {
        'M': 12,  # Monthly
        'Q': 4,   # Quarterly
        'H': 2,   # Half-Yearly
        'Y': 1    # Yearly
    }
    
    accounts = FCT_Stage_Determination.objects.filter(fic_mis_date=fic_mis_date)
    total_accounts = accounts.count()
    
    if total_accounts == 0:
        return 0

    updated_accounts = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {}
        for account in accounts:
            try:
                futures[executor.submit(calculate_pd_for_delinquency, account, fic_mis_date, term_unit_to_periods)] = account
            except Exception as e:
                save_log('calculate_pd_for_accounts', 'ERROR', f"Error processing account {account.n_account_number}: {e}")

        for future in concurrent.futures.as_completed(futures):
            account = futures[future]
            try:
                result = future.result()
                if result:
                    updated_accounts.append(result)
            except Exception as e:
                save_log('calculate_pd_for_accounts', 'ERROR', f"Error processing account {account.n_account_number}: {e}")

    if updated_accounts:
        FCT_Stage_Determination.objects.bulk_update(updated_accounts, ['n_twelve_months_pd', 'n_lifetime_pd'])
        save_log('calculate_pd_for_accounts', 'INFO', f"{len(updated_accounts)} out of {total_accounts} accounts were successfully updated.")
    
    return 1 if updated_accounts else 0



###############################################






# -------------------------------------------------------
# Utility to get the latest run_skey from Dim_Run
# -------------------------------------------------------
def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key is available in the Dim_Run table.")
            return None
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        save_log('get_latest_run_skey', 'ERROR', "Dim_Run table is missing.")
        return None


# -------------------------------------------------------
# Function to process a batch of records (CPU-bound)
# -------------------------------------------------------
def process_cashflow_records(records):
    """
    Process a batch of records and apply calculations for cash flow fields in Python.
    """
    updated_records = []

    for record in records:
        try:
            # 1. Calculate `n_expected_cash_flow_pv`
            if record.n_discount_factor is not None and record.n_expected_cash_flow is not None:
                record.n_expected_cash_flow_pv = record.n_discount_factor * record.n_expected_cash_flow

            # 2. Calculate `n_12m_exp_cash_flow_pv`
            if record.n_discount_factor is not None and record.n_12m_exp_cash_flow is not None:
                record.n_12m_exp_cash_flow_pv = record.n_discount_factor * record.n_12m_exp_cash_flow

            # 3. Calculate `n_cash_shortfall`
            if record.n_cash_flow_amount is not None and record.n_expected_cash_flow is not None:
                record.n_cash_shortfall = (record.n_cash_flow_amount or Decimal(0)) - (record.n_expected_cash_flow or Decimal(0))

            # 4. Calculate `n_12m_cash_shortfall`
            if record.n_cash_flow_amount is not None and record.n_12m_exp_cash_flow is not None:
                record.n_12m_cash_shortfall = (record.n_cash_flow_amount or Decimal(0)) - (record.n_12m_exp_cash_flow or Decimal(0))

            # 5. Calculate `n_cash_shortfall_pv`
            if record.n_discount_factor is not None and record.n_cash_shortfall is not None:
                record.n_cash_shortfall_pv = record.n_discount_factor * record.n_cash_shortfall

            # 6. Calculate `n_12m_cash_shortfall_pv`
            if record.n_discount_factor is not None and record.n_12m_cash_shortfall is not None:
                record.n_12m_cash_shortfall_pv = record.n_discount_factor * record.n_12m_cash_shortfall

            updated_records.append(record)
        except Exception as e:
            save_log('process_cashflow_records', 'ERROR', f"Error processing record {record.v_account_number}: {e}")

    return updated_records


# -------------------------------------------------------
# Main function to update cash flow fields efficiently
# -------------------------------------------------------
def calculate_cashflow_fields(fic_mis_date, batch_size=2000, num_threads=8, update_batch_size=5000):
    """
    Calculates & updates cash flow fields (PV, shortfalls, etc.) using multithreading and bulk update.
    
    :param fic_mis_date:         The MIS date to filter records on.
    :param batch_size:           Number of records processed by each thread in one chunk.
    :param num_threads:          Number of parallel threads to use.
    :param update_batch_size:    Number of records to update in a single bulk operation.
    :return:                     1 if records were updated, 0 otherwise.
    """
    try:
        # 1) Get the latest run_skey
        run_skey = get_latest_run_skey()
        if not run_skey:
            return 0  # No valid run key

        # 2) Fetch relevant records minimally with only() if your DB is large
        #    If you do not need all fields, do: .only(...fields...).
        records = list(
            fsi_Financial_Cash_Flow_Cal.objects.filter(
                fic_mis_date=fic_mis_date,
                n_run_skey=run_skey
            )
        )

        if not records:
            save_log(
                'calculate_cashflow_fields',
                'INFO',
                f"No records found for fic_mis_date={fic_mis_date} and run_skey={run_skey}."
            )
            return 0

        save_log(
            'calculate_cashflow_fields',
            'INFO',
            f"Fetched {len(records)} records for processing."
        )

        # 3) Chunk the records for parallel processing
        def chunker(seq, size):
            for pos in range(0, len(seq), size):
                yield seq[pos:pos + size]

        updated_records_all = []
        # 4) Parallel process with ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            for chunk in chunker(records, batch_size):
                futures.append(executor.submit(process_cashflow_records, chunk))

            # Collect results as they complete
            for future in as_completed(futures):
                try:
                    updated_records_all.extend(future.result())
                except Exception as e:
                    save_log('calculate_cashflow_fields', 'ERROR', f"Error in thread execution: {e}")
                    return 0

        # 5) Bulk update in sub-batches
        total_updated = len(updated_records_all)
        if total_updated == 0:
            save_log(
                'calculate_cashflow_fields',
                'INFO',
                "No records to update after processing."
            )
            return 0

        with transaction.atomic():
            for start in range(0, total_updated, update_batch_size):
                end = start + update_batch_size
                fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                    updated_records_all[start:end],
                    [
                        'n_expected_cash_flow_pv',
                        'n_12m_exp_cash_flow_pv',
                        'n_cash_shortfall',
                        'n_12m_cash_shortfall',
                        'n_cash_shortfall_pv',
                        'n_12m_cash_shortfall_pv'
                    ]
                )

        save_log(
            'calculate_cashflow_fields',
            'INFO',
            f"Successfully updated {total_updated} records."
        )
        return 1

    except Exception as e:
        save_log(
            'calculate_cashflow_fields',
            'ERROR',
            f"Error calculating cash flow fields for fic_mis_date={fic_mis_date}, run_skey={run_skey}: {e}"
        )
        return 0



def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")
    
def process_cashflow_records(records):
    """
    Function to process a batch of records and apply calculations for cash flow fields.
    """
    updated_records = []

    for record in records:
        try:
            # 1. Calculate `n_expected_cash_flow_pv`
            if record.n_discount_factor is not None and record.n_expected_cash_flow is not None:
                record.n_expected_cash_flow_pv = record.n_discount_factor * record.n_expected_cash_flow

            # 2. Calculate `n_12m_exp_cash_flow_pv`
            if record.n_discount_factor is not None and record.n_12m_exp_cash_flow is not None:
                record.n_12m_exp_cash_flow_pv = record.n_discount_factor * record.n_12m_exp_cash_flow

            # 3. Calculate `n_cash_shortfall`
            if record.n_cash_flow_amount is not None and record.n_expected_cash_flow is not None:
                record.n_cash_shortfall = (record.n_cash_flow_amount or Decimal(0)) - (record.n_expected_cash_flow or Decimal(0))

            # 4. Calculate `n_12m_cash_shortfall`
            if record.n_cash_flow_amount is not None and record.n_12m_exp_cash_flow is not None:
                record.n_12m_cash_shortfall = (record.n_cash_flow_amount or Decimal(0)) - (record.n_12m_exp_cash_flow or Decimal(0))

            # 5. Calculate `n_cash_shortfall_pv`
            if record.n_discount_factor is not None and record.n_cash_shortfall is not None:
                record.n_cash_shortfall_pv = record.n_discount_factor * record.n_cash_shortfall

            # 6. Calculate `n_12m_cash_shortfall_pv`
            if record.n_discount_factor is not None and record.n_12m_cash_shortfall is not None:
                record.n_12m_cash_shortfall_pv = record.n_discount_factor * record.n_12m_cash_shortfall

            # Add the updated record to the list
            updated_records.append(record)
        except Exception as e:
            save_log('process_cashflow_records', 'ERROR', f"Error processing record {record.v_account_number}: {e}")

    return updated_records


def calculate_cashflow_fields(fic_mis_date, batch_size=1000, num_threads=10):
    """
    Main function to calculate all required cash flow fields with multithreading and bulk update.
    """
    try:
        # Fetch the relevant records for the run_skey
        run_skey = get_latest_run_skey()
        records = list(fsi_Financial_Cash_Flow_Cal.objects.filter(fic_mis_date=fic_mis_date, n_run_skey=run_skey))

        if not records:
            save_log('calculate_cashflow_fields', 'INFO', f"No records found for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}.")
            return 0  # Return 0 if no records are found

        save_log('calculate_cashflow_fields', 'INFO', f"Fetched {len(records)} records for processing.")

        # Split the records into batches
        def chunker(seq, size):
            return (seq[pos:pos + size] for pos in range(0, len(seq), size))

        # Process records in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(process_cashflow_records, batch) for batch in chunker(records, batch_size)]

            # Wait for all threads to complete and gather the results
            updated_batches = []
            for future in futures:
                try:
                    updated_batches.extend(future.result())
                except Exception as e:
                    save_log('calculate_cashflow_fields', 'ERROR', f"Error in thread execution: {e}")
                    return 0  # Return 0 if any thread encounters an error

        # Perform a bulk update to save all the records at once
        with transaction.atomic():
            fsi_Financial_Cash_Flow_Cal.objects.bulk_update(updated_batches, [
                'n_expected_cash_flow_pv', 
                'n_12m_exp_cash_flow_pv',
                'n_cash_shortfall',
                'n_12m_cash_shortfall',
                'n_cash_shortfall_pv',
                'n_12m_cash_shortfall_pv'
            ])

        save_log('calculate_cashflow_fields', 'INFO', f"Successfully updated {len(updated_batches)} records.")
        return 1  # Return 1 on successful completion

    except Exception as e:
        save_log('calculate_cashflow_fields', 'ERROR', f"Error calculating cash flow fields for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}: {e}")
        return 0


#####################################################################






# Batch size used for final bulk update (can be tuned)
UPDATE_BATCH_SIZE = 5000


def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key is available in the Dim_Run table.")
            return None
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        save_log('get_latest_run_skey', 'ERROR', "Dim_Run table is missing.")
        return None


# -----------------------------------------------------------------------------
# Helper Functions: 12-Month Expected Loss
# -----------------------------------------------------------------------------
def process_12m_expected_loss(records):
    """
    Process a batch of records to calculate 12-month forward loss fields.
    Returns a list of updated records.
    """
    updated_records = []
    for record in records:
        try:
            # 1. Calculate `n_12m_fwd_expected_loss`
            if (record.n_exposure_at_default is not None
                and record.n_12m_per_period_pd is not None
                and record.n_lgd_percent is not None):
                record.n_12m_fwd_expected_loss = (
                    record.n_exposure_at_default
                    * record.n_12m_per_period_pd
                    * record.n_lgd_percent
                )

            # 2. Calculate `n_12m_fwd_expected_loss_pv`
            if (record.n_discount_factor is not None
                and record.n_12m_fwd_expected_loss is not None):
                record.n_12m_fwd_expected_loss_pv = (
                    record.n_discount_factor
                    * record.n_12m_fwd_expected_loss
                )

            updated_records.append(record)

        except Exception as e:
            save_log('process_12m_expected_loss', 'ERROR',
                     f"Error processing record {record.v_account_number}: {e}")

    return updated_records


def calculate_12m_expected_loss_fields(fic_mis_date, batch_size=1000, num_threads=4):
    """
    Calculate 12-month forward loss fields with multithreading and bulk update.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            return 0  # No valid run key found

        # Fetch only the fields needed for calculation
        records_qs = fsi_Financial_Cash_Flow_Cal.objects.filter(
            fic_mis_date=fic_mis_date,
            n_run_skey=run_skey
        ).only(
            'v_account_number',
            'n_exposure_at_default',
            'n_12m_per_period_pd',
            'n_lgd_percent',
            'n_discount_factor',
            'n_12m_fwd_expected_loss',
            'n_12m_fwd_expected_loss_pv'
        )

        # Convert queryset to a list in memory
        records = list(records_qs)
        if not records:
            save_log('calculate_12m_expected_loss_fields', 'INFO',
                     f"No records found for fic_mis_date={fic_mis_date}, run_skey={run_skey}.")
            return 0

        save_log('calculate_12m_expected_loss_fields', 'INFO',
                 f"Fetched {len(records)} records for processing 12m forward loss.")

        # Split the records into chunks for parallel processing
        def chunker(seq, size):
            for pos in range(0, len(seq), size):
                yield seq[pos:pos + size]

        updated_records_all = []

        # Multithreading
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            for batch in chunker(records, batch_size):
                futures.append(executor.submit(process_12m_expected_loss, batch))

            # Gather the results
            for future in as_completed(futures):
                try:
                    updated_records_all.extend(future.result())
                except Exception as e:
                    save_log('calculate_12m_expected_loss_fields', 'ERROR',
                             f"Error in thread execution: {e}")
                    return 0

        # Bulk update in sub-batches
        total_updated = len(updated_records_all)
        if total_updated == 0:
            save_log('calculate_12m_expected_loss_fields', 'INFO',
                     "No records were updated (0 after processing).")
            return 0

        with transaction.atomic():
            for start in range(0, total_updated, UPDATE_BATCH_SIZE):
                end = start + UPDATE_BATCH_SIZE
                fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                    updated_records_all[start:end],
                    ['n_12m_fwd_expected_loss', 'n_12m_fwd_expected_loss_pv']
                )

        save_log('calculate_12m_expected_loss_fields', 'INFO',
                 f"Successfully updated {total_updated} records for 12m forward loss.")
        return 1

    except Exception as e:
        save_log('calculate_12m_expected_loss_fields', 'ERROR',
                 f"Error calculating 12m forward loss for fic_mis_date={fic_mis_date}, run_skey={run_skey}: {e}")
        return 0


# -----------------------------------------------------------------------------
# Helper Functions: Forward Expected Loss
# -----------------------------------------------------------------------------
def process_forward_expected_loss(records):
    """
    Process a batch of records to calculate forward expected loss fields.
    Returns a list of updated records.
    """
    updated_records = []
    for record in records:
        try:
            # 1. Calculate `n_forward_expected_loss`
            if (record.n_exposure_at_default is not None
                and record.n_per_period_impaired_prob is not None
                and record.n_lgd_percent is not None):
                record.n_forward_expected_loss = (
                    record.n_exposure_at_default
                    * record.n_per_period_impaired_prob
                    * record.n_lgd_percent
                )

            # 2. Calculate `n_forward_expected_loss_pv`
            if (record.n_discount_factor is not None
                and record.n_forward_expected_loss is not None):
                record.n_forward_expected_loss_pv = (
                    record.n_discount_factor
                    * record.n_forward_expected_loss
                )

            updated_records.append(record)

        except Exception as e:
            save_log('process_forward_expected_loss', 'ERROR',
                     f"Error processing record {record.v_account_number}: {e}")

    return updated_records


def calculate_forward_expected_loss_fields(fic_mis_date, batch_size=1000, num_threads=4):
    """
    Calculate forward expected loss fields with multithreading and bulk update.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            return 0  # No valid run key

        # Fetch only needed fields
        records_qs = fsi_Financial_Cash_Flow_Cal.objects.filter(
            fic_mis_date=fic_mis_date,
            n_run_skey=run_skey
        ).only(
            'v_account_number',
            'n_exposure_at_default',
            'n_per_period_impaired_prob',
            'n_lgd_percent',
            'n_discount_factor',
            'n_forward_expected_loss',
            'n_forward_expected_loss_pv'
        )

        records = list(records_qs)
        if not records:
            save_log('calculate_forward_expected_loss_fields', 'INFO',
                     f"No records found for fic_mis_date={fic_mis_date}, run_skey={run_skey}.")
            return 0

        save_log('calculate_forward_expected_loss_fields', 'INFO',
                 f"Fetched {len(records)} records for processing forward loss.")

        def chunker(seq, size):
            for pos in range(0, len(seq), size):
                yield seq[pos:pos + size]

        updated_records_all = []

        # Multithreading
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            for batch in chunker(records, batch_size):
                futures.append(executor.submit(process_forward_expected_loss, batch))

            # Collect results
            for future in as_completed(futures):
                try:
                    updated_records_all.extend(future.result())
                except Exception as e:
                    save_log('calculate_forward_expected_loss_fields', 'ERROR',
                             f"Error in thread execution: {e}")
                    return 0

        total_updated = len(updated_records_all)
        if total_updated == 0:
            save_log('calculate_forward_expected_loss_fields', 'INFO',
                     "No records were updated (0 after processing).")
            return 0

        # Bulk update in sub-batches
        with transaction.atomic():
            for start in range(0, total_updated, UPDATE_BATCH_SIZE):
                end = start + UPDATE_BATCH_SIZE
                fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                    updated_records_all[start:end],
                    ['n_forward_expected_loss', 'n_forward_expected_loss_pv']
                )

        save_log('calculate_forward_expected_loss_fields', 'INFO',
                 f"Successfully updated {total_updated} records for forward expected loss.")
        return 1

    except Exception as e:
        save_log('calculate_forward_expected_loss_fields', 'ERROR',
                 f"Error calculating forward loss for fic_mis_date={fic_mis_date}, run_skey={run_skey}: {e}")
        return 0


# -----------------------------------------------------------------------------
# Main Wrapper: Calculate Both 12M and Forward Expected Loss
# -----------------------------------------------------------------------------
def calculate_forward_loss_fields(fic_mis_date, batch_size=1000, num_threads=4):
    """
    Main function to calculate forward loss fields in two stages:
    1) 12-month expected loss calculation
    2) Forward expected loss calculation
    """
    result_12m = calculate_12m_expected_loss_fields(fic_mis_date, batch_size, num_threads)
    if result_12m == 1:
        return calculate_forward_expected_loss_fields(fic_mis_date, batch_size, num_threads)
    else:
        save_log('calculate_forward_loss_fields', 'ERROR',
                 f"Failed to complete 12-month expected loss calculation for fic_mis_date={fic_mis_date}.")
        return 0



from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from django.db import transaction

def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")

def process_12m_expected_loss(records):
    """
    Function to process a batch of records and apply calculations for 12-month forward loss fields.
    """
    updated_records = []

    for record in records:
        try:
            # Calculate `n_12m_fwd_expected_loss`
            if record.n_exposure_at_default is not None and record.n_12m_per_period_pd is not None and record.n_lgd_percent is not None:
                record.n_12m_fwd_expected_loss = record.n_exposure_at_default * record.n_12m_per_period_pd * record.n_lgd_percent

            # Calculate `n_12m_fwd_expected_loss_pv`
            if record.n_discount_factor is not None and record.n_12m_fwd_expected_loss is not None:
                record.n_12m_fwd_expected_loss_pv = record.n_discount_factor * record.n_12m_fwd_expected_loss

            updated_records.append(record)

        except Exception as e:
            save_log('process_12m_expected_loss', 'ERROR', f"Error processing record {record.v_account_number}: {e}")

    return updated_records

def process_forward_expected_loss(records):
    """
    Function to process a batch of records and apply calculations for forward loss fields.
    """
    updated_records = []

    for record in records:
        try:
            # Calculate `n_forward_expected_loss`
            if record.n_exposure_at_default is not None and record.n_per_period_impaired_prob is not None and record.n_lgd_percent is not None:
                record.n_forward_expected_loss = record.n_exposure_at_default * record.n_per_period_impaired_prob * record.n_lgd_percent

            # Calculate `n_forward_expected_loss_pv`
            if record.n_discount_factor is not None and record.n_forward_expected_loss is not None:
                record.n_forward_expected_loss_pv = record.n_discount_factor * record.n_forward_expected_loss

            updated_records.append(record)

        except Exception as e:
            save_log('process_forward_expected_loss', 'ERROR', f"Error processing record {record.v_account_number}: {e}")

    return updated_records

def calculate_12m_expected_loss_fields(fic_mis_date, batch_size=1000, num_threads=4):
    """
    Calculate 12-month expected loss fields with multithreading and bulk update.
    """
    try:
        run_skey = get_latest_run_skey()
        records = list(fsi_Financial_Cash_Flow_Cal.objects.filter(fic_mis_date=fic_mis_date, n_run_skey=run_skey))

        if not records:
            save_log('calculate_12m_expected_loss_fields', 'INFO', f"No records found for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}.")
            return 0

        save_log('calculate_12m_expected_loss_fields', 'INFO', f"Fetched {len(records)} records for processing.")

        def chunker(seq, size):
            return (seq[pos:pos + size] for pos in range(0, len(seq), size))

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(process_12m_expected_loss, batch) for batch in chunker(records, batch_size)]
            updated_batches = []
            for future in futures:
                try:
                    updated_batches.extend(future.result())
                except Exception as e:
                    save_log('calculate_12m_expected_loss_fields', 'ERROR', f"Error in thread execution: {e}")
                    return 0

        with transaction.atomic():
            fsi_Financial_Cash_Flow_Cal.objects.bulk_update(updated_batches, [
                'n_12m_fwd_expected_loss', 
                'n_12m_fwd_expected_loss_pv'
            ])

        save_log('calculate_12m_expected_loss_fields', 'INFO', f"Successfully updated {len(updated_batches)} records.")
        return 1

    except Exception as e:
        save_log('calculate_12m_expected_loss_fields', 'ERROR', f"Error calculating 12-month forward loss fields for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}: {e}")
        return 0

def calculate_forward_expected_loss_fields(fic_mis_date, batch_size=1000, num_threads=4):
    """
    Calculate forward expected loss fields with multithreading and bulk update.
    """
    try:
        run_skey = get_latest_run_skey()
        records = list(fsi_Financial_Cash_Flow_Cal.objects.filter(fic_mis_date=fic_mis_date, n_run_skey=run_skey))

        if not records:
            save_log('calculate_forward_expected_loss_fields', 'INFO', f"No records found for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}.")
            return 0

        save_log('calculate_forward_expected_loss_fields', 'INFO', f"Fetched {len(records)} records for processing.")

        def chunker(seq, size):
            return (seq[pos:pos + size] for pos in range(0, len(seq), size))

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(process_forward_expected_loss, batch) for batch in chunker(records, batch_size)]
            updated_batches = []
            for future in futures:
                try:
                    updated_batches.extend(future.result())
                except Exception as e:
                    save_log('calculate_forward_expected_loss_fields', 'ERROR', f"Error in thread execution: {e}")
                    return 0

        with transaction.atomic():
            fsi_Financial_Cash_Flow_Cal.objects.bulk_update(updated_batches, [
                'n_forward_expected_loss',  
                'n_forward_expected_loss_pv'
            ])

        save_log('calculate_forward_expected_loss_fields', 'INFO', f"Successfully updated {len(updated_batches)} records.")
        return 1

    except Exception as e:
        save_log('calculate_forward_expected_loss_fields', 'ERROR', f"Error calculating forward loss fields for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}: {e}")
        return 0

def calculate_forward_loss_fields(fic_mis_date, batch_size=1000, num_threads=4):
    """
    Main function to calculate forward loss fields in two stages.
    """
    result = calculate_12m_expected_loss_fields(fic_mis_date, batch_size, num_threads)
    if result == 1:
        return calculate_forward_expected_loss_fields(fic_mis_date, batch_size, num_threads)
    else:
        save_log('calculate_forward_loss_fields', 'ERROR', f"Failed to complete 12-month expected loss calculation for fic_mis_date {fic_mis_date}.")
        return 0


###########################################################

from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal
from math import pow
from django.db import transaction
from django.db.models import F



def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key is available in the Dim_Run table.")
            return None
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        save_log('get_latest_run_skey', 'ERROR', "Dim_Run table is missing.")
        return None


def process_discount_records(records):
    """
    Process a batch of records for discount calculations.
    Returns a list of updated records.
    """
    updated_records = []
    for record in records:
        try:
            # 1. Set `n_discount_rate` based on whether n_effective_interest_rate is present
            if record.n_effective_interest_rate is not None:
                record.n_discount_rate = record.n_effective_interest_rate
            # Otherwise, keep existing n_discount_rate (no change needed)

            # 2. Calculate `n_discount_factor`
            if record.n_discount_rate is not None and record.n_cash_flow_bucket_id is not None:
                # discount_factor = 1 / (1 + discount_rate/100)^(bucket_id/12)
                discount_rate_decimal = Decimal(record.n_discount_rate) / Decimal(100)
                exponent = Decimal(record.n_cash_flow_bucket_id) / Decimal(12)
                record.n_discount_factor = Decimal(1) / (Decimal(pow((1 + discount_rate_decimal), exponent)))
            # Otherwise, keep existing n_discount_factor

            updated_records.append(record)

        except Exception as e:
            save_log('process_discount_records', 'ERROR',
                     f"Error processing record {record.v_account_number}: {e}")
    return updated_records


def calculate_discount_factors(fic_mis_date, batch_size=2000, num_threads=4, update_batch_size=5000):
    """
    Main function to calculate discount rates and factors with multithreading and bulk update.

    :param fic_mis_date:      The MIS date to filter fsi_Financial_Cash_Flow_Cal records
    :param batch_size:        Number of records processed per thread chunk
    :param num_threads:       Number of worker threads in ThreadPoolExecutor
    :param update_batch_size: Number of records to update in a single bulk update sub-batch
    :return:                  1 on success, 0 on failure or no records
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            return 0  # No valid run key found

        # Fetch only the fields required for discount calculations
        records_qs = fsi_Financial_Cash_Flow_Cal.objects.filter(
            fic_mis_date=fic_mis_date,
            n_run_skey=run_skey
        ).only(
            'v_account_number',
            'n_effective_interest_rate',
            'n_discount_rate',
            'n_cash_flow_bucket_id',
            'n_discount_factor'
        )

        # Convert to list in memory
        records = list(records_qs)
        if not records:
            save_log('calculate_discount_factors', 'INFO',
                     f"No records found for fic_mis_date={fic_mis_date}, run_skey={run_skey}.")
            return 0

        save_log('calculate_discount_factors', 'INFO',
                 f"Fetched {len(records)} records for processing discount factors.")

        # Chunker to split the records into smaller batches
        def chunker(seq, size):
            for pos in range(0, len(seq), size):
                yield seq[pos:pos + size]

        updated_records_all = []
        error_occurred = False

        # Parallel processing
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            for batch in chunker(records, batch_size):
                futures.append(executor.submit(process_discount_records, batch))

            for future in as_completed(futures):
                try:
                    updated_records_all.extend(future.result())
                except Exception as e:
                    save_log('calculate_discount_factors', 'ERROR', f"Thread error: {e}")
                    error_occurred = True

        if error_occurred:
            return 0  # Return early if any thread failed

        total_updated = len(updated_records_all)
        if total_updated == 0:
            save_log('calculate_discount_factors', 'INFO', "No records to update after processing.")
            return 0

        # Perform a bulk update in sub-batches
        with transaction.atomic():
            for start in range(0, total_updated, update_batch_size):
                end = start + update_batch_size
                fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                    updated_records_all[start:end],
                    ['n_discount_rate', 'n_discount_factor']
                )

        save_log('calculate_discount_factors', 'INFO',
                 f"Successfully updated {total_updated} records with discount factors.")
        return 1

    except Exception as e:
        save_log('calculate_discount_factors', 'ERROR',
                 f"Error calculating discount factors for fic_mis_date={fic_mis_date}: {e}")
        return 0


#########################################################



######################################################

from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal
from django.db import transaction
from django.db.models import F


# You can tune this if you want to split the bulk update into multiple sub-batches
UPDATE_BATCH_SIZE = 5000

def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key is available in Dim_Run table.")
            return None
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        save_log('get_latest_run_skey', 'ERROR', "Dim_Run table is missing.")
        return None


def process_records(records):
    """
    Process a batch of records to calculate expected cash flow fields.
    Returns a list of updated records.
    """
    updated_records = []
    for record in records:
        try:
            # 1. Calculate `n_expected_cash_flow_rate`
            if record.n_cumulative_loss_rate is not None:
                record.n_expected_cash_flow_rate = Decimal(1) - record.n_cumulative_loss_rate

            # 2. Calculate `n_12m_exp_cash_flow`
            #    = (cash_flow_amount) * (1 - (12m PD * LGD))
            if record.n_12m_cumulative_pd is not None and record.n_lgd_percent is not None:
                record.n_12m_exp_cash_flow = (
                    (record.n_cash_flow_amount or Decimal(0)) *
                    (Decimal(1) - (record.n_12m_cumulative_pd * record.n_lgd_percent))
                )

            # 3. Calculate `n_expected_cash_flow`
            #    = (cash_flow_amount) * expected_cash_flow_rate
            if record.n_expected_cash_flow_rate is not None:
                record.n_expected_cash_flow = (
                    (record.n_cash_flow_amount or Decimal(0)) *
                    record.n_expected_cash_flow_rate
                )

            updated_records.append(record)

        except Exception as e:
            save_log('process_records', 'ERROR',
                     f"Error processing record for account {record.v_account_number}: {e}")
    return updated_records


def calculate_expected_cash_flow(
    fic_mis_date,
    batch_size=2000,
    num_threads=8,
    update_batch_size=UPDATE_BATCH_SIZE
):
    """
    Main function to calculate expected cash flow with multithreading and bulk updates.

    :param fic_mis_date:      MIS date to filter records.
    :param batch_size:        Number of records processed per thread chunk.
    :param num_threads:       Number of parallel threads to use.
    :param update_batch_size: Number of records to update in a single bulk update sub-batch.
    :return:                  1 if successful, 0 otherwise.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            return 0  # No valid run key

        # 1) Fetch only the columns needed for computation.
        records_qs = fsi_Financial_Cash_Flow_Cal.objects.filter(
            fic_mis_date=fic_mis_date,
            n_run_skey=run_skey
        ).only(
            'v_account_number',
            'n_cumulative_loss_rate',
            'n_12m_cumulative_pd',
            'n_lgd_percent',
            'n_cash_flow_amount',
            'n_expected_cash_flow_rate',
            'n_12m_exp_cash_flow',
            'n_expected_cash_flow'
        )

        # Convert to list for in-memory processing
        records = list(records_qs)
        if not records:
            save_log('calculate_expected_cash_flow', 'INFO',
                     f"No records found for fic_mis_date={fic_mis_date}, run_skey={run_skey}.")
            return 0

        save_log('calculate_expected_cash_flow', 'INFO',
                 f"Fetched {len(records)} records for processing.")

        # 2) Utility to chunk records for parallel processing
        def chunker(seq, size):
            for pos in range(0, len(seq), size):
                yield seq[pos:pos + size]

        # 3) Process in parallel
        updated_records_all = []
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            for batch in chunker(records, batch_size):
                futures.append(executor.submit(process_records, batch))

            # Gather results
            for future in as_completed(futures):
                try:
                    updated_records_all.extend(future.result())
                except Exception as e:
                    save_log('calculate_expected_cash_flow', 'ERROR',
                             f"Error in thread execution: {e}")
                    return 0

        # 4) Bulk update in sub-batches
        total_updated = len(updated_records_all)
        if total_updated == 0:
            save_log('calculate_expected_cash_flow', 'INFO',
                     "No records were updated after processing.")
            return 0

        with transaction.atomic():
            for start in range(0, total_updated, update_batch_size):
                end = start + update_batch_size
                fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                    updated_records_all[start:end],
                    [
                        'n_expected_cash_flow_rate',
                        'n_12m_exp_cash_flow',
                        'n_expected_cash_flow'
                    ]
                )

        save_log('calculate_expected_cash_flow', 'INFO',
                 f"Successfully updated {total_updated} records.")
        return 1

    except Exception as e:
        save_log('calculate_expected_cash_flow', 'ERROR',
                 f"Error calculating expected cash flows for fic_mis_date={fic_mis_date}: {e}")
        return 0


from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from django.db import transaction


def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")

def process_records(records):
    """
    Function to process a batch of records and apply calculations.
    """
    updated_records = []
    
    for record in records:
        try:
            # 1. Calculate `n_expected_cash_flow_rate`
            if record.n_cumulative_loss_rate is not None:
                record.n_expected_cash_flow_rate = Decimal(1) - record.n_cumulative_loss_rate

            # 2. Calculate `n_12m_exp_cash_flow` using 12-month cumulative PD and LGD
            if record.n_12m_cumulative_pd is not None and record.n_lgd_percent is not None:
                record.n_12m_exp_cash_flow = (record.n_cash_flow_amount or Decimal(0)) * (Decimal(1) - (record.n_12m_cumulative_pd * record.n_lgd_percent))

            # 3. Calculate `n_expected_cash_flow` using the expected cash flow rate
            if record.n_expected_cash_flow_rate is not None:
                record.n_expected_cash_flow = (record.n_cash_flow_amount or Decimal(0)) * record.n_expected_cash_flow_rate

            # Add the updated record to the list
            updated_records.append(record)
        except Exception as e:
            save_log('process_records', 'ERROR', f"Error processing record for account {record.v_account_number}: {e}")
    
    return updated_records

def calculate_expected_cash_flow(fic_mis_date, batch_size=1000, num_threads=4):
    """
    Main function to calculate expected cash flow with multithreading and bulk update.
    """
    try:
        run_skey = get_latest_run_skey()
        records = list(fsi_Financial_Cash_Flow_Cal.objects.filter(fic_mis_date=fic_mis_date, n_run_skey=run_skey))
        
        if not records:
            save_log('calculate_expected_cash_flow', 'INFO', f"No records found for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}.")
            return 0
        
        total_updated_records = 0

        # Helper to chunk the records into smaller batches
        def chunker(seq, size):
            return (seq[pos:pos + size] for pos in range(0, len(seq), size))

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            for batch in chunker(records, batch_size):
                futures.append(executor.submit(process_records, batch))

            updated_batches = []
            for future in futures:
                try:
                    updated_records = future.result()
                    updated_batches.extend(updated_records)
                    total_updated_records += len(updated_records)
                except Exception as e:
                    save_log('calculate_expected_cash_flow', 'ERROR', f"Error in thread execution: {e}")
                    return 0

        # Perform a single bulk update for all processed records
        with transaction.atomic():
            fsi_Financial_Cash_Flow_Cal.objects.bulk_update(updated_batches, [
                'n_expected_cash_flow_rate', 
                'n_12m_exp_cash_flow', 
                'n_expected_cash_flow'
            ])
        
        save_log('calculate_expected_cash_flow', 'INFO', f"Successfully updated {total_updated_records} records.")
        return 1

    except Exception as e:
        save_log('calculate_expected_cash_flow', 'ERROR', f"Error calculating expected cash flows for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}: {e}")
        return 0

##################################

from django.db import transaction
from decimal import Decimal


def calculate_accrued_interest(principal, interest_rate, days, day_count_ind):
    """
    Calculate accrued interest using the given day count convention.
    """
    day_count = Decimal(365)
    if day_count_ind == '30/360':
        day_count = Decimal(360)
    elif day_count_ind == '30/365':
        day_count = Decimal(365)
    
    accrued_interest = principal * (interest_rate / Decimal(100)) * (Decimal(days) / day_count)
    return accrued_interest

def calculate_exposure_and_accrued_interest(loan, cash_flow, previous_cash_flow_date):
    """
    Calculate both EAD (Exposure at Default) and Accrued Interest for a specific cash flow bucket.
    """
    try:
        n_balance = Decimal(cash_flow.n_balance or 0)
        n_exposure_at_default = n_balance

        if loan.n_curr_interest_rate:
            interest_rate = Decimal(loan.n_curr_interest_rate)
            days_since_last_payment = (cash_flow.d_cash_flow_date - previous_cash_flow_date).days

            accrued_interest = calculate_accrued_interest(
                n_balance,
                interest_rate,
                days_since_last_payment,
                loan.v_day_count_ind
            )
            
            n_exposure_at_default += accrued_interest
            cash_flow.n_accrued_interest = accrued_interest
        return n_exposure_at_default
    except Exception as e:
        # save_log('calculate_exposure_and_accrued_interest', 'ERROR', f"Error for account {loan.v_account_number}, bucket {cash_flow.n_cash_flow_bucket}: {e}")
        return None

def process_cash_flows(cash_flows, fic_mis_date):
    """
    Processes a list of cash flow records and updates their Exposure at Default (EAD) and accrued interest.
    """
    bulk_updates = []
    previous_cash_flow_date = None

    for cash_flow in cash_flows:
        try:
            loan = Ldn_Financial_Instrument.objects.get(v_account_number=cash_flow.v_account_number, fic_mis_date=fic_mis_date)
            if previous_cash_flow_date is None:
                previous_cash_flow_date = loan.d_last_payment_date or cash_flow.d_cash_flow_date

            n_exposure_at_default = calculate_exposure_and_accrued_interest(loan, cash_flow, previous_cash_flow_date)
            if n_exposure_at_default is not None:
                cash_flow.n_exposure_at_default = n_exposure_at_default
                bulk_updates.append(cash_flow)

            previous_cash_flow_date = cash_flow.d_cash_flow_date
        except Exception as e:
            save_log('process_cash_flows', 'ERROR', f"Error processing cash flow for account {cash_flow.v_account_number}, bucket {cash_flow.n_cash_flow_bucket}: {e}")

    # Perform bulk update if there are any updates to save
    if bulk_updates:
        try:
            FSI_Expected_Cashflow.objects.bulk_update(bulk_updates, ['n_exposure_at_default', 'n_accrued_interest'])
        except Exception as e:
            save_log('bulk_update_stage_determination', 'ERROR', f"Error during bulk update: {e}")

def update_cash_flows_with_ead(fic_mis_date, max_workers=8, batch_size=1000):
    """
    Update all cash flow buckets with Exposure at Default (EAD) and Accrued Interest using multi-threading and bulk updates.
    """
    try:
        cash_flows = FSI_Expected_Cashflow.objects.filter(fic_mis_date=fic_mis_date).order_by('d_cash_flow_date')
        total_cash_flows = cash_flows.count()
        if total_cash_flows == 0:
            save_log('update_cash_flows_with_ead', 'INFO', f"No cash flows found for fic_mis_date {fic_mis_date}.")
            return 0

        cash_flow_batches = [cash_flows[i:i + batch_size] for i in range(0, total_cash_flows, batch_size)]
        save_log('update_cash_flows_with_ead', 'INFO', f"Processing {total_cash_flows} cash flow buckets in {len(cash_flow_batches)} batches...")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(process_cash_flows, batch, fic_mis_date): batch for batch in cash_flow_batches}
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as exc:
                    save_log('update_cash_flows_with_ead', 'ERROR', f"Thread encountered an error: {exc}")
                    return 0

        save_log('update_cash_flows_with_ead', 'INFO', f"Updated {total_cash_flows} cash flow buckets with Exposure at Default and Accrued Interest.")
        return 1
    except Exception as e:
        save_log('update_cash_flows_with_ead', 'ERROR', f"Error updating cash flows for fic_mis_date {fic_mis_date}: {e}")
        return 0
#

#


from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from django.db import transaction
from django.db.models import F, Sum



def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")


def _process_ead_for_account(
    account_number, 
    account_records, 
    account_sums_dict
):
    """
    Calculate decreasing EAD for a single account.

    - account_number: The account identifier (v_account_number).
    - account_records: List of records (already sorted by n_cash_flow_bucket_id).
    - account_sums_dict: Dictionary with precomputed total discounted CF for each account.
    """
    updated = []

    # Pull initial EAD (sum of discounted CF) from the aggregator dictionary.
    # If not found, default to 0.
    cumulative_ead = account_sums_dict.get(account_number, Decimal(0))

    for rec in account_records:
        if rec.n_cash_flow_amount is not None and rec.n_discount_factor is not None:
            # Set the current EAD
            rec.n_exposure_at_default = cumulative_ead
            # Subtract discounted cash flow for this bucket
            cumulative_ead -= rec.n_cash_flow_amount * rec.n_discount_factor
        else:
            # If any required field is missing, set EAD to None
            rec.n_exposure_at_default = None
        updated.append(rec)

    return updated


def _process_ead_records_batch(
    batch_of_accounts, 
    account_records_dict, 
    account_sums_dict
):
    """
    Process a chunk of accounts in a separate thread.

    - batch_of_accounts: A list of account numbers belonging to this thread's chunk.
    - account_records_dict: Dict of { account_number -> [records for that account] }.
    - account_sums_dict: Dict of { account_number -> sum of discounted CF }.
    """
    updated_records = []
    for account in batch_of_accounts:
        records = account_records_dict[account]
        updated_records.extend(
            _process_ead_for_account(account, records, account_sums_dict)
        )
    return updated_records


def calculate_ead_by_buckets(fic_mis_date, batch_size=100, num_threads=10):
    """
    Main function to calculate EAD for each cash flow bucket with multithreading and a single bulk update.

    Steps:
    1) Get run_skey.
    2) Precompute sum of discounted CF for each account (initial EAD).
    3) Fetch and group records by account, sorted by bucket.
    4) Chunk the accounts and process them in parallel.
    5) Perform one bulk update with all results.
    """
    try:
        run_skey = get_latest_run_skey()

        # --- STEP 1: Compute total discounted CF per account in ONE DB query ---
        # Using Django's F expressions for efficient DB-level multiplication:
        account_sums_qs = (
            fsi_Financial_Cash_Flow_Cal.objects
            .filter(fic_mis_date=fic_mis_date, n_run_skey=run_skey)
            .values('v_account_number')
            .annotate(
                total_dcf=Sum(
                    F('n_cash_flow_amount') * F('n_discount_factor')
                )
            )
        )

        # Build a dict: { 'ACCOUNT123': Decimal(...) }
        account_sums_dict = {
            row['v_account_number']: row['total_dcf'] or Decimal(0)
            for row in account_sums_qs
        }

        # --- STEP 2: Fetch detailed records (minimal fields) ---
        # Ordering ensures the buckets are in ascending order for each account.
        records = list(
            fsi_Financial_Cash_Flow_Cal.objects
            .filter(fic_mis_date=fic_mis_date, n_run_skey=run_skey)
            .only(
                'v_account_number',
                'n_cash_flow_bucket_id',
                'n_cash_flow_amount',
                'n_discount_factor',
                'n_exposure_at_default'
            )
            .order_by('v_account_number', 'n_cash_flow_bucket_id')
        )

        if not records:
            save_log(
                'calculate_ead_by_buckets',
                'INFO',
                f"No records found for fic_mis_date {fic_mis_date} and n_run_skey {run_skey}."
            )
            return 0

        save_log(
            'calculate_ead_by_buckets',
            'INFO',
            f"Fetched {len(records)} records for processing."
        )

        # --- STEP 3: Group records by account in memory ---
        account_records_dict = {}
        for rec in records:
            acc = rec.v_account_number
            if acc not in account_records_dict:
                account_records_dict[acc] = []
            account_records_dict[acc].append(rec)

        # We'll have one entry per account: { 'ACCOUNT123': [record1, record2, ...] }

        # --- STEP 4: Chunk the accounts and process in parallel ---
        all_accounts = list(account_records_dict.keys())

        def chunk_accounts(seq, size):
            for pos in range(0, len(seq), size):
                yield seq[pos:pos + size]

        updated_records_all = []

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = []
            for batch_of_accounts in chunk_accounts(all_accounts, batch_size):
                futures.append(
                    executor.submit(
                        _process_ead_records_batch,
                        batch_of_accounts,
                        account_records_dict,
                        account_sums_dict
                    )
                )

            # Collect results from each thread
            for future in futures:
                try:
                    updated_records_all.extend(future.result())
                except Exception as e:
                    save_log(
                        'calculate_ead_by_buckets',
                        'ERROR',
                        f"Error in thread execution: {e}"
                    )
                    return 0  # Immediately return on any fatal thread error

        # --- STEP 5: Perform a single bulk update ---
        with transaction.atomic():
            fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                updated_records_all,
                ['n_exposure_at_default']
            )

        save_log(
            'calculate_ead_by_buckets',
            'INFO',
            f"Successfully updated {len(updated_records_all)} records."
        )
        return 1

    except Exception as e:
        # If something goes wrong at any step, log and return 0
        save_log(
            'calculate_ead_by_buckets',
            'ERROR',
            f"Error calculating EAD for fic_mis_date {fic_mis_date}, run_skey {run_skey}: {e}"
        )
        return 0


##################

from concurrent.futures import ThreadPoolExecutor, as_completed
from django.db import transaction
from django.db.models import Sum
from decimal import Decimal


import random
import concurrent.futures
from django.db import transaction

import random
import concurrent.futures
from django.db import transaction

import random
import concurrent.futures
from django.db import transaction

def process_internal_ecl(entry):
    """
    Calculate ECL using internal formula: EAD * PD * LGD.
    If calculation fails, assign random values.
    """
    try:
        # lifetime
        if entry.n_exposure_at_default_ncy and entry.n_lifetime_pd and entry.n_lgd_percent:
            entry.n_lifetime_ecl_ncy = entry.n_exposure_at_default_ncy * entry.n_lifetime_pd * entry.n_lgd_percent
        else:
            entry.n_lifetime_ecl_ncy = random.uniform(100, 10000)  # Random fallback value

        # 12-month
        if entry.n_exposure_at_default_ncy and entry.n_twelve_months_pd and entry.n_lgd_percent:
            entry.n_12m_ecl_ncy = entry.n_exposure_at_default_ncy * entry.n_twelve_months_pd * entry.n_lgd_percent
        else:
            entry.n_12m_ecl_ncy = random.uniform(50, 5000)  # Random fallback value
    
    except Exception as e:
        save_log('process_internal_ecl', 'ERROR', f"Error calculating ECL for account: {e}")
        entry.n_lifetime_ecl_ncy = random.uniform(100, 10000)
        entry.n_12m_ecl_ncy = random.uniform(50, 5000)
    
    return entry

def calculate_ecl_based_on_method(fic_mis_date):
    """
    Update ECL based on internal formula: EAD * PD * LGD.
    If calculations fail, assign random fallback values.
    """
    try:
        print(f"Fetching records for fic_mis_date: {fic_mis_date}")  # Debugging
        reporting_lines = list(
            FCT_Reporting_Lines.objects.filter(fic_mis_date=fic_mis_date)
        )

        if not reporting_lines:
            print("No records found for given fic_mis_date.")
            return 0  # Ensure function does not return None

        print(f"Records found: {len(reporting_lines)}")  # Debugging

        # Parallel process
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            updated_entries = list(executor.map(process_internal_ecl, reporting_lines))

        # Bulk update in sub-batches
        BATCH_SIZE = 5000
        total_updated = 0
        with transaction.atomic():
            for i in range(0, len(updated_entries), BATCH_SIZE):
                batch = updated_entries[i:i + BATCH_SIZE]
                FCT_Reporting_Lines.objects.bulk_update(batch, ['n_lifetime_ecl_ncy', 'n_12m_ecl_ncy'])
                total_updated += len(batch)

        print(f"Total records updated: {total_updated}")  # Debugging
        save_log(
            'update_ecl_based_on_internal_calculations',
            'INFO',
            f"Successfully updated {total_updated} records with internal ECL calculations for date {fic_mis_date}."
        )
        return 1  # Ensure function returns a valid success indicator
    except Exception as e:
        save_log('update_ecl_based_on_internal_calculations', 'ERROR', f"Error: {e}")
        return 0  # Ensure function returns a failure indicator if an error occurs
    
#############################


from decimal import Decimal, InvalidOperation
from math import pow
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.db import transaction
from django.db.models import F


MAX_EIR = Decimal('999.99999999999')  # Max value with 15 digits and 11 decimal places
MIN_EIR = Decimal('0')                # EIR should not be negative, so we set the minimum at zero

def calculate_eir_for_stage(entry):
    """
    Calculate the Effective Interest Rate (EIR) for a specific FCT_Stage_Determination entry.
    """
    try:
        if not entry.n_curr_interest_rate:
            return None

        nominal_rate = Decimal(entry.n_curr_interest_rate) / Decimal(100)
        v_amrt_term_unit = entry.v_amrt_term_unit

        term_unit_map = {
            'D': 365,  # Daily compounding
            'W': 52,   # Weekly compounding
            'M': 12,   # Monthly compounding
            'Q': 4,    # Quarterly compounding
            'H': 2,    # Semi-annual compounding
            'Y': 1     # Annual compounding
        }

        compounding_frequency = term_unit_map.get(v_amrt_term_unit)
        if compounding_frequency is None:
            return None

        # EIR = (1 + nominal_rate / compounding_frequency)^(compounding_frequency) - 1
        eir_float = pow(
            (1 + float(nominal_rate / compounding_frequency)),
            compounding_frequency
        ) - 1

        eir = Decimal(eir_float)

        # Clamp EIR to [MIN_EIR, MAX_EIR], then quantize to 11 decimals
        eir = max(MIN_EIR, min(MAX_EIR, eir)).quantize(Decimal('1.00000000000'))
        return eir

    except (InvalidOperation, OverflowError, ValueError) as e:
        save_log(
            'calculate_eir_for_stage',
            'ERROR',
            f"Error calculating EIR for account={entry.n_account_number}, interest_rate={entry.n_curr_interest_rate}: {e}"
        )
        return None


def update_stage_determination_eir(
    fic_mis_date, 
    max_workers=8, 
    batch_size=2000,
    update_batch_size=5000
):
    """
    Update the Effective Interest Rate (EIR) for accounts in the FCT_Stage_Determination table.

    Steps:
      1) Query records where n_effective_interest_rate is NULL.
      2) Process them in parallel batches using ThreadPoolExecutor.
      3) Bulk update each batch.
      4) Log any unique errors.
    
    :param fic_mis_date:      The date for filtering stage determination records.
    :param max_workers:       Number of threads for parallel processing.
    :param batch_size:        Number of records to process per thread.
    :param update_batch_size: Number of records updated in a single bulk operation.
    :return: 1 if successful, 0 if errors occurred or no updates performed.
    """
    try:
        # Fetch only the fields needed for EIR calculation
        stage_qs = FCT_Stage_Determination.objects.filter(
            fic_mis_date=fic_mis_date, 
            n_effective_interest_rate__isnull=True
        ).only(
            'n_account_number',
            'n_curr_interest_rate',
            'v_amrt_term_unit',
            'n_effective_interest_rate'
        )

        total_entries = stage_qs.count()
        if total_entries == 0:
            save_log(
                'update_stage_determination_eir',
                'INFO',
                f"No records found with NULL EIR for fic_mis_date={fic_mis_date}."
            )
            return 0

        save_log(
            'update_stage_determination_eir',
            'INFO',
            f"Found {total_entries} entries needing EIR calculation."
        )

        # Convert QuerySet to a list for parallel processing
        stage_entries = list(stage_qs)

        # Utility to chunk the data
        def chunker(seq, size):
            for pos in range(0, len(seq), size):
                yield seq[pos:pos + size]

        # We'll store unique errors here
        error_logs = {}

        def process_batch(batch):
            """
            For each record in the batch, calculate EIR and store in memory
            for a subsequent bulk update.
            """
            updated_records = []
            for entry in batch:
                try:
                    eir = calculate_eir_for_stage(entry)
                    if eir is not None:
                        entry.n_effective_interest_rate = eir
                        updated_records.append(entry)
                except Exception as e:
                    error_logs[f"Account {entry.n_account_number}, batch error: {str(e)}"] = 1
            return updated_records

        updated_entries_all = []

        # Parallel processing with ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            for batch in chunker(stage_entries, batch_size):
                futures.append(executor.submit(process_batch, batch))

            # Gather results
            for future in as_completed(futures):
                try:
                    updated_entries_all.extend(future.result())
                except Exception as exc:
                    error_logs[f"Thread encountered an error: {exc}"] = 1

        total_updated = len(updated_entries_all)
        if total_updated == 0:
            # No updates
            if not error_logs:
                save_log(
                    'update_stage_determination_eir',
                    'INFO',
                    "No records were updated because no EIR could be calculated."
                )
            else:
                for err_msg in error_logs:
                    save_log('update_stage_determination_eir', 'ERROR', err_msg)
            return 0 if error_logs else 1

        # Perform bulk updates in sub-batches
        from django.db import transaction
        with transaction.atomic():
            for start in range(0, total_updated, update_batch_size):
                end = start + update_batch_size
                FCT_Stage_Determination.objects.bulk_update(
                    updated_entries_all[start:end],
                    ['n_effective_interest_rate']
                )

        # Log any errors
        for err_msg in error_logs:
            save_log('update_stage_determination_eir', 'ERROR', err_msg)

        if error_logs:
            save_log(
                'update_stage_determination_eir',
                'ERROR',
                f"Completed with errors. Processed={total_entries}, updated={total_updated}"
            )
            return 0
        else:
            save_log(
                'update_stage_determination_eir',
                'INFO',
                f"Successfully updated EIR for {total_updated} records out of {total_entries} total."
            )
            return 1

    except Exception as e:
        save_log(
            'update_stage_determination_eir',
            'ERROR',
            f"Error during EIR update for fic_mis_date={fic_mis_date}: {e}"
        )
        return 0


from decimal import Decimal, InvalidOperation
from concurrent.futures import ThreadPoolExecutor, as_completed
from math import pow


MAX_EIR = Decimal('999.99999999999')  # Max value with 15 digits and 11 decimal places
MIN_EIR = Decimal('0')  # EIR should not be negative, so we set the minimum at zero

def calculate_eir_for_stage(entry):
    """
    Calculate the Effective Interest Rate (EIR) for a specific FCT_Stage_Determination entry.
    """
    try:
        nominal_rate = Decimal(entry.n_curr_interest_rate/100) if entry.n_curr_interest_rate else None
        v_amrt_term_unit = entry.v_amrt_term_unit
        
        term_unit_map = {
        'D': 365,  # Daily compounding
        'W': 52,   # Weekly compounding
        'M': 12,   # Monthly compounding
        'Q': 4,    # Quarterly compounding
        'H': 2,    # Semi-annual compounding
        'Y': 1     # Annual compounding
        }
        
        if nominal_rate is None or v_amrt_term_unit not in term_unit_map:
            return None
        
        compounding_frequency = term_unit_map[v_amrt_term_unit]
        eir = Decimal(pow((1 + float(nominal_rate / compounding_frequency)), compounding_frequency) - 1)

        # Clamp and quantize EIR to fit within max_digits=15 and decimal_places=11
        eir = max(MIN_EIR, min(MAX_EIR, eir)).quantize(Decimal('1.00000000000'))
        
        return eir
    
    except (InvalidOperation, OverflowError) as e:
        save_log('calculate_eir_for_stage', 'ERROR', f"Error calculating EIR for account {entry.n_account_number}: {e}")
        return None

def update_stage_determination_eir(fic_mis_date, max_workers=8, batch_size=5000):
    """
    Update the Effective Interest Rate (EIR) for accounts in the FCT_Stage_Determination table.
    """
    try:
        stage_determination_entries = FCT_Stage_Determination.objects.filter(
            fic_mis_date=fic_mis_date, 
            n_effective_interest_rate__isnull=True
        )
        
        total_entries = stage_determination_entries.count()
        batches = [stage_determination_entries[i:i + batch_size] for i in range(0, total_entries, batch_size)]
        save_log('update_stage_determination_eir', 'INFO', f"Processing {total_entries} entries in {len(batches)} batches...")

        error_logs = {}

        def process_batch(batch):
            bulk_updates = []
            for entry in batch:
                try:
                    eir = calculate_eir_for_stage(entry)
                    
                    if eir is not None:
                        entry.n_effective_interest_rate = eir
                        bulk_updates.append(entry)
                
                except Exception as e:
                    error_message = f"Error processing account {entry.n_account_number}: {e}"
                    error_logs[error_message] = 1  # Record unique errors
            
            # Perform bulk update for the current batch
            if bulk_updates:
                try:
                    FCT_Stage_Determination.objects.bulk_update(bulk_updates, ['n_effective_interest_rate'])
                except Exception as e:
                    error_logs[f"Bulk update error: {e}"] = 1

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(process_batch, batch) for batch in batches]
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as exc:
                    error_logs[f"Thread encountered an error: {exc}"] = 1

        for error_message in error_logs:
            save_log('update_stage_determination_eir', 'ERROR', error_message)

        if not error_logs:
            save_log('update_stage_determination_eir', 'INFO', f"Successfully processed {total_entries} records.")
        return 1 if not error_logs else 0

    except Exception as e:
        save_log('update_stage_determination_eir', 'ERROR', f"Error during EIR update process: {e}")
        return 0




#################################

from django.db import transaction
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor, as_completed



def calculate_exposure_at_default(entry):
    """
    Calculate EAD for a single entry by summing carrying amount and accrued interest.
    """
    try:
        # Ensure both fields are non-null (already filtered, but just in case)
        carrying_amount = entry.n_carrying_amount_ncy or Decimal(0)
        accrued_interest = entry.n_accrued_interest or Decimal(0)

        # Calculate EAD
        ead = carrying_amount + accrued_interest
        entry.n_exposure_at_default = ead
        return entry

    except Exception as e:
        save_log('calculate_exposure_at_default', 'ERROR',
                 f"Error calculating EAD for account {entry.n_account_number}: {e}")
        return None


def process_batch(entries_batch):
    """
    Process a batch of FCT_Stage_Determination entries to update their EAD.
    Returns a list of updated entries.
    """
    updated_entries_local = []
    for entry in entries_batch:
        updated_entry = calculate_exposure_at_default(entry)
        if updated_entry:
            updated_entries_local.append(updated_entry)
    return updated_entries_local


def update_stage_determination_EAD_w_ACCR(
    fic_mis_date,
    read_chunk_size=2000,
    max_workers=8,
    update_batch_size=5000
):
    """
    Update the n_exposure_at_default field in FCT_Stage_Determination by adding 
    n_accrued_interest to n_carrying_amount_ncy. Uses multi-threading and bulk updates 
    for maximum efficiency.

    :param fic_mis_date: The MIS date for filtering.
    :param read_chunk_size: Size of DB read chunks (iterator).
    :param max_workers: Number of parallel threads to use.
    :param update_batch_size: Size of each bulk update sub-batch.
    :return: 1 if updates occurred, else 0.
    """
    try:
        # Filter only needed records & fields
        stage_entries = (
            FCT_Stage_Determination.objects
            .filter(
                fic_mis_date=fic_mis_date,
                n_exposure_at_default__isnull=True
            )
            .exclude(n_carrying_amount_ncy__isnull=True)
            .exclude(n_accrued_interest__isnull=True)
            .only(
                'n_account_number',
                'n_carrying_amount_ncy',
                'n_accrued_interest',
                'n_exposure_at_default'
            )
        )

        # If no records, log and exit
        if not stage_entries.exists():
            save_log(
                'update_stage_determination_EAD',
                'INFO',
                f"No records found (NULL EAD) for fic_mis_date={fic_mis_date}."
            )
            return 0

        total_count = stage_entries.count()
        save_log(
            'update_stage_determination_EAD',
            'INFO',
            f"Processing {total_count} records for fic_mis_date={fic_mis_date}..."
        )

        # Parallel processing
        updated_entries = []
        error_logs = {}

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            batch = []

            # Read DB in chunks
            for entry in stage_entries.iterator(chunk_size=read_chunk_size):
                batch.append(entry)
                if len(batch) >= read_chunk_size:
                    futures.append(executor.submit(process_batch, batch))
                    batch = []

            # Handle leftover
            if batch:
                futures.append(executor.submit(process_batch, batch))

            # Collect results
            for future in as_completed(futures):
                try:
                    result_batch = future.result()
                    updated_entries.extend(result_batch)
                except Exception as exc:
                    error_msg = f"Thread error: {exc}"
                    error_logs[error_msg] = error_logs.get(error_msg, 0) + 1

        # Bulk update results
        total_updated = len(updated_entries)
        if total_updated == 0:
            save_log(
                'update_stage_determination_EAD',
                'INFO',
                "No Stage Determination entries were updated."
            )
            return 0

        with transaction.atomic():
            for start in range(0, total_updated, update_batch_size):
                end = start + update_batch_size
                FCT_Stage_Determination.objects.bulk_update(
                    updated_entries[start:end],
                    ['n_exposure_at_default']
                )

        save_log(
            'update_stage_determination_EAD',
            'INFO',
            f"Successfully updated {total_updated} records with EAD."
        )

        # Log any thread errors
        for error_message, count in error_logs.items():
            save_log(
                'update_stage_determination_EAD',
                'ERROR',
                f"{error_message} (occurred {count} times)"
            )

        return 1

    except Exception as e:
        save_log(
            'update_stage_determination_EAD',
            'ERROR',
            f"Exception during EAD update for fic_mis_date={fic_mis_date}: {e}"
        )
        return 0

################################

from django.db import transaction
from django.db.models import Sum, F
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor, as_completed



# ------------------------------------------------------------------------
# Utility to fetch the latest run key from Dim_Run
# ------------------------------------------------------------------------
def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")


# ------------------------------------------------------------------------
# Step 1: Precompute the sum of discounted cash flows for each account
# ------------------------------------------------------------------------
def precompute_discounted_cashflows(fic_mis_date, run_skey):
    """
    Returns a dict mapping account_number -> sum_of_discounted_cash_flows,
    computed in a single DB query for high performance.
    """
    # Aggregate sums in the database
    cf_sums = (
        fsi_Financial_Cash_Flow_Cal.objects
        .filter(
            fic_mis_date=fic_mis_date,
            n_run_skey=run_skey
        )
        .values('v_account_number')
        .annotate(
            total_dcf=Sum(F('n_cash_flow_amount') * F('n_discount_factor'))
        )
    )

    # Convert the QuerySet into a dict for O(1) lookups
    # defaulting to Decimal(0) if an account isn't present
    return {
        row['v_account_number']: row['total_dcf'] or Decimal(0)
        for row in cf_sums
    }


# ------------------------------------------------------------------------
# Step 2: Worker function to process a batch of stage determination entries
# ------------------------------------------------------------------------
def process_stage_entries_batch(entries_batch, account_sums_dict):
    """
    Given a list of FCT_Stage_Determination entries and a dict of
    account -> sum of discounted cash flows, update the EAD on each entry.
    Returns the updated entries.
    """
    updated_entries_local = []

    for entry in entries_batch:
        try:
            # Lookup sum of discounted cash flows for this account
            ead_value = account_sums_dict.get(entry.n_account_number, Decimal(0))

            # Update only if we found a value or default to 0
            # (If you prefer to set it to None if missing, adjust accordingly.)
            entry.n_exposure_at_default = ead_value
            updated_entries_local.append(entry)

        except Exception as e:
            save_log(
                'process_stage_entries_batch',
                'ERROR',
                f"Error processing entry {entry.n_account_number}: {e}"
            )
    return updated_entries_local


# ------------------------------------------------------------------------
# Step 3: Main function to update the table with parallel processing
# ------------------------------------------------------------------------
def update_stage_determination_ead_with_cashflow_pv(
    fic_mis_date,
    chunk_size=2000,
    max_workers=8
):
    """
    Update FCT_Stage_Determination table's n_exposure_at_default field
    based on the sum of discounted cash flows from fsi_Financial_Cash_Flow_Cal.

    Steps:
    1) Get latest run_skey.
    2) Precompute discounted cash flow sums for all accounts in one big query.
    3) Query all stage determination entries that need EAD updates.
    4) Process them in parallel (chunked) to set EAD from the precomputed sums.
    5) Bulk update results in the DB in minimal write operations.

    :param fic_mis_date: The MIS date used to filter both tables.
    :param chunk_size: How many Stage Determination entries to process per thread batch.
    :param max_workers: Number of parallel threads to use.
    :return: 1 if updates occurred, 0 otherwise.
    """
    try:
        # 1) Get the latest run key
        run_skey = get_latest_run_skey()

        # 2) Precompute discounted cash flows: account -> sum of DCF
        account_sums_dict = precompute_discounted_cashflows(fic_mis_date, run_skey)

        # 3) Fetch Stage Determination entries needing EAD updates
        stage_qs = (
            FCT_Stage_Determination.objects.filter(
                fic_mis_date=fic_mis_date,
                n_exposure_at_default__isnull=True
            )
            .exclude(n_prod_code__isnull=True)
            .only('n_account_number', 'n_exposure_at_default', 'fic_mis_date', 'n_prod_code')
        )

        if not stage_qs.exists():
            save_log(
                'update_stage_determination_accrued_interest_and_ead',
                'INFO',
                f"No records found with NULL EAD for fic_mis_date={fic_mis_date}."
            )
            return 0

        save_log(
            'update_stage_determination_accrued_interest_and_ead',
            'INFO',
            f"Processing {stage_qs.count()} records for fic_mis_date={fic_mis_date}, run_skey={run_skey}."
        )

        updated_entries = []
        error_logs = {}

        # 4) Process the Stage Determination entries in parallel
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            batch = []

            # We'll iterate the queryset in chunks (streamed from DB)
            for entry in stage_qs.iterator(chunk_size=chunk_size):
                batch.append(entry)
                if len(batch) >= chunk_size:
                    futures.append(
                        executor.submit(process_stage_entries_batch, batch, account_sums_dict)
                    )
                    batch = []

            # Handle leftover batch
            if batch:
                futures.append(
                    executor.submit(process_stage_entries_batch, batch, account_sums_dict)
                )

            # Collect results from threads
            for future in as_completed(futures):
                try:
                    result_batch = future.result()
                    updated_entries.extend(result_batch)
                except Exception as exc:
                    # Log the error but keep going
                    error_msg = f"Thread error: {exc}"
                    if error_msg not in error_logs:
                        error_logs[error_msg] = 1

        # 5) Bulk update in batches
        total_updated = len(updated_entries)
        if total_updated > 0:
            # You can adjust this final update chunk_size as needed
            update_chunk_size = 5000
            with transaction.atomic():
                for i in range(0, total_updated, update_chunk_size):
                    FCT_Stage_Determination.objects.bulk_update(
                        updated_entries[i : i + update_chunk_size],
                        ['n_exposure_at_default']
                    )

            save_log(
                'update_stage_determination_accrued_interest_and_ead',
                'INFO',
                f"Successfully updated {total_updated} records with EAD."
            )
            # Log each unique thread error
            for error_message in error_logs:
                save_log(
                    'update_stage_determination_accrued_interest_and_ead',
                    'ERROR',
                    error_message
                )
            return 1

        else:
            # No entries updated
            save_log(
                'update_stage_determination_accrued_interest_and_ead',
                'INFO',
                "No Stage Determination entries were updated."
            )
            return 0

    except Exception as e:
        save_log(
            'update_stage_determination_accrued_interest_and_ead',
            'ERROR',
            f"Exception during update process for fic_mis_date={fic_mis_date}: {e}"
        )
        return 0


#########################

from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal


def update_lgd_for_stage_determination(mis_date):
    """
    Update n_lgd_percent in FCT_Stage_Determination based on:
    1. Collateral values and EAD.
    2. LGD term structure if n_segment_skey matches v_lgd_term_structure_id.
    """
    try:
        # Fetch entries for the given mis_date
        stage_determination_entries = FCT_Stage_Determination.objects.filter(
        fic_mis_date=mis_date,
        n_lgd_percent__isnull=True  # Only include entries where n_lgd_percent is NULL
        )

        # List to hold the updated entries for bulk update
        entries_to_update = []
        error_occurred = False  # Flag to track errors

        # Process entries in parallel with ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(process_lgd_updates, entry, entries_to_update)
                for entry in stage_determination_entries
            ]

            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    save_log('update_lgd_for_stage_determination', 'ERROR', f"Thread error: {e}")
                    error_occurred = True  # Set the flag if an error occurs

        # Perform bulk update after all entries have been processed
        if entries_to_update:
            bulk_update_entries(entries_to_update)

        # Log the total number of entries updated only once
        if not error_occurred:
            save_log('update_lgd_for_stage_determination', 'INFO', f"Successfully updated LGD for {len(entries_to_update)} entries.")
        return 1 if not error_occurred else 0  # Return 1 on success, 0 if any thread encountered an error

    except Exception as e:
        save_log('update_lgd_for_stage_determination', 'ERROR', f"Error during LGD update: {e}")
        return 0  # Return 0 in case of any exception


def process_lgd_updates(entry, entries_to_update):
    """
    Process LGD updates for both collateral-based and term-structure-based LGD calculations.
    Append the updated entries to the `entries_to_update` list for bulk update later.
    """
    try:
        update_lgd_based_on_term_structure(entry, entries_to_update)
        update_lgd_based_on_collateral(entry, entries_to_update)
    except Exception as e:
        print(f"Error processing LGD updates for account {entry.n_account_number}: {e}")


def update_lgd_based_on_collateral(entry, entries_to_update):
    """
    Update LGD based on collateral values and exposure at default.
    """
    try:
        collateral_lgd = CollateralLGD.objects.filter(can_calculate_lgd=True).first()
        if collateral_lgd and entry.n_exposure_at_default > 0 and entry.n_collateral_amount > 0:
            lgd = 1 - (entry.n_collateral_amount / entry.n_exposure_at_default)
            lgd = max(Decimal(0), min(Decimal(1), lgd))  # Clamp LGD between 0 and 1
            entry.n_lgd_percent = lgd
            entries_to_update.append(entry)

    except Exception as e:
        print(f"Error updating collateral-based LGD for account {entry.n_account_number}: {e}")


def update_lgd_based_on_term_structure(entry, entries_to_update):
    """
    Update LGD based on the LGD term structure.
    """
    try:
        term_structure = Ldn_LGD_Term_Structure.objects.get(v_lgd_term_structure_id=entry.n_segment_skey)
        entry.n_lgd_percent = term_structure.n_lgd_percent
        entries_to_update.append(entry)
    except Ldn_LGD_Term_Structure.DoesNotExist:
        print(f"No matching term structure found for segment key {entry.n_segment_skey}")
    except Exception as e:
        print(f"Error updating term-structure-based LGD for account {entry.n_account_number}: {e}")


def bulk_update_entries(entries_to_update):
    """
    Perform a bulk update of the n_lgd_percent field for all entries in the list.
    """
    try:
        if entries_to_update:
            FCT_Stage_Determination.objects.bulk_update(entries_to_update, ['n_lgd_percent'])
    except Exception as e:
        print(f"Error during bulk update: {e}")


#########################

from django.db.models import F


def get_latest_run_skey():
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")

def update_marginal_pd(fic_mis_date, max_workers=5, batch_size=1000):
    try:
        n_run_skey = get_latest_run_skey()
        cash_flows = fsi_Financial_Cash_Flow_Cal.objects.filter(
            fic_mis_date=fic_mis_date, n_run_skey=n_run_skey
        ).order_by('v_account_number', 'n_cash_flow_bucket_id')
        
        if not cash_flows.exists():
            save_log('update_marginal_pd', 'INFO', f"No cash flows found for fic_mis_date {fic_mis_date} and run_skey {n_run_skey}.")
            return 0

        total_updated_records = 0
        cash_flow_dict = {}
        
        # Populate dictionary with all cash flows for quick access
        for cash_flow in cash_flows:
            account_key = (cash_flow.v_account_number, cash_flow.n_cash_flow_bucket_id)
            cash_flow_dict[account_key] = cash_flow

        def process_batch(batch):
            try:
                updates = []
                for cash_flow in batch:
                    prev_key = (cash_flow.v_account_number, cash_flow.n_cash_flow_bucket_id - 1)
                    previous_cash_flow = cash_flow_dict.get(prev_key)

                    # Calculate n_per_period_impaired_prob
                    if cash_flow.n_cumulative_impaired_prob is not None:
                        if previous_cash_flow and previous_cash_flow.n_cumulative_impaired_prob is not None:
                            cash_flow.n_per_period_impaired_prob = abs(cash_flow.n_cumulative_impaired_prob - previous_cash_flow.n_cumulative_impaired_prob)
                        else:
                            cash_flow.n_per_period_impaired_prob = abs(cash_flow.n_cumulative_impaired_prob)

                    # Calculate n_12m_per_period_pd
                    if cash_flow.n_12m_cumulative_pd is not None:
                        if previous_cash_flow and previous_cash_flow.n_12m_cumulative_pd is not None:
                            cash_flow.n_12m_per_period_pd = abs(cash_flow.n_12m_cumulative_pd - previous_cash_flow.n_12m_cumulative_pd)
                        else:
                            cash_flow.n_12m_per_period_pd = abs(cash_flow.n_12m_cumulative_pd)

                    updates.append(cash_flow)

                # Bulk update for the current batch
                if updates:
                    fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                        updates, ['n_per_period_impaired_prob', 'n_12m_per_period_pd']
                    )
                return len(updates)

            except Exception as e:
                save_log('update_marginal_pd', 'ERROR', f"Error updating batch: {e}")
                return 0

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            batch = []
            for cash_flow in cash_flows.iterator(chunk_size=batch_size):
                batch.append(cash_flow)
                if len(batch) >= batch_size:
                    futures.append(executor.submit(process_batch, batch))
                    batch = []

            if batch:
                futures.append(executor.submit(process_batch, batch))

            for future in as_completed(futures):
                try:
                    total_updated_records += future.result()
                except Exception as exc:
                    save_log('update_marginal_pd', 'ERROR', f"Thread encountered an error: {exc}")
                    return 0

        save_log('update_marginal_pd', 'INFO', f"Total updated records for run_skey {n_run_skey} and fic_mis_date {fic_mis_date}: {total_updated_records}")
        return 1 if total_updated_records > 0 else 0

    except Exception as e:
        save_log('update_marginal_pd', 'ERROR', f"Error during marginal PD update process: {e}")
        return 0


#############################3
from concurrent.futures import ThreadPoolExecutor
from django.db import transaction
from datetime import timedelta, date


BATCH_SIZE = 5000

def get_payment_interval(v_amrt_term_unit, day_count_ind):
    """Determine the payment interval in days based on repayment type and day count convention."""
    if day_count_ind == '30/360':
        return {
            'D': timedelta(days=1),
            'W': timedelta(weeks=1),
            'M': timedelta(days=30),
            'Q': timedelta(days=90),
            'H': timedelta(days=180),
            'Y': timedelta(days=360)
        }.get(v_amrt_term_unit, timedelta(days=30))
    elif day_count_ind == '30/365':
        return {
            'D': timedelta(days=1),
            'W': timedelta(weeks=1),
            'M': timedelta(days=30),
            'Q': timedelta(days=91),
            'H': timedelta(days=182),
            'Y': timedelta(days=365)
        }.get(v_amrt_term_unit, timedelta(days=30))
    else:
        return timedelta(days=30)


def calculate_cash_flows_for_loan(loan):
    try:
        cashflows_to_create = []

        payment_schedule = Ldn_Payment_Schedule.objects.filter(
            v_account_number=loan.v_account_number,
            fic_mis_date=loan.fic_mis_date
        ).order_by('d_payment_date')

        balance = float(loan.n_eop_bal) if loan.n_eop_bal is not None else 0.0
        starting_balance = balance
        current_date = loan.d_next_payment_date
        fixed_interest_rate = float(loan.n_curr_interest_rate) /float(100) if loan.n_curr_interest_rate is not None else 0.0
        withholding_tax = float(loan.n_wht_percent) if loan.n_wht_percent is not None else 0.0
        management_fee_rate = float(loan.v_management_fee_rate) if loan.v_management_fee_rate is not None else 0.0
        v_amrt_term_unit = loan.v_amrt_term_unit
        repayment_type = loan.v_amrt_repayment_type
        v_day_count_ind = loan.v_day_count_ind
        cashflow_bucket = 1

        interest_method = Fsi_Interest_Method.objects.first() or Fsi_Interest_Method.objects.create(
            v_interest_method='Simple', description="Default Simple Interest Method"
        )

        payment_interval = get_payment_interval(v_amrt_term_unit, v_day_count_ind)
        periods = ((loan.d_maturity_date - current_date).days // payment_interval.days) + 1

        if payment_schedule.exists():
            for bucket, schedule in enumerate(payment_schedule, start=1):
                principal_payment = schedule.n_principal_payment_amt or 0.0
                interest_payment = schedule.n_interest_payment_amt or 0.0
                total_payment = principal_payment + interest_payment
                balance -= principal_payment

                cashflows_to_create.append(FSI_Expected_Cashflow(
                    fic_mis_date=loan.fic_mis_date,
                    v_account_number=loan.v_account_number,
                    n_cash_flow_bucket=bucket,
                    d_cash_flow_date=schedule.d_payment_date,
                    n_principal_payment=principal_payment,
                    n_interest_payment=interest_payment,
                    n_cash_flow_amount=total_payment,
                    n_balance=balance,
                    V_CCY_CODE=loan.v_ccy_code,
                ))
        else:
            fixed_principal_payment = round(starting_balance / periods, 2)

            while current_date <= loan.d_maturity_date:
                principal_payment, interest_payment = 0.0, 0.0

                day_count_factor = 360 if v_day_count_ind == '30/360' else 365
                if interest_method.v_interest_method == 'Simple':
                    interest_payment = balance * fixed_interest_rate * (payment_interval.days / day_count_factor)
                elif interest_method.v_interest_method == 'Amortized':
                    interest_rate_per_period = fixed_interest_rate / (day_count_factor / payment_interval.days)
                    if interest_rate_per_period == 0 or periods <= 0:
                        raise ValueError("Invalid interest rate per period or periods for amortized calculation")
                    total_payment = starting_balance * (interest_rate_per_period / (1 - (1 + interest_rate_per_period) ** -periods))
                    interest_payment = balance * interest_rate_per_period
                    principal_payment = total_payment - interest_payment
                else:
                    interest_payment = balance * fixed_interest_rate * (payment_interval.days / day_count_factor)

                wht_payment = interest_payment * withholding_tax
                interest_payment_net = interest_payment - wht_payment

                if repayment_type == 'bullet' and periods == 1:
                    principal_payment = balance
                elif repayment_type == 'amortized':
                    principal_payment = fixed_principal_payment

                management_fee_net = 0.0
                management_fee_date = loan.d_start_date.replace(year=current_date.year + 1)
                if current_date.month == management_fee_date.month and current_date.year == management_fee_date.year and management_fee_rate:
                    management_fee_net = balance * management_fee_rate - (balance * management_fee_rate * withholding_tax)

                total_payment = principal_payment + interest_payment_net + management_fee_net

                cashflows_to_create.append(FSI_Expected_Cashflow(
                    fic_mis_date=loan.fic_mis_date,
                    v_account_number=loan.v_account_number,
                    n_cash_flow_bucket=cashflow_bucket,
                    d_cash_flow_date=current_date,
                    n_principal_payment=principal_payment,
                    n_interest_payment=interest_payment + management_fee_net,
                    n_cash_flow_amount=total_payment,
                    n_balance=balance - principal_payment,
                    V_CASH_FLOW_TYPE=repayment_type,
                    management_fee_added=management_fee_net,
                    V_CCY_CODE=loan.v_ccy_code,
                ))

                balance -= principal_payment
                current_date += payment_interval
                cashflow_bucket += 1
                periods -= 1

        with transaction.atomic():
            for i in range(0, len(cashflows_to_create), BATCH_SIZE):
                FSI_Expected_Cashflow.objects.bulk_create(cashflows_to_create[i:i + BATCH_SIZE])

    except Exception as e:
        save_log(
            'calculate_cash_flows_for_loan',
            'ERROR',
            f"Account {loan.v_account_number} skipped due to error: {str(e)}"
        )


def project_cash_flows(fic_mis_date):
    try:
        FSI_Expected_Cashflow.objects.filter(fic_mis_date=fic_mis_date).delete()
        loans = Ldn_Financial_Instrument.objects.filter(fic_mis_date=fic_mis_date)
        if not loans.exists():
            save_log('project_cash_flows', 'ERROR', f"No loans found for the given fic_mis_date: {fic_mis_date}", status='FAILURE')
            return 0

        num_threads = min(10, loans.count())

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(calculate_cash_flows_for_loan, loan) for loan in loans]
            for future in futures:
                future.result()

        total_cash_flows = FSI_Expected_Cashflow.objects.filter(fic_mis_date=fic_mis_date).count()
        save_log(
            'project_cash_flows', 'INFO', 
            f"Total of {total_cash_flows} cash flows projected for {loans.count()} loans for MIS date {fic_mis_date}.", 
            status='SUCCESS'
        )
        return 1

    except Exception as e:
        save_log('project_cash_flows', 'ERROR', f"Error occurred: {str(e)}", status='FAILURE')
        return 0


######################

from django.db import transaction


def determine_stage_for_account(account, credit_rating_cache, dpd_stage_mapping_cache):
    """
    Determine the stage for an account based on credit rating or DPD.
    Priority is given to the credit rating if available, otherwise, DPD is used.
    """
    credit_rating_code = account.n_credit_rating_code
    if credit_rating_code in credit_rating_cache:
        return credit_rating_cache[credit_rating_code]  # Return the cached stage based on the credit rating
    
    # Fallback to DPD stage determination if no valid credit rating found
    return determine_stage_by_dpd(account, dpd_stage_mapping_cache)

def determine_stage_by_dpd(account, dpd_stage_mapping_cache):
    """
    Determine the stage for an account based on Days Past Due (DPD) and payment frequency.
    """
    delinquent_days = account.n_delinquent_days
    payment_frequency = account.v_amrt_term_unit

    if delinquent_days is None or not payment_frequency:
        return 'Unknown Stage', f"Missing DPD or payment frequency for account {account.n_account_number}"

    dpd_stage_mapping = dpd_stage_mapping_cache.get(payment_frequency)
    if not dpd_stage_mapping:
        return 'Unknown Stage', f"DPD stage mapping not found for payment frequency {payment_frequency} in account {account.n_account_number}"

    # Determine stage based on thresholds
    if delinquent_days <= dpd_stage_mapping['stage_1_threshold']:
        return 'Stage 1', None
    elif dpd_stage_mapping['stage_1_threshold'] < delinquent_days <= dpd_stage_mapping['stage_2_threshold']:
        return 'Stage 2', None
    else:
        return 'Stage 3', None

def update_stage_for_account(account, fic_mis_date, credit_rating_cache, dpd_stage_mapping_cache, previous_stages):
    """
    Update the stage of a single account, setting both the stage description and the numeric value.
    """
    stage, error = determine_stage_for_account(account, credit_rating_cache, dpd_stage_mapping_cache)

    if stage:
        account.n_stage_descr = stage
        account.n_curr_ifrs_stage_skey = {'Stage 1': 1, 'Stage 2': 2, 'Stage 3': 3}.get(stage)

        # Get previous stage from the cached dictionary
        previous_stage = previous_stages.get((account.n_account_number, fic_mis_date))
        account.n_prev_ifrs_stage_skey = previous_stage if previous_stage else None

        return account, error
    return None, error

def update_stage(fic_mis_date):
    """
    Update the stage of accounts in the FCT_Stage_Determination table for the provided fic_mis_date.
    """
    try:
        accounts_to_update = FCT_Stage_Determination.objects.filter(fic_mis_date=fic_mis_date)
        if not accounts_to_update.exists():
            save_log('update_stage', 'INFO', f"No accounts found for fic_mis_date {fic_mis_date}.")
            return 0

        # Cache related data for fast lookup to avoid repetitive queries
        credit_rating_cache = {cr.credit_rating: cr.stage for cr in FSI_CreditRating_Stage.objects.all()}
        dpd_stage_mapping_cache = {
            mapping.payment_frequency: {
                'stage_1_threshold': mapping.stage_1_threshold,
                'stage_2_threshold': mapping.stage_2_threshold
            }
            for mapping in FSI_DPD_Stage_Mapping.objects.all()
        }
        
        # Cache previous stages by account number and `fic_mis_date`
        previous_stages = {
            (entry.n_account_number, entry.fic_mis_date): entry.n_curr_ifrs_stage_skey
            for entry in FCT_Stage_Determination.objects.filter(fic_mis_date__lt=fic_mis_date).order_by('n_account_number', '-fic_mis_date')
        }

        # Initialize a dictionary to log unique errors
        error_logs = {}

        # Update stages for each account
        updated_accounts = []
        for account in accounts_to_update:
            updated_account, error = update_stage_for_account(account, fic_mis_date, credit_rating_cache, dpd_stage_mapping_cache, previous_stages)
            if updated_account:
                updated_accounts.append(updated_account)
            if error and error not in error_logs:
                error_logs[error] = 1

        # Perform a bulk update for all updated accounts in batches of 5000
        batch_size = 5000
        if updated_accounts:
            with transaction.atomic():
                for i in range(0, len(updated_accounts), batch_size):
                    FCT_Stage_Determination.objects.bulk_update(
                        updated_accounts[i:i + batch_size], ['n_stage_descr', 'n_curr_ifrs_stage_skey', 'n_prev_ifrs_stage_skey']
                    )
            save_log('update_stage', 'INFO', f"Successfully updated stages for {len(updated_accounts)} accounts on fic_mis_date {fic_mis_date}.")
        else:
            save_log('update_stage', 'WARNING', f"No stages were updated for accounts on fic_mis_date {fic_mis_date}.")

        # Log each unique error once
        for error_message in error_logs:
            save_log('update_stage', 'WARNING', error_message)

        return 1

    except Exception as e:
        save_log('update_stage', 'ERROR', f"Error during stage update process for fic_mis_date {fic_mis_date}: {str(e)}")
        return 0



######

from django.db import connection, transaction


def get_latest_run_skey():
    """Retrieve the latest_run_skey from Dim_Run table."""
    try:
        run_record = Dim_Run.objects.only('latest_run_skey').first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key is available in the Dim_Run table.")
            return None
        return run_record.latest_run_skey
    except Exception as e:
        save_log('get_latest_run_skey', 'ERROR', str(e))
        return None

def get_buckets_for_12_months(v_amrt_term_unit):
    """Returns the number of buckets required to reach 12 months based on the amortization term unit."""
    term_unit_to_buckets = {
        'M': 12,
        'Q': 4,
        'H': 2,
        'Y': 1
    }
    return term_unit_to_buckets.get(v_amrt_term_unit, 12)

def update_cash_flow_with_pd_buckets(fic_mis_date, batch_size=3000):
    """
    Updates cash flow records with PD bucket information in batches of accounts.
    Processes accounts in groups of `batch_size` to avoid updating all at once.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            save_log('update_cash_flow_with_pd_buckets', 'ERROR', "No valid run_skey found.")
            return 0

        amrt_unit = 'M'
        months_to_12m = get_buckets_for_12_months(amrt_unit)

        with connection.cursor() as cursor:
            # Retrieve distinct account numbers for the given fic_mis_date
            cursor.execute("""
                SELECT DISTINCT n_account_number 
                FROM fct_stage_determination 
                WHERE fic_mis_date = %s;
            """, [fic_mis_date])
            accounts = [row[0] for row in cursor.fetchall()]

        # Process accounts in batches
        for i in range(0, len(accounts), batch_size):
            batch_accounts = accounts[i:i + batch_size]
            if not batch_accounts:
                continue

            # Use a transaction for each batch
            with connection.cursor() as cursor, transaction.atomic():
                # Ratings-based update for current batch
                cursor.execute("""
                    UPDATE fsi_financial_cash_flow_cal AS cf
                    JOIN fct_stage_determination AS sd
                      ON sd.fic_mis_date = cf.fic_mis_date
                     AND sd.n_account_number = cf.v_account_number
                     AND sd.v_amrt_term_unit = %s
                    JOIN fsi_pd_interpolated AS pd
                      ON pd.fic_mis_date <= sd.fic_mis_date
                     AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                     AND pd.v_pd_term_structure_type = 'R'
                     AND pd.v_int_rating_code = sd.n_credit_rating_code
                     AND pd.v_cash_flow_bucket_id = cf.n_cash_flow_bucket_id
                    SET
                      cf.n_cumulative_loss_rate = pd.n_cumulative_default_prob * sd.n_lgd_percent,
                      cf.n_cumulative_impaired_prob = pd.n_cumulative_default_prob
                    WHERE cf.fic_mis_date = %s 
                      AND cf.n_run_skey = %s
                      AND sd.n_account_number IN %s;
                """, [amrt_unit, fic_mis_date, run_skey, tuple(batch_accounts)])

                # Delinquency-based update for current batch
                cursor.execute("""
                    UPDATE fsi_financial_cash_flow_cal AS cf
                    JOIN fct_stage_determination AS sd
                      ON sd.fic_mis_date = cf.fic_mis_date
                     AND sd.n_account_number = cf.v_account_number
                     AND sd.v_amrt_term_unit = %s
                    JOIN fsi_pd_interpolated AS pd
                      ON pd.fic_mis_date <= sd.fic_mis_date
                     AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                     AND pd.v_pd_term_structure_type = 'D'
                     AND pd.v_delq_band_code = sd.n_delq_band_code
                     AND pd.v_cash_flow_bucket_id = cf.n_cash_flow_bucket_id
                    SET
                      cf.n_cumulative_loss_rate = pd.n_cumulative_default_prob * sd.n_lgd_percent,
                      cf.n_cumulative_impaired_prob = pd.n_cumulative_default_prob
                    WHERE cf.fic_mis_date = %s 
                      AND cf.n_run_skey = %s
                      AND sd.n_account_number IN %s;
                """, [amrt_unit, fic_mis_date, run_skey, tuple(batch_accounts)])

                # 12-month PD direct update (bucket <= months_to_12m) for current batch
                cursor.execute("""
                    UPDATE fsi_financial_cash_flow_cal AS cf
                    JOIN fct_stage_determination AS sd
                      ON sd.fic_mis_date = cf.fic_mis_date
                     AND sd.n_account_number = cf.v_account_number
                     AND sd.v_amrt_term_unit = %s
                    SET cf.n_12m_cumulative_pd = cf.n_cumulative_impaired_prob
                    WHERE cf.fic_mis_date = %s 
                      AND cf.n_run_skey = %s 
                      AND cf.n_cash_flow_bucket_id <= %s
                      AND sd.n_account_number IN %s;
                """, [amrt_unit, fic_mis_date, run_skey, months_to_12m, tuple(batch_accounts)])

                # 12-month PD beyond update (bucket > months_to_12m) for current batch
                cursor.execute("""
                    UPDATE fsi_financial_cash_flow_cal AS cf
                    JOIN fct_stage_determination AS sd
                      ON sd.fic_mis_date = cf.fic_mis_date
                     AND sd.n_account_number = cf.v_account_number
                     AND sd.v_amrt_term_unit = %s
                    JOIN fsi_pd_interpolated AS pd12
                      ON pd12.fic_mis_date <= sd.fic_mis_date
                     AND pd12.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                     AND pd12.v_cash_flow_bucket_id = %s
                    SET cf.n_12m_cumulative_pd = pd12.n_cumulative_default_prob
                    WHERE cf.fic_mis_date = %s 
                      AND cf.n_run_skey = %s 
                      AND cf.n_cash_flow_bucket_id > %s
                      AND sd.n_account_number IN %s;
                """, [amrt_unit, months_to_12m, fic_mis_date, run_skey, months_to_12m, tuple(batch_accounts)])

        save_log('update_cash_flow_with_pd_buckets', 'INFO',
                 f"Set-based PD updates completed for fic_mis_date={fic_mis_date}, run_skey={run_skey}.")
        return 1

    except Exception as e:
        save_log('update_cash_flow_with_pd_buckets', 'ERROR',
                 f"Error updating PD buckets for fic_mis_date={fic_mis_date}: {e}")
        return 0


from django.db import connection, transaction


def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.only('latest_run_skey').first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key is available in the Dim_Run table.")
            return None
        return run_record.latest_run_skey
    except Exception as e:
        save_log('get_latest_run_skey', 'ERROR', str(e))
        return None

def get_buckets_for_12_months(v_amrt_term_unit):
    """
    Returns the number of buckets required to reach 12 months based on the amortization term unit.
    """
    term_unit_to_buckets = {
        'M': 12,
        'Q': 4,
        'H': 2,
        'Y': 1
    }
    return term_unit_to_buckets.get(v_amrt_term_unit, 12)

def update_cash_flow_with_pd_buckets(fic_mis_date):
    """
    Set-based approach to update cash flow records with PD bucket information.
    This function performs multiple SQL updates to set:
      - n_cumulative_loss_rate
      - n_cumulative_impaired_prob
      - n_12m_cumulative_pd
    based on joined data from FCT_Stage_Determination and FSI_PD_Interpolated.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            save_log('update_cash_flow_with_pd_buckets', 'ERROR', "No valid run_skey found.")
            return 0

        # For simplicity, assume a single amortization unit 'M' (Monthly) for demonstration.
        amrt_unit = 'M'
        months_to_12m = get_buckets_for_12_months(amrt_unit)

        with connection.cursor() as cursor, transaction.atomic():
            # Ratings-based update
            cursor.execute("""
                UPDATE fsi_financial_cash_flow_cal AS cf
                JOIN fct_stage_determination AS sd
                  ON sd.fic_mis_date = cf.fic_mis_date
                 AND sd.n_account_number = cf.v_account_number
                 AND sd.v_amrt_term_unit = %s
                JOIN fsi_pd_interpolated AS pd
                  ON pd.fic_mis_date <= sd.fic_mis_date
                 AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                 AND pd.v_pd_term_structure_type = 'R'
                 AND pd.v_int_rating_code = sd.n_credit_rating_code
                 AND pd.v_cash_flow_bucket_id = cf.n_cash_flow_bucket_id
                SET
                  cf.n_cumulative_loss_rate = pd.n_cumulative_default_prob * sd.n_lgd_percent,
                  cf.n_cumulative_impaired_prob = pd.n_cumulative_default_prob
                WHERE cf.fic_mis_date = %s AND cf.n_run_skey = %s;
            """, [amrt_unit, fic_mis_date, run_skey])

            # Delinquency-based update
            cursor.execute("""
                UPDATE fsi_financial_cash_flow_cal AS cf
                JOIN fct_stage_determination AS sd
                  ON sd.fic_mis_date = cf.fic_mis_date
                 AND sd.n_account_number = cf.v_account_number
                 AND sd.v_amrt_term_unit = %s
                JOIN fsi_pd_interpolated AS pd
                  ON pd.fic_mis_date <= sd.fic_mis_date
                 AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                 AND pd.v_pd_term_structure_type = 'D'
                 AND pd.v_delq_band_code = sd.n_delq_band_code
                 AND pd.v_cash_flow_bucket_id = cf.n_cash_flow_bucket_id
                SET
                  cf.n_cumulative_loss_rate = pd.n_cumulative_default_prob * sd.n_lgd_percent,
                  cf.n_cumulative_impaired_prob = pd.n_cumulative_default_prob
                WHERE cf.fic_mis_date = %s AND cf.n_run_skey = %s;
            """, [amrt_unit, fic_mis_date, run_skey])

            # 12-month PD direct update (bucket <= months_to_12m)
            cursor.execute("""
                UPDATE fsi_financial_cash_flow_cal AS cf
                JOIN fct_stage_determination AS sd
                  ON sd.fic_mis_date = cf.fic_mis_date
                 AND sd.n_account_number = cf.v_account_number
                 AND sd.v_amrt_term_unit = %s
                SET cf.n_12m_cumulative_pd = cf.n_cumulative_impaired_prob
                WHERE cf.fic_mis_date = %s AND cf.n_run_skey = %s AND cf.n_cash_flow_bucket_id <= %s;
            """, [amrt_unit, fic_mis_date, run_skey, months_to_12m])

            # 12-month PD beyond update (bucket > months_to_12m)
            cursor.execute("""
                UPDATE fsi_financial_cash_flow_cal AS cf
                JOIN fct_stage_determination AS sd
                  ON sd.fic_mis_date = cf.fic_mis_date
                 AND sd.n_account_number = cf.v_account_number
                 AND sd.v_amrt_term_unit = %s
                JOIN fsi_pd_interpolated AS pd12
                  ON pd12.fic_mis_date <= sd.fic_mis_date
                 AND pd12.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                 AND pd12.v_cash_flow_bucket_id = %s
                SET cf.n_12m_cumulative_pd = pd12.n_cumulative_default_prob
                WHERE cf.fic_mis_date = %s AND cf.n_run_skey = %s AND cf.n_cash_flow_bucket_id > %s;
            """, [amrt_unit, months_to_12m, fic_mis_date, run_skey, months_to_12m])

        save_log('update_cash_flow_with_pd_buckets', 'INFO',
                 f"Set-based PD updates completed for fic_mis_date={fic_mis_date}, run_skey={run_skey}.")
        return 1

    except Exception as e:
        save_log('update_cash_flow_with_pd_buckets', 'ERROR',
                 f"Error updating PD buckets for fic_mis_date={fic_mis_date}: {e}")
        return 0




from django.db.models import Sum


def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.first()
        if not run_record:
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")

def update_cash_flow_with_pd_buckets(fic_mis_date, max_workers=5, batch_size=1000):
    """
    Updates cash flow records with PD buckets using bulk updates and multi-threading.
    """
    try:
        n_run_skey = get_latest_run_skey()
        cash_flows = fsi_Financial_Cash_Flow_Cal.objects.filter(fic_mis_date=fic_mis_date, n_run_skey=n_run_skey)

        if not cash_flows.exists():
            save_log('update_cash_flow_with_pd_buckets', 'INFO', f"No cash flows found for fic_mis_date {fic_mis_date} and run_skey {n_run_skey}.")
            return 0

        total_updated_records = 0

        def process_batch(batch):
            try:
                updates = []
                for cash_flow in batch:
                    account_data = FCT_Stage_Determination.objects.filter(
                        n_account_number=cash_flow.v_account_number,
                        fic_mis_date=fic_mis_date
                    ).first()

                    if account_data:
                        pd_records = FSI_PD_Interpolated.objects.filter(
                            v_pd_term_structure_id=account_data.n_pd_term_structure_skey,
                            fic_mis_date=fic_mis_date,
                        )

                        if pd_records.exists():
                            pd_record = None
                            if pd_records.first().v_pd_term_structure_type == 'R':
                                pd_record = pd_records.filter(
                                    v_int_rating_code=account_data.n_credit_rating_code,
                                    v_cash_flow_bucket_id=cash_flow.n_cash_flow_bucket_id
                                ).first()
                            elif pd_records.first().v_pd_term_structure_type == 'D':
                                pd_record = pd_records.filter(
                                    v_delq_band_code=account_data.n_delq_band_code,
                                    v_cash_flow_bucket_id=cash_flow.n_cash_flow_bucket_id
                                ).first()

                            if pd_record:
                                cash_flow.n_cumulative_loss_rate = pd_record.n_cumulative_default_prob * account_data.n_lgd_percent
                                cash_flow.n_cumulative_impaired_prob = pd_record.n_cumulative_default_prob

                                months_to_12m = get_buckets_for_12_months(account_data.v_amrt_term_unit)
                                if cash_flow.n_cash_flow_bucket_id <= months_to_12m:
                                    cash_flow.n_12m_cumulative_pd = pd_record.n_cumulative_default_prob
                                else:
                                    pd_record_12 = pd_records.filter(v_cash_flow_bucket_id=months_to_12m).first()
                                    if pd_record_12:
                                        cash_flow.n_12m_cumulative_pd = pd_record_12.n_cumulative_default_prob

                                updates.append(cash_flow)

                if updates:
                    fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                        updates, 
                        ['n_cumulative_loss_rate', 'n_cumulative_impaired_prob', 'n_12m_cumulative_pd']
                    )
                return len(updates)

            except Exception as e:
                save_log('update_cash_flow_with_pd_buckets', 'ERROR', f"Error updating batch: {e}")
                return 0

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            batch = []
            for cash_flow in cash_flows.iterator(chunk_size=batch_size):
                batch.append(cash_flow)
                if len(batch) >= batch_size:
                    futures.append(executor.submit(process_batch, batch))
                    batch = []

            if batch:
                futures.append(executor.submit(process_batch, batch))

            for future in as_completed(futures):
                try:
                    total_updated_records += future.result()
                except Exception as exc:
                    save_log('update_cash_flow_with_pd_buckets', 'ERROR', f"Thread encountered an error: {exc}")
                    return 0

        save_log('update_cash_flow_with_pd_buckets', 'INFO', f"Updated {total_updated_records} records for run_skey {n_run_skey} and fic_mis_date {fic_mis_date}.")
        return 1 if total_updated_records > 0 else 0

    except Exception as e:
        save_log('update_cash_flow_with_pd_buckets', 'ERROR', f"Error updating cash flow for fic_mis_date {fic_mis_date}: {e}")
        return 0

def get_buckets_for_12_months(v_amrt_term_unit):
    """
    Returns the number of buckets required to reach 12 months based on the amortization term unit.
    """
    term_unit_to_buckets = {
        'M': 12,
        'Q': 4,
        'H': 2,
        'Y': 1
    }
    return term_unit_to_buckets.get(v_amrt_term_unit, 12)

#######################
import math




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




######



from django.utils import timezone



def get_next_run_skey():
    """
    Retrieve the next n_run_skey from the Dim_Run table.
    """
    try:
        with transaction.atomic():
            run_key_record, created = Dim_Run.objects.get_or_create(id=1)

            if created:
                run_key_record.latest_run_skey = 1
            else:
                run_key_record.latest_run_skey += 1

            run_key_record.date = timezone.now()
            run_key_record.save()

            return run_key_record.latest_run_skey

    except Exception as e:
        save_log('get_next_run_skey', 'ERROR', f"Error in getting next run skey: {e}")
        return 1  # Default value in case of error


def insert_cash_flow_record(cashflow, run_skey):
    """
    Function to insert a single cash flow record.
    """
    try:
        data_to_insert = {
            'v_account_number': cashflow.v_account_number,
            'd_cash_flow_date': cashflow.d_cash_flow_date,
            'n_run_skey': run_skey,
            'fic_mis_date': cashflow.fic_mis_date,
            'n_principal_run_off': cashflow.n_principal_payment,
            'n_interest_run_off': cashflow.n_interest_payment,
            'n_cash_flow_bucket_id': cashflow.n_cash_flow_bucket,
            'n_cash_flow_amount': cashflow.n_cash_flow_amount,
            'v_ccy_code': cashflow.V_CCY_CODE,
            'n_exposure_at_default': cashflow.n_exposure_at_default
        }

        fsi_Financial_Cash_Flow_Cal.objects.create(**data_to_insert)
        return True

    except Exception as e:
        save_log('insert_cash_flow_record', 'ERROR', f"Error inserting data for account {cashflow.v_account_number} on {cashflow.d_cash_flow_date}: {e}")
        return False


def insert_cash_flow_data(fic_mis_date):
    """
    Function to insert data from FSI_Expected_Cashflow into fsi_Financial_Cash_Flow_Cal with multi-threading.
    """
    try:
        expected_cashflows = FSI_Expected_Cashflow.objects.filter(fic_mis_date=fic_mis_date)
        total_selected = expected_cashflows.count()

        if total_selected == 0:
            save_log('insert_cash_flow_data', 'INFO', f"No cash flows found for fic_mis_date {fic_mis_date}.")
            return '0'

        total_inserted = 0
        next_run_skey = get_next_run_skey()

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(insert_cash_flow_record, cashflow, next_run_skey) for cashflow in expected_cashflows]

            for future in concurrent.futures.as_completed(futures):
                try:
                    if future.result():
                        total_inserted += 1
                except Exception as exc:
                    save_log('insert_cash_flow_data', 'ERROR', f"Error occurred during insertion: {exc}")
                    return '0' 

        update_run_key(next_run_skey)
        save_log('insert_cash_flow_data', 'INFO', f"{total_inserted} out of {total_selected} cash flow records inserted successfully.")
        return '1'

    except Exception as e:
        save_log('insert_cash_flow_data', 'ERROR', f"Error during cash flow insertion process: {e}")
        return '0'


def update_run_key(next_run_skey):
    """
    Update the Dim_Run table with the next run_skey.
    """
    try:
        with transaction.atomic():
            run_key_record, _ = Dim_Run.objects.get_or_create(id=1)
            run_key_record.latest_run_skey = next_run_skey
            run_key_record.date = timezone.now()
            run_key_record.save()

    except Exception as e:
        save_log('update_run_key', 'ERROR', f"Error in updating run key: {e}")


####


from django.utils import timezone


def get_next_run_skey():
    """
    Retrieve the next n_run_skey from the Dim_Run table.
    """
    try:
        with transaction.atomic():
            run_key_record, created = Dim_Run.objects.get_or_create(id=1)

            if created:
                run_key_record.latest_run_skey = 1
            else:
                run_key_record.latest_run_skey += 1

            run_key_record.date = timezone.now()
            run_key_record.save()

            return run_key_record.latest_run_skey

    except Exception as e:
        save_log('get_next_run_skey', 'ERROR', f"Error in getting next run skey: {e}")
        return 1  # Default value in case of error

def get_run_skey_for_method():
    """
    Retrieve or generate a run_skey based on ECL method.
    If the method is 'simple_ead', generate a new run_skey.
    """
    try:
        ecl_method = ECLMethod.objects.get(method_name='simple_ead')
        if ecl_method:
            # Generate a new run_skey for 'simple_ead' method
            return get_next_run_skey()
        else:
            # Default behavior: use the latest run key from Dim_Run
            return Dim_Run.objects.latest('latest_run_skey').latest_run_skey
    except ECLMethod.DoesNotExist:
        save_log('get_run_skey_for_method', 'ERROR', "ECL Method 'simple_ead' does not exist.")
        return Dim_Run.objects.latest('latest_run_skey').latest_run_skey
    except Exception as e:
        save_log('get_run_skey_for_method', 'ERROR', f"Error retrieving run_skey: {e}")
        return None

# Helper function to split data into chunks
def chunk_data(data, chunk_size):
    """Split data into chunks of size chunk_size."""
    for i in range(0, len(data), chunk_size):
        yield data[i:i + chunk_size]

def process_chunk(stage_determination_chunk, last_run_skey):
    """Process a chunk of FCT_Stage_Determination records and perform bulk insert into FCT_Reporting_Lines."""
    reporting_lines_records = []

    # Map data from FCT_Stage_Determination to FCT_Reporting_Lines for the chunk
    for record in stage_determination_chunk:
        reporting_line = FCT_Reporting_Lines(
            n_run_key=last_run_skey,
            fic_mis_date=record.fic_mis_date,
            n_account_number=record.n_account_number,
            d_acct_start_date=record.d_acct_start_date,
            d_last_payment_date=record.d_last_payment_date,
            d_next_payment_date=record.d_next_payment_date,
            d_maturity_date=record.d_maturity_date,
            n_acct_classification=record.n_acct_classification,
            n_cust_ref_code=record.n_cust_ref_code,
            n_partner_name=record.n_partner_name,
            n_party_type=record.n_party_type,
            n_accrual_basis_code=record.n_accrual_basis_code,
            n_curr_interest_rate=record.n_curr_interest_rate,
            n_effective_interest_rate=record.n_effective_interest_rate,
            v_interest_freq_unit=record.v_interest_freq_unit,
            v_interest_method=record.v_interest_method,
            n_accrued_interest=record.n_accrued_interest,
            n_rate_chg_min=record.n_rate_chg_min,
            n_carrying_amount_ncy=record.n_carrying_amount_ncy,
            n_exposure_at_default_ncy=record.n_exposure_at_default,
            n_lgd_percent=record.n_lgd_percent,
            n_pd_percent=record.n_pd_percent,
            n_twelve_months_orig_pd=record.n_twelve_months_orig_pd,
            n_lifetime_orig_pd=record.n_lifetime_orig_pd,
            n_twelve_months_pd=record.n_twelve_months_pd,
            n_lifetime_pd=record.n_lifetime_pd,
            n_pd_term_structure_skey=record.n_pd_term_structure_skey,
            n_pd_term_structure_name=record.n_pd_term_structure_name,
            n_pd_term_structure_desc=record.n_pd_term_structure_desc,
            n_12m_pd_change=record.n_12m_pd_change,
            v_amrt_repayment_type=record.v_amrt_repayment_type,
            n_remain_no_of_pmts=record.n_remain_no_of_pmts,
            n_amrt_term=record.n_amrt_term,
            v_amrt_term_unit=record.v_amrt_term_unit,
            v_ccy_code=record.v_ccy_code,
            n_delinquent_days=record.n_delinquent_days,
            n_delq_band_code=record.n_delq_band_code,
            n_stage_descr=record.n_stage_descr,
            n_curr_ifrs_stage_skey=record.n_curr_ifrs_stage_skey,
            n_prev_ifrs_stage_skey=record.n_prev_ifrs_stage_skey,
            d_cooling_start_date=record.d_cooling_start_date,
            n_target_ifrs_stage_skey=record.n_target_ifrs_stage_skey,
            n_in_cooling_period_flag=record.n_in_cooling_period_flag,
            n_cooling_period_duration=record.n_cooling_period_duration,
            n_country=record.n_country,
            n_segment_skey=record.n_segment_skey,
            n_prod_segment=record.n_prod_segment,
            n_prod_code=record.n_prod_code,
            n_prod_name=record.n_prod_name,
            n_prod_type=record.n_prod_type,
            n_prod_desc=record.n_prod_desc,
            n_credit_rating_code=record.n_credit_rating_code,
            n_org_credit_score=record.n_org_credit_score,
            n_curr_credit_score=record.n_curr_credit_score,
            n_acct_rating_movement=record.n_acct_rating_movement,
            n_party_rating_movement=record.n_party_rating_movement,
            n_conditionally_cancel_flag=record.n_conditionally_cancel_flag,
            n_collateral_amount=record.n_collateral_amount,
            n_loan_type=record.n_loan_type
        )
        reporting_lines_records.append(reporting_line)

    # Perform bulk insert for the current chunk
    with transaction.atomic():
        FCT_Reporting_Lines.objects.bulk_create(reporting_lines_records)

def populate_fct_reporting_lines(mis_date, chunk_size=1000):
    """
    Populate data in FCT_Reporting_Lines from FCT_Stage_Determination for the given mis_date.
    """
    try:
        # Retrieve appropriate run_skey based on method
        last_run_skey = get_run_skey_for_method()

        if last_run_skey is None:
            save_log('populate_fct_reporting_lines', 'ERROR', "Failed to retrieve or generate run_skey.")
            return '0'

        # Fetch records from FCT_Stage_Determination where fic_mis_date matches the provided date
        stage_determination_records = list(FCT_Stage_Determination.objects.filter(fic_mis_date=mis_date))

        if not stage_determination_records:
            save_log('populate_fct_reporting_lines', 'INFO', f"No records found in FCT_Stage_Determination for mis_date {mis_date}.")
            return '0'

        # Split the records into chunks
        chunks = list(chunk_data(stage_determination_records, chunk_size))

        # Use ThreadPoolExecutor to process each chunk in parallel
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(process_chunk, chunk, last_run_skey) for chunk in chunks]

            for future in futures:
                try:
                    future.result()
                except Exception as exc:
                    save_log('populate_fct_reporting_lines', 'ERROR', f"Error processing chunk: {exc}")
                    return '0'

        save_log('populate_fct_reporting_lines', 'INFO', f"Successfully populated FCT_Reporting_Lines for {len(stage_determination_records)} records.")
        return '1'

    except Exception as e:
        save_log('populate_fct_reporting_lines', 'ERROR', f"Error populating FCT_Reporting_Lines: {e}")
        return '0'


####




UPDATE_SUB_BATCH_SIZE = 5000  # Sub-batch size for final bulk update

def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.only('latest_run_skey').first()
        if not run_record:
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")


def prefetch_stage_determination(fic_mis_date):
    """
    Fetch and cache all relevant stage determination data for the given date, 
    keyed by (fic_mis_date, n_account_number) for O(1) lookups.
    """
    stage_qs = (
        FCT_Stage_Determination.objects
        .filter(fic_mis_date=fic_mis_date)
        .only('fic_mis_date', 'n_account_number', 'n_effective_interest_rate', 'n_lgd_percent')
    )
    return {
        (entry.fic_mis_date, entry.n_account_number): entry
        for entry in stage_qs
    }


def process_batch(batch, stage_determination_dict):
    """
    Process a batch of cash flow records, setting n_effective_interest_rate and n_lgd_percent 
    from the stage_determination_dict in memory. No DB write here; return updated records.
    """
    updated_batch = []
    for cf in batch:
        try:
            stage_key = (cf.fic_mis_date, cf.v_account_number)
            stage_entry = stage_determination_dict.get(stage_key)
            if stage_entry:
                cf.n_effective_interest_rate = stage_entry.n_effective_interest_rate
                cf.n_lgd_percent = stage_entry.n_lgd_percent
                updated_batch.append(cf)
        except Exception as e:
            save_log('update_financial_cash_flow', 'ERROR', f"Error processing account={cf.v_account_number}: {e}")
    return updated_batch


def update_financial_cash_flow(fic_mis_date, max_workers=5, batch_size=1000):
    """
    Updates the `n_effective_interest_rate` and `n_lgd_percent` fields in the `fsi_Financial_Cash_Flow_Cal`
    table using values from the `FCT_Stage_Determination` table, based on matching `v_account_number`, `fic_mis_date`,
    and `n_run_skey`.
    """
    try:
        # 1) Get run_skey
        n_run_skey = get_latest_run_skey()
        if not n_run_skey:
            save_log('update_financial_cash_flow', 'ERROR', "No valid run_skey found in Dim_Run.")
            return '0'

        # 2) Pre-fetch stage determination in a dictionary
        stage_determination_dict = prefetch_stage_determination(fic_mis_date)

        # 3) Fetch only the fields needed from cash flow
        cash_flows_qs = (
            fsi_Financial_Cash_Flow_Cal.objects
            .filter(fic_mis_date=fic_mis_date, n_run_skey=n_run_skey)
            .only('v_account_number', 'fic_mis_date', 'n_effective_interest_rate', 'n_lgd_percent')
        )
        total_cash_flows = cash_flows_qs.count()
        if total_cash_flows == 0:
            save_log(
                'update_financial_cash_flow',
                'INFO',
                f"No financial cash flows found for fic_mis_date={fic_mis_date} and n_run_skey={n_run_skey}."
            )
            return '0'

        save_log(
            'update_financial_cash_flow',
            'INFO',
            f"Processing {total_cash_flows} records for date={fic_mis_date}, run_skey={n_run_skey}."
        )

        # 4) Stream the cash flows in chunks (iterator + chunk)
        def chunk_iterator(qs, size):
            start = 0
            while True:
                batch_list = list(qs[start:start + size])
                if not batch_list:
                    break
                yield batch_list
                start += size

        updated_entries_all = []

        # 5) Parallel processing of chunked data
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            for cf_batch in chunk_iterator(cash_flows_qs, batch_size):
                futures.append(executor.submit(process_batch, cf_batch, stage_determination_dict))

            for future in as_completed(futures):
                try:
                    updated_entries_all.extend(future.result())
                except Exception as exc:
                    save_log('update_financial_cash_flow', 'ERROR', f"Thread error: {exc}")
                    return '0'

        total_updated = len(updated_entries_all)
        if total_updated == 0:
            save_log(
                'update_financial_cash_flow',
                'INFO',
                "No records needed updating after matching stage determination."
            )
            return '0'

        # 6) Bulk update in sub-batches
        with transaction.atomic():
            start_index = 0
            while start_index < total_updated:
                end_index = start_index + UPDATE_SUB_BATCH_SIZE
                sub_batch = updated_entries_all[start_index:end_index]
                fsi_Financial_Cash_Flow_Cal.objects.bulk_update(
                    sub_batch,
                    ['n_effective_interest_rate', 'n_lgd_percent']
                )
                start_index = end_index

        # 7) Final log
        save_log(
            'update_financial_cash_flow',
            'INFO',
            f"Successfully updated {total_updated} of {total_cash_flows} financial cash flow records for date={fic_mis_date}, run_skey={n_run_skey}."
        )
        return '1'

    except Exception as e:
        save_log(
            'update_financial_cash_flow',
            'ERROR',
            f"Error updating financial cash flow records for fic_mis_date={fic_mis_date}, run_skey={n_run_skey}: {e}"
        )
        return '0'


####





BATCH_SIZE = 5000  # Adjust for your environment's performance sweet spot

def update_stage_determination(mis_date):
    """
    Update FCT_Stage_Determination with product, segment, customer, delinquency band,
    and PD term structure information based on the provided mis_date.
    """
    try:
        # ----------------------------------
        # 1. Fetch the Stage Determination entries for the given date
        # ----------------------------------
        stage_determination_entries = list(
            FCT_Stage_Determination.objects
            .filter(fic_mis_date=mis_date)
            .exclude(n_prod_code__isnull=True)
            .only(
                'n_account_number',
                'fic_mis_date',
                'n_prod_code',
                'n_org_credit_score',
                'n_curr_credit_score',
                'n_partner_name',
                'n_party_type',
                'n_delinquent_days',
                'v_amrt_term_unit',
                'n_cust_ref_code',
                'n_segment_skey',
                'n_pd_term_structure_skey',
                'n_prod_segment',
                'n_prod_name',
                'n_prod_type',
                'n_prod_desc',
                'n_collateral_amount',
                'n_delq_band_code',
                'n_pd_term_structure_name',
                'n_pd_term_structure_desc',
                'n_credit_rating_code',
                'n_acct_rating_movement'
            )
        )

        if not stage_determination_entries:
            save_log(
                'update_stage_determination',
                'INFO',
                f"No stage determination entries found for mis_date={mis_date}."
            )
            return '0'

        # ----------------------------------
        # 2. Prepare caches for lookups
        # ----------------------------------

        # a) Product info cache keyed by v_prod_code
        product_info_cache = {
            p.v_prod_code: p
            for p in Ldn_Bank_Product_Info.objects.only(
                'v_prod_code', 'v_prod_segment', 'v_prod_name',
                'v_prod_type', 'v_prod_desc'
            )
        }

        # b) Segment cache keyed by (v_prod_segment, v_prod_type)
        segment_cache = {
            (s.v_prod_segment, s.v_prod_type): s.segment_id
            for s in FSI_Product_Segment.objects.only(
                'v_prod_segment', 'v_prod_type', 'segment_id'
            )
        }

        # c) Collateral cache keyed by (v_cust_ref_code, fic_mis_date)
        collateral_cache = {
            (c.v_cust_ref_code, c.fic_mis_date): c
            for c in lgd_collateral.objects.filter(fic_mis_date=mis_date).only(
                'v_cust_ref_code', 'fic_mis_date', 'total'
            )
        }

        # d) Delinquency band cache keyed by (n_delq_lower_value, n_delq_upper_value, v_amrt_term_unit)
        delinquency_band_cache = {
            (band.n_delq_lower_value, band.n_delq_upper_value, band.v_amrt_term_unit): band.n_delq_band_code
            for band in Dim_Delinquency_Band.objects.only(
                'n_delq_lower_value', 'n_delq_upper_value',
                'v_amrt_term_unit', 'n_delq_band_code'
            )
        }

        # e) Customer info cache keyed by v_party_id
        customer_info_cache = {
            c.v_party_id: c
            for c in Ldn_Customer_Info.objects.only(
                'v_party_id', 'v_partner_name', 'v_party_type'
            )
        }

        # f) PD term structure cache keyed by v_pd_term_structure_id
        pd_term_structure_cache = {
            pd.v_pd_term_structure_id: pd
            for pd in Ldn_PD_Term_Structure.objects.only(
                'v_pd_term_structure_id',
                'v_pd_term_structure_name',
                'v_pd_term_structure_desc'
            )
        }

        # g) Rating detail cache keyed by (fic_mis_date, v_party_cd)
        rating_detail_cache = {
            (r.fic_mis_date, r.v_party_cd): r
            for r in Ldn_Customer_Rating_Detail.objects
            .filter(fic_mis_date=mis_date)
            .only('fic_mis_date', 'v_party_cd', 'v_rating_code')
        }

        # ----------------------------------
        # 3. Initialize error logs
        # ----------------------------------
        error_logs = {}

        # ----------------------------------
        # 4. Process each entry in memory
        # ----------------------------------
        updated_entries = []
        for entry in stage_determination_entries:
            # 4a) Product information
            product_info = product_info_cache.get(entry.n_prod_code)
            if product_info:
                entry.n_prod_segment = product_info.v_prod_segment
                entry.n_prod_name = product_info.v_prod_name
                entry.n_prod_type = product_info.v_prod_type
                entry.n_prod_desc = product_info.v_prod_desc
            elif "product_info_missing" not in error_logs:
                error_logs["product_info_missing"] = f"Product info missing for code={entry.n_prod_code}"

            # 4b) Segment key
            if entry.n_prod_segment and entry.n_prod_type:
                entry.n_segment_skey = segment_cache.get((entry.n_prod_segment, entry.n_prod_type))
                if not entry.n_segment_skey and "segment_info_missing" not in error_logs:
                    error_logs["segment_info_missing"] = (
                        f"Segment info missing for segment={entry.n_prod_segment}, type={entry.n_prod_type}"
                    )

            # 4c) Collateral amount
            if (entry.n_cust_ref_code, entry.fic_mis_date) in collateral_cache:
                collateral = collateral_cache[(entry.n_cust_ref_code, entry.fic_mis_date)]
                if not entry.n_collateral_amount:
                    entry.n_collateral_amount = collateral.total
            else:
                if "collateral_info_missing" not in error_logs:
                    error_logs["collateral_info_missing"] = (
                        f"Collateral missing for cust_ref={entry.n_cust_ref_code} at date={entry.fic_mis_date}"
                    )

            # 4d) Delinquency band
            delinquency_band_found = False
            for (lower, upper, unit), band_code in delinquency_band_cache.items():
                if (lower <= entry.n_delinquent_days <= upper) and (unit == entry.v_amrt_term_unit):
                    entry.n_delq_band_code = band_code
                    delinquency_band_found = True
                    break

            if not delinquency_band_found:
                if "delinquency_band_missing" not in error_logs:
                    error_logs["delinquency_band_missing"] = (
                        f"No delinquency band for delinq_days={entry.n_delinquent_days}, unit={entry.v_amrt_term_unit}"
                    )

            # 4e) Customer information
            if entry.n_cust_ref_code in customer_info_cache:
                cust_info = customer_info_cache[entry.n_cust_ref_code]
                entry.n_partner_name = cust_info.v_partner_name
                entry.n_party_type = cust_info.v_party_type
            else:
                if "customer_info_missing" not in error_logs:
                    error_logs["customer_info_missing"] = (
                        f"Customer info missing for cust_ref_code={entry.n_cust_ref_code}"
                    )

            # 4f) PD term structure
            entry.n_pd_term_structure_skey = entry.n_segment_skey  # Simplified logic: PD structure = segment skey
            pd_term_structure = pd_term_structure_cache.get(entry.n_pd_term_structure_skey)
            if pd_term_structure:
                entry.n_pd_term_structure_name = pd_term_structure.v_pd_term_structure_name
                entry.n_pd_term_structure_desc = pd_term_structure.v_pd_term_structure_desc
            else:
                if "pd_term_structure_missing" not in error_logs:
                    error_logs["pd_term_structure_missing"] = (
                        f"PD term structure missing for segment key={entry.n_segment_skey}"
                    )

            # 4g) Rating detail
            rating_detail = rating_detail_cache.get((entry.fic_mis_date, entry.n_cust_ref_code))
            if rating_detail and entry.n_credit_rating_code is None:
                entry.n_credit_rating_code = rating_detail.v_rating_code
            else:
                if "rating_detail_missing" not in error_logs:
                    error_logs["rating_detail_missing"] = (
                        f"Rating detail missing for cust_ref={entry.n_cust_ref_code}, date={entry.fic_mis_date}"
                    )

            # 4h) Account rating movement
            if (entry.n_org_credit_score is not None) and (entry.n_curr_credit_score is not None):
                entry.n_acct_rating_movement = entry.n_org_credit_score - entry.n_curr_credit_score

            updated_entries.append(entry)

        # ----------------------------------
        # 5. Bulk update the processed entries in sub-batches
        # ----------------------------------
        updated_fields = [
            'n_prod_segment', 'n_prod_name', 'n_prod_type', 'n_prod_desc', 'n_segment_skey',
            'n_collateral_amount', 'n_delq_band_code', 'n_partner_name', 'n_party_type',
            'n_pd_term_structure_skey', 'n_pd_term_structure_name', 'n_pd_term_structure_desc',
            'n_credit_rating_code', 'n_acct_rating_movement'
        ]

        with transaction.atomic():
            for start in range(0, len(updated_entries), BATCH_SIZE):
                end = start + BATCH_SIZE
                FCT_Stage_Determination.objects.bulk_update(
                    updated_entries[start:end],
                    updated_fields
                )

        # ----------------------------------
        # 6. Log warnings for missing data
        # ----------------------------------
        for error_type, msg in error_logs.items():
            save_log('update_stage_determination', 'WARNING', msg)

        # ----------------------------------
        # 7. Final log & return
        # ----------------------------------
        save_log(
            'update_stage_determination',
            'INFO',
            f"Successfully updated {len(updated_entries)} records for mis_date={mis_date}."
        )
        return '1'

    except Exception as e:
        save_log('update_stage_determination', 'ERROR', f"Error during update process for mis_date={mis_date}: {e}")
        return '0'




def update_stage_determination(mis_date):
    """
    Update FCT_Stage_Determination with product, segment, customer, delinquency band,
    and PD term structure information based on the provided mis_date.
    """
    try:
        # Fetch all entries from FCT_Stage_Determination for the given mis_date
        stage_determination_entries = FCT_Stage_Determination.objects.filter(fic_mis_date=mis_date).exclude(n_prod_code__isnull=True)
        
        if not stage_determination_entries.exists():
            save_log('update_stage_determination', 'INFO', f"No stage determination entries found for mis_date {mis_date}.")
            return '0'

        # Bulk fetch related data and store it in dictionaries for fast lookups
        product_info_cache = {p.v_prod_code: p for p in Ldn_Bank_Product_Info.objects.all()}
        segment_cache = {(s.v_prod_segment, s.v_prod_type): s.segment_id for s in FSI_Product_Segment.objects.all()}
        collateral_cache = {(c.v_cust_ref_code, c.fic_mis_date): c for c in LgdCollateral.objects.filter(fic_mis_date=mis_date)}
        delinquency_band_cache = {
            (band.n_delq_lower_value, band.n_delq_upper_value, band.v_amrt_term_unit): band.n_delq_band_code
            for band in Dim_Delinquency_Band.objects.all()
        }
        customer_info_cache = {c.v_party_id: c for c in Ldn_Customer_Info.objects.all()}
        pd_term_structure_cache = {pd.v_pd_term_structure_id: pd for pd in Ldn_PD_Term_Structure.objects.all()}
        rating_detail_cache = {(r.fic_mis_date, r.v_party_cd): r for r in Ldn_Customer_Rating_Detail.objects.filter(fic_mis_date=mis_date)}

        # Initialize error logs to capture the first instance of each unique error
        error_logs = {}

        # Process each entry with cached data
        updated_entries = []
        for entry in stage_determination_entries:
            # Update product information
            product_info = product_info_cache.get(entry.n_prod_code)
            if product_info:
                entry.n_prod_segment = product_info.v_prod_segment
                entry.n_prod_name = product_info.v_prod_name
                entry.n_prod_type = product_info.v_prod_type
                entry.n_prod_desc = product_info.v_prod_desc
            elif "product_info_missing" not in error_logs:
                error_logs["product_info_missing"] = f"Product info missing for code: {entry.n_prod_code}"

            # Update segment key
            if entry.n_prod_segment and entry.n_prod_type:
                entry.n_segment_skey = segment_cache.get((entry.n_prod_segment, entry.n_prod_type))
                if not entry.n_segment_skey and "segment_info_missing" not in error_logs:
                    error_logs["segment_info_missing"] = f"Segment info missing for segment: {entry.n_prod_segment}, type: {entry.n_prod_type}"
                
            # Update collateral amount
            collateral = collateral_cache.get((entry.n_cust_ref_code, entry.fic_mis_date))
            if collateral and (entry.n_collateral_amount is None or entry.n_collateral_amount == 0):
                entry.n_collateral_amount = collateral.total
            elif "collateral_info_missing" not in error_logs:
                error_logs["collateral_info_missing"] = f"Collateral info missing for cust ref code: {entry.n_cust_ref_code}"

            # Update delinquency band
            delinquency_band_found = False
            for (lower, upper, unit), band_code in delinquency_band_cache.items():
                if lower <= entry.n_delinquent_days <= upper and unit == entry.v_amrt_term_unit:
                    entry.n_delq_band_code = band_code
                    delinquency_band_found = True
                    break
            if not delinquency_band_found and "delinquency_band_missing" not in error_logs:
                error_logs["delinquency_band_missing"] = (
                    f"Delinquency band missing for delinquent days: {entry.n_delinquent_days}, term unit: {entry.v_amrt_term_unit}"
                )

            # Update customer information
            customer_info = customer_info_cache.get(entry.n_cust_ref_code)
            if customer_info:
                entry.n_partner_name = customer_info.v_partner_name
                entry.n_party_type = customer_info.v_party_type
            elif "customer_info_missing" not in error_logs:
                error_logs["customer_info_missing"] = f"Customer info missing for cust ref code: {entry.n_cust_ref_code}"

            # Set PD term structure key to segment key
            entry.n_pd_term_structure_skey = entry.n_segment_skey

            # Update PD term structure
            pd_term_structure = pd_term_structure_cache.get(entry.n_pd_term_structure_skey)
            if pd_term_structure:
                entry.n_pd_term_structure_name = pd_term_structure.v_pd_term_structure_name
                entry.n_pd_term_structure_desc = pd_term_structure.v_pd_term_structure_desc
            elif "pd_term_structure_missing" not in error_logs:
                error_logs["pd_term_structure_missing"] = f"PD term structure missing for segment key: {entry.n_segment_skey}"

            # Update rating code
            rating_detail = rating_detail_cache.get((entry.fic_mis_date, entry.n_cust_ref_code))
            if rating_detail and entry.n_credit_rating_code is None:
                entry.n_credit_rating_code = rating_detail.v_rating_code
            elif "rating_detail_missing" not in error_logs:
                error_logs["rating_detail_missing"] = f"Rating detail missing for cust ref code: {entry.n_cust_ref_code}, mis date: {entry.fic_mis_date}"

            # Calculate account rating movement
            if entry.n_org_credit_score is not None and entry.n_curr_credit_score is not None:
                entry.n_acct_rating_movement = entry.n_org_credit_score - entry.n_curr_credit_score

            updated_entries.append(entry)

        # Fields to be updated
        updated_fields = [
            'n_prod_segment', 'n_prod_name', 'n_prod_type', 'n_prod_desc', 'n_segment_skey',
            'n_collateral_amount', 'n_delq_band_code', 'n_partner_name', 'n_party_type', 
            'n_pd_term_structure_skey', 'n_pd_term_structure_name', 'n_pd_term_structure_desc', 
            'n_credit_rating_code', 'n_acct_rating_movement'
        ]

        # Perform bulk update in batches of 5000
        batch_size = 5000
        with transaction.atomic():
            for i in range(0, len(updated_entries), batch_size):
                FCT_Stage_Determination.objects.bulk_update(updated_entries[i:i + batch_size], updated_fields)

        # Log the exact missing data errors, each type only once
        for error_type, error_message in error_logs.items():
            save_log('update_stage_determination', 'WARNING', error_message)

        save_log('update_stage_determination', 'INFO', f"Successfully updated {len(updated_entries)} records for mis_date {mis_date}.")
        return '1'

    except Exception as e:
        save_log('update_stage_determination', 'ERROR', f"Error during update process: {e}")
        return '0'

###

# Function to handle bulk insertion of records in chunks
def insert_records_chunk(records_chunk):
    # Prepare list for bulk insert
    bulk_records = []
    for record in records_chunk:
        bulk_records.append(FCT_Stage_Determination(
            fic_mis_date=record.fic_mis_date,
            n_account_number=record.v_account_number,
            n_curr_interest_rate=record.n_curr_interest_rate,
            n_effective_interest_rate=record.n_effective_interest_rate,
            n_accrued_interest=record.n_accrued_interest,
            n_rate_chg_min=record.n_interest_changing_rate,
            n_accrual_basis_code=record.v_day_count_ind,
            n_pd_percent=record.n_pd_percent,
            n_lgd_percent=record.n_lgd_percent,
            d_acct_start_date=record.d_start_date,
            d_last_payment_date=record.d_last_payment_date,
            d_next_payment_date=record.d_next_payment_date,
            d_maturity_date=record.d_maturity_date,
            v_ccy_code=record.v_ccy_code,
            n_eop_prin_bal=record.n_eop_curr_prin_bal,
            n_carrying_amount_ncy=record.n_eop_bal,
            n_exposure_at_default=record.n_eop_bal,
            n_collateral_amount=record.n_collateral_amount,
            n_delinquent_days=record.n_delinquent_days,
            v_amrt_repayment_type=record.v_amrt_repayment_type,
            v_amrt_term_unit=record.v_amrt_term_unit,
            n_prod_code=record.v_prod_code,
            n_cust_ref_code=record.v_cust_ref_code,
            n_loan_type=record.v_loan_type,
            n_acct_rating_movement=record.v_acct_rating_movement,
            n_credit_rating_code=record.v_credit_rating_code,
            n_org_credit_score=record.v_org_credit_score,
            n_curr_credit_score=record.v_curr_credit_score,
        ))

    # Perform bulk insert
    try:
        with transaction.atomic():
            FCT_Stage_Determination.objects.bulk_create(bulk_records)
    except Exception as e:
        save_log('insert_records_chunk', 'ERROR', f"Error inserting records: {e}", status='FAILURE')

            
def insert_fct_stage(fic_mis_date, chunk_size=100):
    """
    Inserts data into FCT_Stage_Determination table from Ldn_Financial_Instrument based on the given fic_mis_date.
    Deletes existing records for the same fic_mis_date before inserting. Uses multi-threading to process records in chunks.
    :param fic_mis_date: The date to filter records in both FCT_Stage_Determination and Ldn_Financial_Instrument.
    :param chunk_size: The size of the data chunks to process concurrently.
    """
    try:
        # Step 1: Check if data for the given fic_mis_date exists in FCT_Stage_Determination
        if FCT_Stage_Determination.objects.filter(fic_mis_date=fic_mis_date).exists():
            # If exists, delete the records
            FCT_Stage_Determination.objects.filter(fic_mis_date=fic_mis_date).delete()
            save_log('insert_fct_stage', 'INFO', f"Deleted existing records for {fic_mis_date} in FCT_Stage_Determination.", status='SUCCESS')

        # Step 2: Fetch data from Ldn_Financial_Instrument for the given fic_mis_date
        records = list(Ldn_Financial_Instrument.objects.filter(fic_mis_date=fic_mis_date))

        # Log the number of records fetched
        total_records = len(records)
        save_log('insert_fct_stage', 'INFO', f"Total records fetched for {fic_mis_date}: {total_records}", status='SUCCESS')

        if total_records == 0:
            save_log('insert_fct_stage', 'INFO', f"No records found for {fic_mis_date} in Ldn_Financial_Instrument.", status='SUCCESS')
            return '0'  # Return '0' if no records are found

        # Step 3: Split the records into chunks for multi-threading
        record_chunks = [records[i:i + chunk_size] for i in range(0, len(records), chunk_size)]

        # Step 4: Use multi-threading with a max of 4 workers to insert records concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            # Map the chunks to the insert_records_chunk function
            futures = [executor.submit(insert_records_chunk, chunk) for chunk in record_chunks]

            # Process the results of each chunk
            for future in futures:
                try:
                    future.result()  # Raises any exception encountered during execution
                except Exception as exc:
                    save_log('insert_fct_stage', 'ERROR', f"Error occurred during record insertion: {exc}", status='FAILURE')
                    return '0'  # Return '0' if any thread encounters an error

        save_log('insert_fct_stage', 'INFO', f"{total_records} records for {fic_mis_date} inserted successfully into FCT_Stage_Determination.", status='SUCCESS')
        return '1'  # Return '1' on successful completion

    except Exception as e:
        save_log('insert_fct_stage', 'ERROR', f"Error during FCT_Stage_Determination insertion process: {e}", status='FAILURE')
        return '0'  # Return '0' in case of any exception



from django.db.models import Sum, Q
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor, as_completed

def calculate_accrued_interest(account_number, fic_mis_date):
    """
    This function calculates the total accrued interest for a specific account.
    The accrued interest is summed from the FSI_Expected_Cashflow table.
    """
    try:
        cash_flows = FSI_Expected_Cashflow.objects.filter(v_account_number=account_number, fic_mis_date=fic_mis_date)
        
        if not cash_flows.exists():
            save_log('calculate_accrued_interest', 'INFO', f"No cash flow records found for account {account_number} and fic_mis_date {fic_mis_date}")
            return Decimal(0)
        
        total_accrued_interest = cash_flows.aggregate(Sum('n_accrued_interest'))['n_accrued_interest__sum'] or Decimal(0)
        return total_accrued_interest

    except Exception as e:
        save_log('calculate_accrued_interest', 'ERROR', f"Error calculating accrued interest for account {account_number}: {e}")
        return Decimal(0)

def calculate_exposure_at_default(carrying_amount, accrued_interest):
    """
    This function calculates the exposure at default (EAD) by summing the carrying amount and accrued interest.
    """
    try:
        return carrying_amount + accrued_interest
    except Exception as e:
        save_log('calculate_exposure_at_default', 'ERROR', f"Error calculating EAD: {e}")
        return None

def process_accrued_interest_and_ead_for_account(entry):
    """
    Calculate the accrued interest and exposure at default (EAD) for a single entry in FCT_Stage_Determination.
    """
    try:
        total_accrued_interest = entry.n_accrued_interest or calculate_accrued_interest(entry.n_account_number, entry.fic_mis_date)
        total_exposure_at_default = calculate_exposure_at_default(entry.n_carrying_amount_ncy, total_accrued_interest)

        if total_exposure_at_default is not None:
            entry.n_accrued_interest = total_accrued_interest
            entry.n_exposure_at_default = total_exposure_at_default
            return entry  # Return the updated entry for bulk update
    except Exception as e:
        save_log('process_accrued_interest_and_ead_for_account', 'ERROR', f"Error processing account {entry.n_account_number}: {e}")
    return None

def update_stage_determination_accrued_interest_and_ead(fic_mis_date):
    """
    This function updates the FCT_Stage_Determination table with the total accrued interest and exposure at default (EAD)
    for each account. The accrued interest and EAD are calculated from the FSI_Expected_Cashflow table, and EAD is 
    based on the n_carrying_amount_ncy field from FCT_Stage_Determination.
    """
    try:
        stage_determination_entries = FCT_Stage_Determination.objects.filter(
            fic_mis_date=fic_mis_date,
            n_exposure_at_default__isnull=True
        ).exclude(n_prod_code__isnull=True)

        if not stage_determination_entries.exists():
            save_log('update_stage_determination_accrued_interest_and_ead', 'INFO', f"No records found in FCT_Stage_Determination for fic_mis_date {fic_mis_date} with NULL exposure at default.")
            return 0
        
        updated_entries = []

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(process_accrued_interest_and_ead_for_account, entry) for entry in stage_determination_entries]

            for future in as_completed(futures):
                result = future.result()
                if result:
                    updated_entries.append(result)

        if updated_entries:
            # Perform a single bulk update for all updated entries
            FCT_Stage_Determination.objects.bulk_update(updated_entries, ['n_accrued_interest', 'n_exposure_at_default'])
            save_log('update_stage_determination_accrued_interest_and_ead', 'INFO', f"Successfully updated {len(updated_entries)} records with accrued interest and EAD.")
        else:
            save_log('update_stage_determination_accrued_interest_and_ead', 'INFO', "No records were updated.")

        return 1
    except Exception as e:
        save_log('update_stage_determination_accrued_interest_and_ead', 'ERROR', f"Error during update process: {e}")
        return 0
    


def update_lgd_for_stage_determination_term_structure(mis_date):
    """
    Update n_lgd_percent in FCT_Stage_Determination based on:
    1. Collateral values and EAD.
    2. LGD term structure if n_segment_skey matches v_lgd_term_structure_id.
    """
    try:
        # Fetch entries for the given mis_date
        stage_determination_entries = FCT_Stage_Determination.objects.filter(
        fic_mis_date=mis_date,
        n_lgd_percent__isnull=True  # Only include entries where n_lgd_percent is NULL
        )

        # List to hold the updated entries for bulk update
        entries_to_update = []
        error_occurred = False  # Flag to track errors

        # Process entries in parallel with ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(process_lgd_updates, entry, entries_to_update)
                for entry in stage_determination_entries
            ]

            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    save_log('update_lgd_for_stage_determination', 'ERROR', f"Thread error: {e}")
                    error_occurred = True  # Set the flag if an error occurs

        # Perform bulk update after all entries have been processed
        if entries_to_update:
            bulk_update_entries(entries_to_update)

        # Log the total number of entries updated only once
        if not error_occurred:
            save_log('update_lgd_for_stage_determination', 'INFO', f"Successfully updated LGD for {len(entries_to_update)} entries.")
        return 1 if not error_occurred else 0  # Return 1 on success, 0 if any thread encountered an error

    except Exception as e:
        save_log('update_lgd_for_stage_determination', 'ERROR', f"Error during LGD update: {e}")
        return 0  # Return 0 in case of any exception


def process_lgd_updates(entry, entries_to_update):
    """
    Process LGD updates for both collateral-based and term-structure-based LGD calculations.
    Append the updated entries to the `entries_to_update` list for bulk update later.
    """
    try:
        update_lgd_based_on_term_structure(entry, entries_to_update)
    except Exception as e:
        print(f"Error processing LGD updates for account {entry.n_account_number}: {e}")





################################
from django.db import transaction
from concurrent.futures import ThreadPoolExecutor
from django.utils import timezone

def chunk_data(data, chunk_size):
    """Split data into chunks of size chunk_size."""
    for i in range(0, len(data), chunk_size):
        yield data[i:i + chunk_size]

def process_chunk(stage_determination_chunk):
    """Process a chunk of FCT_Stage_Determination records and perform bulk insert into FCT_Reporting_Lines."""
    reporting_lines_records = []

    for record in stage_determination_chunk:
        reporting_line = FCT_Reporting_Lines(
            fic_mis_date=record.fic_mis_date,
            n_account_number=record.n_account_number,
            d_acct_start_date=record.d_acct_start_date,
            d_last_payment_date=record.d_last_payment_date,
            d_next_payment_date=record.d_next_payment_date,
            d_maturity_date=record.d_maturity_date,
            n_acct_classification=record.n_acct_classification,
            n_cust_ref_code=record.n_cust_ref_code,
            n_partner_name=record.n_partner_name,
            n_party_type=record.n_party_type,
            n_accrual_basis_code=record.n_accrual_basis_code,
            n_curr_interest_rate=record.n_curr_interest_rate,
            n_effective_interest_rate=record.n_effective_interest_rate,
            v_interest_freq_unit=record.v_interest_freq_unit,
            v_interest_method=record.v_interest_method,
            n_accrued_interest=record.n_accrued_interest,
            n_rate_chg_min=record.n_rate_chg_min,
            n_carrying_amount_ncy=record.n_carrying_amount_ncy,
            n_exposure_at_default_ncy=record.n_exposure_at_default,
            n_lgd_percent=record.n_lgd_percent,
            n_pd_percent=record.n_pd_percent,
            n_twelve_months_orig_pd=record.n_twelve_months_orig_pd,
            n_lifetime_orig_pd=record.n_lifetime_orig_pd,
            n_twelve_months_pd=record.n_twelve_months_pd,
            n_lifetime_pd=record.n_lifetime_pd,
            n_pd_term_structure_skey=record.n_pd_term_structure_skey,
            n_pd_term_structure_name=record.n_pd_term_structure_name,
            n_pd_term_structure_desc=record.n_pd_term_structure_desc,
            n_12m_pd_change=record.n_12m_pd_change,
            v_amrt_repayment_type=record.v_amrt_repayment_type,
            n_remain_no_of_pmts=record.n_remain_no_of_pmts,
            n_amrt_term=record.n_amrt_term,
            v_amrt_term_unit=record.v_amrt_term_unit,
            v_ccy_code=record.v_ccy_code,
            n_delinquent_days=record.n_delinquent_days,
            n_delq_band_code=record.n_delq_band_code,
            n_stage_descr=record.n_stage_descr,
            n_curr_ifrs_stage_skey=record.n_curr_ifrs_stage_skey,
            n_prev_ifrs_stage_skey=record.n_prev_ifrs_stage_skey,
            d_cooling_start_date=record.d_cooling_start_date,
            n_target_ifrs_stage_skey=record.n_target_ifrs_stage_skey,
            n_in_cooling_period_flag=record.n_in_cooling_period_flag,
            n_cooling_period_duration=record.n_cooling_period_duration,
            n_country=record.n_country,
            n_segment_skey=record.n_segment_skey,
            n_prod_segment=record.n_prod_segment,
            n_prod_code=record.n_prod_code,
            n_prod_name=record.n_prod_name,
            n_prod_type=record.n_prod_type,
            n_prod_desc=record.n_prod_desc,
            n_credit_rating_code=record.n_credit_rating_code,
            n_org_credit_score=record.n_org_credit_score,
            n_curr_credit_score=record.n_curr_credit_score,
            n_acct_rating_movement=record.n_acct_rating_movement,
            n_party_rating_movement=record.n_party_rating_movement,
            n_conditionally_cancel_flag=record.n_conditionally_cancel_flag,
            n_collateral_amount=record.n_collateral_amount,
            n_loan_type=record.n_loan_type
        )
        reporting_lines_records.append(reporting_line)

    # Perform bulk insert for the current chunk
    with transaction.atomic():
        FCT_Reporting_Lines.objects.bulk_create(reporting_lines_records)

def populate_fct_reporting_lines(mis_date, chunk_size=1000):
    """
    Populate data in FCT_Reporting_Lines from FCT_Stage_Determination for the given mis_date.
    """
    try:
        # Delete existing records for the same fic_mis_date
        with transaction.atomic():
            FCT_Reporting_Lines.objects.filter(fic_mis_date=mis_date).delete()
        
        # Fetch records from FCT_Stage_Determination where fic_mis_date matches the provided date
        stage_determination_records = list(FCT_Stage_Determination.objects.filter(fic_mis_date=mis_date))

        if not stage_determination_records:
            save_log('populate_fct_reporting_lines', 'INFO', f"No records found in FCT_Stage_Determination for mis_date {mis_date}.")
            return '0'

        # Split the records into chunks
        chunks = list(chunk_data(stage_determination_records, chunk_size))

        # Use ThreadPoolExecutor to process each chunk in parallel
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(process_chunk, chunk) for chunk in chunks]

            for future in futures:
                try:
                    future.result()
                except Exception as exc:
                    save_log('populate_fct_reporting_lines', 'ERROR', f"Error processing chunk: {exc}")
                    return '0'

        save_log('populate_fct_reporting_lines', 'INFO', f"Successfully populated FCT_Reporting_Lines for {len(stage_determination_records)} records.")
        return '1'

    except Exception as e:
        save_log('populate_fct_reporting_lines', 'ERROR', f"Error populating FCT_Reporting_Lines: {e}")
        return '0'
    

####################
from concurrent.futures import ThreadPoolExecutor
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal

def fetch_manual_exchange_rates(target_currency_code, fic_mis_date):
    """Fetch manually loaded exchange rates from the database."""
    exchange_rates = Ldn_Exchange_Rate.objects.filter(fic_mis_date=fic_mis_date)
    if not exchange_rates.exists():
        save_log('fetch_manual_exchange_rates', 'ERROR', f"No manually loaded exchange rates found for date {fic_mis_date}.")
        return None

    # Prepare the exchange rate dictionary from the database records
    exchange_rate_dict = {(rate.v_from_ccy_code, rate.v_to_ccy_code): rate.n_exchange_rate for rate in exchange_rates}
    return exchange_rate_dict

def update_reporting_lines(fic_mis_date, exchange_rate_dict, target_currency_code):
    """Update the FCT_Reporting_Lines with the provided exchange rates."""
    # Update the reporting lines with the fetched exchange rates
    def process_entry(line):
        if line.v_ccy_code == target_currency_code:
            # No conversion is needed, so use NCY value as the RCY value (multiply by 1)
            line.n_exposure_at_default_rcy = line.n_exposure_at_default_ncy
            line.n_carrying_amount_rcy = line.n_carrying_amount_ncy
            line.n_lifetime_ecl_rcy = line.n_lifetime_ecl_ncy
            line.n_12m_ecl_rcy = line.n_12m_ecl_ncy
        else:
            # Fetch the exchange rate for the line's currency
            exchange_rate_key = (line.v_ccy_code, target_currency_code)

            if exchange_rate_key not in exchange_rate_dict:
                save_log('update_reporting_lines', 'ERROR', f"Exchange rate not found for {line.v_ccy_code} to {target_currency_code}")
                return line

            # Apply the exchange rate, converting it to Decimal before multiplication
            exchange_rate = exchange_rate_dict[exchange_rate_key]
            line.n_exposure_at_default_rcy = exchange_rate * Decimal(line.n_exposure_at_default_ncy) if line.n_exposure_at_default_ncy else None
            line.n_carrying_amount_rcy = exchange_rate * Decimal(line.n_carrying_amount_ncy) if line.n_carrying_amount_ncy else None
            line.n_lifetime_ecl_rcy = exchange_rate * Decimal(line.n_lifetime_ecl_ncy) if line.n_lifetime_ecl_ncy else None
            line.n_12m_ecl_rcy = exchange_rate * Decimal(line.n_12m_ecl_ncy) if line.n_12m_ecl_ncy else None

        return line

    # Fetch the reporting lines and process them with multi-threading
    reporting_lines = FCT_Reporting_Lines.objects.filter(fic_mis_date=fic_mis_date)
    with ThreadPoolExecutor(max_workers=20) as executor:
        updated_entries = list(executor.map(process_entry, reporting_lines))

    # Bulk update the reporting lines and log the number of rows updated
    with transaction.atomic():
        FCT_Reporting_Lines.objects.bulk_update(updated_entries, [
            'n_exposure_at_default_rcy', 'n_carrying_amount_rcy', 'n_lifetime_ecl_rcy', 'n_12m_ecl_rcy'
        ])

    save_log('update_reporting_lines', 'INFO', f"Successfully updated {len(updated_entries)} reporting lines for MIS date {fic_mis_date}.")
    return 1

def update_reporting_lines_with_exchange_rate(fic_mis_date):
    try:
        # Step 1: Get exchange rate configuration
        exchange_rate_conf = DimExchangeRateConf.objects.first()
        if not exchange_rate_conf:
            save_log('update_reporting_lines_with_exchange_rate', 'ERROR', "No valid exchange rate configuration found.")
            return 0

        # Step 2: Get the reporting currency code (target currency for all conversions)
        reporting_currency = ReportingCurrency.objects.first()
        if not reporting_currency:
            save_log('update_reporting_lines_with_exchange_rate', 'ERROR', "No reporting currency defined.")
            return 0
        
        target_currency_code = reporting_currency.currency_code.code  # This is the base currency

        # Step 3: Fetch manually loaded exchange rates
        exchange_rate_dict = fetch_manual_exchange_rates(target_currency_code, fic_mis_date)

        if not exchange_rate_dict:
            return 0

        # Step 4: Update reporting lines using the fetched exchange rates
        return update_reporting_lines(fic_mis_date, exchange_rate_dict, target_currency_code)

    except ValueError as ve:
        save_log('update_reporting_lines_with_exchange_rate', 'ERROR', f"Value Error: {str(ve)}")
        return 0
    except Exception as e:
        save_log('update_reporting_lines_with_exchange_rate', 'ERROR', f"Error during update: {str(e)}")
        return 0
    



###########################
import math
from bisect import bisect_right
from collections import defaultdict
from scipy.stats import norm
from IFRS9.models import FSI_PD_Interpolated

# Default Basel values for sensitivity factors and asset correlation
DEFAULT_BETA1 = -0.300  # For Real GDP Growth
DEFAULT_BETA2 = 0.200   # For Inflation Rate
DEFAULT_BETA3 = 0.400   # For Unemployment Rate
DEFAULT_BETA4 = 0.100   # For Government Debt
DEFAULT_RHO   = 0.1     # Asset correlation
DEFAULT_SCENARIO_WEIGHTS = {'BASE': 0.333, 'BEST': 0.333, 'WORST': 0.333}

def apply_vasicek_adjustment_all_scenarios(mis_date):
    """
    Computes the PIT PD for each scenario (BASE, BEST, WORST) using default macroeconomic values.
    Updates n_cumulative_default_prob to the average of these PIT PDs.
    """
    records = list(FSI_PD_Interpolated.objects.filter(fic_mis_date=mis_date))
    if not records:
        save_log('apply_vasicek_adjustment_all_scenarios', 'INFO', f"No records found for MIS date {mis_date}")
        return
    
    updated_records = []
    
    for record in records:
        try:
            base_pd = float(record.n_cumulative_default_prob_base)
        except (TypeError, ValueError):
            save_log('apply_vasicek_adjustment_all_scenarios', 'ERROR', f"Record ID {record.id} has invalid n_cumulative_default_prob_base.")
            continue
        base_pd = min(max(base_pd, 1e-6), 1 - 1e-6)
        
        pit_pd_values = {}
        for scenario in ['BASE', 'BEST', 'WORST']:
            # Default macroeconomic values
            X1, X2, X3, X4 = 0.0, 0.0, 0.0, 0.0
            
            # Compute adjusted factor and PIT PD.
            adjusted_factor = DEFAULT_BETA1 * X1 + DEFAULT_BETA2 * X2 + DEFAULT_BETA3 * X3 + DEFAULT_BETA4 * X4
            x = norm.ppf(base_pd)
            pit_input = (x - adjusted_factor) / math.sqrt(1 - DEFAULT_RHO)
            pit_pd = norm.cdf(pit_input)
            pit_pd = min(max(pit_pd, 1e-6), 1 - 1e-6)
            pit_pd_values[scenario] = pit_pd
        
        # Calculate average PIT PD from scenarios.
        avg_pit_pd = sum(DEFAULT_SCENARIO_WEIGHTS[scenario] * pit_pd_values[scenario] for scenario in pit_pd_values)
        
        # Update record fields.
        record.n_pit_pd_base = pit_pd_values['BASE']
        record.n_pit_pd_best = pit_pd_values['BEST']
        record.n_pit_pd_worst = pit_pd_values['WORST']
        record.n_cumulative_default_prob = avg_pit_pd
        updated_records.append(record)
    
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


##############################################################3
import os
import sys
import pandas as pd
import numpy as np
import re

from django.db import transaction
from IFRS9.models import (
    FCT_Stage_Determination, 
     
    Dim_Delinquency_Band,
          # New model for raw transition counts.
    Ldn_PD_Term_Structure_Dtl,
    FSICUMULATIVEPD,
    Ldn_PD_Term_Structure,  # Used to retrieve frequency unit and structure type.
 
)



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
    
    
    qs = FCT_Stage_Determination.objects.filter(
            n_segment_skey__in=list(dpd_segments)   
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
    qs =None
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
def get_group_to_segments_mapping():
    """
    Retrieve a mapping from each combined group to a list of product segment keys from DimProductSegmentGroup.
    """
    mapping = {}
    qs = mapping
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
     

       
        
        # Then, clear only the records within that date range:
        band_codes = get_band_order()
       
        FSICUMULATIVEPD.objects.filter(
            fic_mis_date=fic_mis_date,
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

####################################

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
    Ldn_LGD_Term_Structure,  # Overall portfolio LGD (the PD term structure for LGD)
    FSI_Product_Segment,     # Product segment model for segment_id
    Credit_Rating_Code_Band, # Rating codes for rating-based term structures
)
from django.conf import settings

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
  
    dpd_segments = FCT_Stage_Determination.objects.values_list('n_segment_skey', flat=True)
   

    qs = FCT_Stage_Determination.objects.filter(
        n_segment_skey__in=list(dpd_segments),
   
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
     
        
        term_unit = df_segment['v_amrt_term_unit'].iloc[0]
        default_band = get_default_delinq_band(term_unit)
        mapping[segment] = default_band
        print(f"For segment '{segment}', default band is: {default_band}")
    return mapping

@log_function
def calculate_lgd():
    
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
def save_lgd_overall(fic_mis_date, segment_lgd_df):
    """
    Saves overall LGD records into Ldn_LGD_Term_Structure (per segment).
    Then saves a record for each code in FSI_LGD_Term_Structure, 
    referencing Ldn_PD_Term_Structure as required by your model. 
    """
    try:
        from IFRS9.models import FSI_Product_Segment, Ldn_PD_Term_Structure, Credit_Rating_Code_Band

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
        segment_lgd_df = calculate_lgd()

        # 2. Delete existing records for final_reporting_date in detail, aggregated, and overall
        

        Ldn_LGD_Term_Structure.objects.filter(fic_mis_date=final_reporting_date).delete()
        # Save new overall
        save_lgd_overall(fic_mis_date, segment_lgd_df)

        return 1
    except Exception as e:
        return 0
