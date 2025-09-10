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

def calculate_12m_expected_loss_fields_setbased(fic_mis_date):
    """
    Calculates and updates 12-month forward expected loss fields using set-based SQL updates.
    """
    
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            return 0

        with connection.cursor() as cursor, transaction.atomic():
            sql = """
                UPDATE fsi_financial_cash_flow_cal
                SET 
                    n_12m_fwd_expected_loss = n_exposure_at_default * n_12m_per_period_pd * n_lgd_percent,
                    n_12m_fwd_expected_loss_pv = n_discount_factor * (n_exposure_at_default * n_12m_per_period_pd * n_lgd_percent)
                WHERE fic_mis_date = %s AND n_run_skey = %s;
            """
            cursor.execute(sql, [fic_mis_date, run_skey])
            updated_count = cursor.rowcount

        save_log('calculate_12m_expected_loss_fields_setbased', 'INFO', 
                 f"Updated {updated_count} records for 12m expected loss.")
        return 1 if updated_count > 0 else 0

    except Exception as e:
        save_log('calculate_12m_expected_loss_fields_setbased', 'ERROR', f"Error: {e}")
        return 0

def calculate_forward_expected_loss_fields_setbased(fic_mis_date):
    """
    Calculates and updates forward expected loss fields using set-based SQL updates.
    """
    try:
        run_skey = get_latest_run_skey()
        if not run_skey:
            return 0

        with connection.cursor() as cursor, transaction.atomic():
            sql = """
                UPDATE fsi_financial_cash_flow_cal
                SET 
                    n_forward_expected_loss = n_exposure_at_default * n_per_period_impaired_prob * n_lgd_percent,
                    n_forward_expected_loss_pv = n_discount_factor * (n_exposure_at_default * n_per_period_impaired_prob * n_lgd_percent)
                WHERE fic_mis_date = %s AND n_run_skey = %s;
            """
            cursor.execute(sql, [fic_mis_date, run_skey])
            updated_count = cursor.rowcount

        save_log('calculate_forward_expected_loss_fields_setbased', 'INFO', 
                 f"Updated {updated_count} records for forward expected loss.")
        return 1 if updated_count > 0 else 0

    except Exception as e:
        save_log('calculate_forward_expected_loss_fields_setbased', 'ERROR', f"Error: {e}")
        return 0

def calculate_forward_loss_fields(fic_mis_date):
    """
    Main function to calculate both 12-month and forward expected loss fields using set-based SQL updates.
    """
    result_12m = calculate_12m_expected_loss_fields_setbased(fic_mis_date)
    if result_12m == 1:
        return calculate_forward_expected_loss_fields_setbased(fic_mis_date)
    else:
        save_log('calculate_forward_loss_fields_setbased', 'ERROR', 
                 f"Failed 12m calculation for {fic_mis_date}.")
        return 0
