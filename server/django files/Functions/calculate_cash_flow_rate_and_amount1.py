from decimal import Decimal
from django.db import connection, transaction
from IFRS9.models import Dim_Run
from .save_log import save_log

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
    except Exception as e:
        save_log('get_latest_run_skey', 'ERROR', f"Error retrieving latest run key: {e}")
        return None

def calculate_expected_cash_flow(fic_mis_date):
    """
    Perform SQL-based updates to calculate expected cash flow fields for all relevant records.
    Updates are executed separately to ensure isolated logging and operations.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            save_log('calculate_expected_cash_flow', 'ERROR', "No valid run key found.")
            return 0

        updated_count = 0
        with connection.cursor() as cursor, transaction.atomic():
            # Update n_expected_cash_flow_rate
            try:
                sql_rate = """
                    UPDATE fsi_financial_cash_flow_cal
                    SET n_expected_cash_flow_rate = CASE
                        WHEN n_cumulative_loss_rate IS NOT NULL 
                        THEN 1 - n_cumulative_loss_rate 
                        ELSE n_expected_cash_flow_rate 
                    END
                    WHERE fic_mis_date = %s AND n_run_skey = %s;
                """
                cursor.execute(sql_rate, [fic_mis_date, run_skey])
                updated_rate_count = cursor.rowcount
                updated_count += updated_rate_count
                save_log('calculate_expected_cash_flow', 'INFO', 
                         f"Updated n_expected_cash_flow_rate for {updated_rate_count} records.")
            except Exception as e:
                save_log('calculate_expected_cash_flow', 'ERROR', 
                         f"Error updating n_expected_cash_flow_rate: {e}")

            # Update n_12m_exp_cash_flow
            try:
                sql_12m = """
                    UPDATE fsi_financial_cash_flow_cal
                    SET n_12m_exp_cash_flow = CASE
                        WHEN n_12m_cumulative_pd IS NOT NULL 
                             AND n_lgd_percent IS NOT NULL 
                        THEN COALESCE(n_cash_flow_amount, 0) 
                             * (1 - (n_12m_cumulative_pd * n_lgd_percent))
                        ELSE n_12m_exp_cash_flow
                    END
                    WHERE fic_mis_date = %s AND n_run_skey = %s;
                """
                cursor.execute(sql_12m, [fic_mis_date, run_skey])
                updated_12m_count = cursor.rowcount
                updated_count += updated_12m_count
                save_log('calculate_expected_cash_flow', 'INFO', 
                         f"Updated n_12m_exp_cash_flow for {updated_12m_count} records.")
            except Exception as e:
                save_log('calculate_expected_cash_flow', 'ERROR', 
                         f"Error updating n_12m_exp_cash_flow: {e}")

            # Update n_expected_cash_flow
            try:
                sql_expected = """
                    UPDATE fsi_financial_cash_flow_cal
                    SET n_expected_cash_flow = CASE
                        WHEN n_expected_cash_flow_rate IS NOT NULL 
                        THEN COALESCE(n_cash_flow_amount, 0) * n_expected_cash_flow_rate
                        ELSE n_expected_cash_flow
                    END
                    WHERE fic_mis_date = %s AND n_run_skey = %s;
                """
                cursor.execute(sql_expected, [fic_mis_date, run_skey])
                updated_expected_count = cursor.rowcount
                updated_count += updated_expected_count
                save_log('calculate_expected_cash_flow', 'INFO', 
                         f"Updated n_expected_cash_flow for {updated_expected_count} records.")
            except Exception as e:
                save_log('calculate_expected_cash_flow', 'ERROR', 
                         f"Error updating n_expected_cash_flow: {e}")

        save_log('calculate_expected_cash_flow', 'INFO', 
                 f"Successfully updated {updated_count} total records for fic_mis_date={fic_mis_date}, run_skey={run_skey}.")
        return 1 if updated_count > 0 else 0

    except Exception as e:
        save_log('calculate_expected_cash_flow', 'ERROR', f"Error during SQL updates: {e}")
        return 0
