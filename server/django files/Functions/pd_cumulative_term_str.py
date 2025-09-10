import time
from concurrent.futures import ThreadPoolExecutor
from django.db import connection, transaction, DatabaseError
from IFRS9.models import Dim_Run
from .save_log import save_log


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


def process_batch_for_term_structure(
    amrt_unit,
    fic_mis_date,
    run_skey,
    months_to_12m,
    bucket_limit,
    term_structure_id,
    batch_accounts,
    retries=3,
    retry_delay=5
):
    """Process a single batch of accounts for a specific term structure with retry logic."""
    attempt = 0
    while attempt < retries:
        try:
            with transaction.atomic(), connection.cursor() as cursor:
                # Ratings-based update
                cursor.execute("""
                    WITH rating_subquery AS (
                        SELECT 
                            cf.id AS cf_id,
                            pd.n_cumulative_default_prob * sd.n_lgd_percent AS n_cumulative_loss_rate,
                            pd.n_cumulative_default_prob AS n_cumulative_impaired_prob
                        FROM fsi_financial_cash_flow_cal cf
                        JOIN fct_stage_determination sd
                          ON cf.fic_mis_date = sd.fic_mis_date
                         AND cf.v_account_number = sd.n_account_number
                        JOIN fsi_pd_interpolated pd
                          ON pd.fic_mis_date <= sd.fic_mis_date
                         AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                         AND pd.v_pd_term_structure_type = 'R'
                         AND pd.v_int_rating_code = sd.n_credit_rating_code
                         AND pd.v_cash_flow_bucket_id = cf.n_cash_flow_bucket_id
                        WHERE cf.fic_mis_date = %s
                          AND cf.n_run_skey = %s
                          AND sd.n_pd_term_structure_skey = %s
                          AND sd.n_account_number = ANY(%s)
                    )
                    UPDATE fsi_financial_cash_flow_cal cf
                    SET 
                        n_cumulative_loss_rate = r.n_cumulative_loss_rate,
                        n_cumulative_impaired_prob = r.n_cumulative_impaired_prob
                    FROM rating_subquery r
                    WHERE cf.id = r.cf_id;
                """, [fic_mis_date, run_skey, term_structure_id, batch_accounts])

                # Delinquency-based update
                cursor.execute("""
                    WITH delinquency_subquery AS (
                        SELECT 
                            cf.id AS cf_id,
                            pd.n_cumulative_default_prob * sd.n_lgd_percent AS n_cumulative_loss_rate,
                            pd.n_cumulative_default_prob AS n_cumulative_impaired_prob
                        FROM fsi_financial_cash_flow_cal cf
                        JOIN fct_stage_determination sd
                          ON cf.fic_mis_date = sd.fic_mis_date
                         AND cf.v_account_number = sd.n_account_number
                        JOIN fsi_pd_interpolated pd
                          ON pd.fic_mis_date <= sd.fic_mis_date
                         AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                         AND pd.v_pd_term_structure_type = 'D'
                         AND pd.v_delq_band_code = sd.n_delq_band_code
                         AND pd.v_cash_flow_bucket_id = cf.n_cash_flow_bucket_id
                        WHERE cf.fic_mis_date = %s
                          AND cf.n_run_skey = %s
                          AND sd.n_pd_term_structure_skey = %s
                          AND sd.n_account_number = ANY(%s)
                    )
                    UPDATE fsi_financial_cash_flow_cal cf
                    SET 
                        n_cumulative_loss_rate = d.n_cumulative_loss_rate,
                        n_cumulative_impaired_prob = d.n_cumulative_impaired_prob
                    FROM delinquency_subquery d
                    WHERE cf.id = d.cf_id;
                """, [fic_mis_date, run_skey, term_structure_id, batch_accounts])

                # 12-Month PD Update For Delinquency-base
                cursor.execute("""
                    WITH pd_12_months_subquery AS (
                        SELECT 
                            cf.id AS cf_id,
                            pd.n_cumulative_default_prob AS n_12m_cumulative_pd
                        FROM fsi_financial_cash_flow_cal cf
                        JOIN fct_stage_determination sd
                          ON cf.fic_mis_date = sd.fic_mis_date
                         AND cf.v_account_number = sd.n_account_number
                        JOIN fsi_pd_interpolated pd
                          ON pd.fic_mis_date <= sd.fic_mis_date
                         AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                         AND pd.v_cash_flow_bucket_id = LEAST(cf.n_cash_flow_bucket_id, %s)
                        AND pd.v_pd_term_structure_type = 'D'
                         AND pd.v_delq_band_code = sd.n_delq_band_code
                        WHERE cf.fic_mis_date = %s
                          AND cf.n_run_skey = %s
                          AND sd.n_pd_term_structure_skey = %s
                          AND sd.n_account_number = ANY(%s)
                        AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                          
                    )
                    UPDATE fsi_financial_cash_flow_cal cf
                    SET n_12m_cumulative_pd = p.n_12m_cumulative_pd
                    FROM pd_12_months_subquery p
                    WHERE cf.id = p.cf_id;
                """, [months_to_12m, fic_mis_date, run_skey, term_structure_id, batch_accounts])

                # 12-Month PD Update FOR RATING
                cursor.execute("""
                    WITH pd_12_months_subquery AS (
                        SELECT 
                            cf.id AS cf_id,
                            pd.n_cumulative_default_prob AS n_12m_cumulative_pd
                        FROM fsi_financial_cash_flow_cal cf
                        JOIN fct_stage_determination sd
                          ON cf.fic_mis_date = sd.fic_mis_date
                         AND cf.v_account_number = sd.n_account_number
                        JOIN fsi_pd_interpolated pd
                          ON pd.fic_mis_date <= sd.fic_mis_date
                         AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                         AND pd.v_cash_flow_bucket_id = LEAST(cf.n_cash_flow_bucket_id, %s)
                        AND pd.v_pd_term_structure_type = 'R'
                         AND pd.v_int_rating_code = sd.n_credit_rating_code
                        WHERE cf.fic_mis_date = %s
                          AND cf.n_run_skey = %s
                          AND sd.n_pd_term_structure_skey = %s
                          AND sd.n_account_number = ANY(%s)
                        AND pd.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                         AND pd.v_pd_term_structure_type = 'D'
                         AND pd.v_delq_band_code = sd.n_delq_band_code 
                    )
                    UPDATE fsi_financial_cash_flow_cal cf
                    SET n_12m_cumulative_pd = p.n_12m_cumulative_pd
                    FROM pd_12_months_subquery p
                    WHERE cf.id = p.cf_id;
                """, [months_to_12m, fic_mis_date, run_skey, term_structure_id, batch_accounts])


            return  # Successful execution
        except DatabaseError as e:
            if "lock" in str(e).lower():
                attempt += 1
                time.sleep(retry_delay)
            else:
                raise
    raise Exception(f"Failed after {retries} retries due to lock timeouts.")


