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

def calculate_ead_by_buckets(fic_mis_date):
    """
    Efficiently calculate and update n_exposure_at_default for each cash flow bucket 
    using a temporary table and set-based SQL operations.
    """
    run_skey = get_latest_run_skey()
    if not run_skey:
        return 0

    try:
        with connection.cursor() as cursor, transaction.atomic():
            # Step 1: Create a temporary table with the computed cumulative_ead values.
            create_temp_sql = """
                CREATE TEMP TABLE temp_ead AS
                SELECT
                    id,
                    SUM(n_cash_flow_amount * n_discount_factor)
                    OVER (
                        PARTITION BY v_account_number
                        ORDER BY n_cash_flow_bucket_id
                        ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
                    ) AS cumulative_ead
                FROM fsi_financial_cash_flow_cal
                WHERE fic_mis_date = %s AND n_run_skey = %s;
            """
            cursor.execute(create_temp_sql, [fic_mis_date, run_skey])

            # Step 2: Update the original table by joining with the temporary table.
            update_sql = """
                UPDATE fsi_financial_cash_flow_cal AS cf
                SET n_exposure_at_default = te.cumulative_ead
                FROM temp_ead AS te
                WHERE cf.id = te.id;
            """
            cursor.execute(update_sql)
            updated_count = cursor.rowcount

            # Step 3: Drop the temporary table.
            cursor.execute("DROP TABLE IF EXISTS temp_ead;")

        save_log('calculate_ead_by_buckets', 'INFO', f"Updated {updated_count} records.")
        return 1 if updated_count > 0 else 0

    except Exception as e:
        save_log('calculate_ead_by_buckets', 'ERROR', f"Error: {e}")
        return 0
