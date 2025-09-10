from django.db import connection, transaction
from IFRS9.models import Dim_Run
from .save_log import save_log

def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        run_record = Dim_Run.objects.only('latest_run_skey').first()
        if not run_record:
            save_log('get_latest_run_skey', 'ERROR', "No run key is available.")
            return None
        return run_record.latest_run_skey
    except Exception as e:
        save_log('get_latest_run_skey', 'ERROR', str(e))
        return None

def update_marginal_pd(fic_mis_date):
    """
    Efficiently update n_per_period_impaired_prob and n_12m_per_period_pd for all 
    records in fsi_financial_cash_flow_cal on a given fic_mis_date using window functions.
    """
    run_skey = get_latest_run_skey()
    if not run_skey:
        return 0

    try:
        with connection.cursor() as cursor, transaction.atomic():
            # Step 1: Create a temporary table with computed marginal PD values using window functions.
            create_temp_sql = """
                CREATE TEMP TABLE temp_marginal_pd AS
                SELECT
                    id,
                    ABS(n_cumulative_impaired_prob - 
                        COALESCE(LAG(n_cumulative_impaired_prob) OVER (
                            PARTITION BY v_account_number
                            ORDER BY n_cash_flow_bucket_id
                        ), 0)
                    ) AS computed_per_period_impaired_prob,
                    ABS(n_12m_cumulative_pd - 
                        COALESCE(LAG(n_12m_cumulative_pd) OVER (
                            PARTITION BY v_account_number
                            ORDER BY n_cash_flow_bucket_id
                        ), 0)
                    ) AS computed_12m_per_period_pd
                FROM fsi_financial_cash_flow_cal
                WHERE fic_mis_date = %s AND n_run_skey = %s;
            """
            cursor.execute(create_temp_sql, [fic_mis_date, run_skey])

            # Step 2: Update the main table by joining with the temporary table.
            update_sql = """
                UPDATE fsi_financial_cash_flow_cal
                SET 
                    n_per_period_impaired_prob = tmp.computed_per_period_impaired_prob,
                    n_12m_per_period_pd = tmp.computed_12m_per_period_pd
                FROM temp_marginal_pd AS tmp
                WHERE fsi_financial_cash_flow_cal.id = tmp.id
                  AND fsi_financial_cash_flow_cal.fic_mis_date = %s
                  AND fsi_financial_cash_flow_cal.n_run_skey = %s;
            """
            cursor.execute(update_sql, [fic_mis_date, run_skey])
            updated_count = cursor.rowcount

            # Step 3: Drop the temporary table.
            cursor.execute("DROP TABLE IF EXISTS temp_marginal_pd;")

        save_log('update_marginal_pd_setbased', 'INFO', f"Updated {updated_count} rows for marginal PD on {fic_mis_date}.")
        return 1 if updated_count > 0 else 0

    except Exception as e:
        save_log('update_marginal_pd_setbased', 'ERROR', f"Error: {e}")
        return 0
