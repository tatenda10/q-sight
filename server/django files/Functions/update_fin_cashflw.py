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
            raise ValueError("No run key is available in the Dim_Run table.")
        return run_record.latest_run_skey
    except Dim_Run.DoesNotExist:
        raise ValueError("Dim_Run table is missing.")
    except Exception as e:
        save_log('get_latest_run_skey', 'ERROR', f"Error fetching latest run_skey: {e}")
        return None


def update_financial_cash_flow(fic_mis_date):
    """
    Use a single raw SQL UPDATE with JOIN to update n_effective_interest_rate and n_lgd_percent
    in fsi_financial_cash_flow_cal, leveraging a set-based approach for PostgreSQL.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            save_log('update_financial_cash_flow_fast', 'ERROR', "No valid run_skey found.")
            return '0'

        with transaction.atomic():
            with connection.cursor() as cursor:
                # PostgreSQL uses a different JOIN syntax for UPDATE
                sql = """
                    UPDATE fsi_financial_cash_flow_cal AS cf
                    SET 
                        n_effective_interest_rate = sd.n_effective_interest_rate,
                        n_lgd_percent = sd.n_lgd_percent
                    FROM fct_stage_determination AS sd
                    WHERE 
                        cf.fic_mis_date = sd.fic_mis_date
                        AND cf.v_account_number = sd.n_account_number
                        AND cf.n_run_skey = %s
                        AND cf.fic_mis_date = %s;
                """
                cursor.execute(sql, [run_skey, fic_mis_date])
                updated_count = cursor.rowcount  # Number of rows actually updated

        if updated_count > 0:
            save_log(
                'update_financial_cash_flow_fast_postgresql',
                'INFO',
                f"Successfully updated {updated_count} rows for fic_mis_date={fic_mis_date}, run_skey={run_skey}."
            )
            return '1'
        else:
            save_log(
                'update_financial_cash_flow_fast_postgresql',
                'INFO',
                f"No rows matched for fic_mis_date={fic_mis_date}, run_skey={run_skey}."
            )
            return '0'

    except Exception as e:
        save_log(
            'update_financial_cash_flow_fast_postgresql',
            'ERROR',
            f"Error executing fast update for fic_mis_date={fic_mis_date}: {e}"
        )
        return '0'