def update_cash_flow_with_pd_buckets(fic_mis_date, batch_size=5000, max_workers=4):
    """
    Updates cash flow records with PD bucket information in batches of accounts using multithreading.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            save_log('update_cash_flow_with_pd_buckets', 'ERROR', "No valid run_skey found.")
            return 0

        amrt_unit = 'M'
        months_to_12m = get_buckets_for_12_months(amrt_unit)

        # Retrieve distinct account numbers and their term structures
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT n_account_number, n_pd_term_structure_skey 
                FROM fct_stage_determination 
                WHERE fic_mis_date = %s;
            """, [fic_mis_date])
            rows = cursor.fetchall()

        # Group accounts by term_structure_id
        term_structure_map = {}
        for account, term_structure_id in rows:
            term_structure_map.setdefault(term_structure_id, []).append(account)

        futures = []
        executor = ThreadPoolExecutor(max_workers=max_workers)

        # Schedule tasks for each term structure in batches
        for term_structure_id, accounts in term_structure_map.items():
            for i in range(0, len(accounts), batch_size):
                batch_accounts = accounts[i:i + batch_size]
                if not batch_accounts:
                    continue
                futures.append(
                    executor.submit(
                        process_batch_for_term_structure,
                        amrt_unit,
                        fic_mis_date,
                        run_skey,
                        months_to_12m,
                        batch_size,
                        term_structure_id,
                        batch_accounts
                    )
                )

        for future in futures:
            future.result()  # Reraise exceptions from threads

        executor.shutdown()

        save_log('update_cash_flow_with_pd_buckets', 'INFO',
                 f"Set-based PD updates completed for fic_mis_date={fic_mis_date}, run_skey={run_skey}.")
        return 1

    except Exception as e:
        save_log('update_cash_flow_with_pd_buckets', 'ERROR',
                 f"Error updating PD buckets for fic_mis_date={fic_mis_date}: {e}")
        return 0
