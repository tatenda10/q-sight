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
            save_log('get_latest_run_skey', 'ERROR', "No run key available.")
            return None
        return run_record.latest_run_skey
    except Exception as e:
        save_log('get_latest_run_skey', 'ERROR', str(e))
        return None

def calculate_cashflow_fields(fic_mis_date):
    """
    Calculates and updates cash flow fields (PV, shortfalls, etc.) in a single set-based SQL update.
    """
    run_skey = get_latest_run_skey()
    if not run_skey:
        return 0

    try:
        with connection.cursor() as cursor, transaction.atomic():
            sql = """
            UPDATE fsi_financial_cash_flow_cal
            SET 
                n_expected_cash_flow_pv = CASE 
                    WHEN n_discount_factor IS NOT NULL AND n_expected_cash_flow IS NOT NULL 
                    THEN n_discount_factor * n_expected_cash_flow 
                    ELSE n_expected_cash_flow_pv END,
                n_12m_exp_cash_flow_pv = CASE 
                    WHEN n_discount_factor IS NOT NULL AND n_12m_exp_cash_flow IS NOT NULL 
                    THEN n_discount_factor * n_12m_exp_cash_flow 
                    ELSE n_12m_exp_cash_flow_pv END,
                n_cash_shortfall = CASE 
                    WHEN n_cash_flow_amount IS NOT NULL AND n_expected_cash_flow IS NOT NULL 
                    THEN (n_cash_flow_amount - n_expected_cash_flow) 
                    ELSE n_cash_shortfall END,
                n_12m_cash_shortfall = CASE 
                    WHEN n_cash_flow_amount IS NOT NULL AND n_12m_exp_cash_flow IS NOT NULL 
                    THEN (n_cash_flow_amount - n_12m_exp_cash_flow) 
                    ELSE n_12m_cash_shortfall END,
                n_cash_shortfall_pv = CASE 
                    WHEN n_discount_factor IS NOT NULL AND n_cash_flow_amount IS NOT NULL AND n_expected_cash_flow IS NOT NULL 
                    THEN n_discount_factor * (n_cash_flow_amount - n_expected_cash_flow) 
                    ELSE n_cash_shortfall_pv END,
                n_12m_cash_shortfall_pv = CASE 
                    WHEN n_discount_factor IS NOT NULL AND n_cash_flow_amount IS NOT NULL AND n_12m_exp_cash_flow IS NOT NULL 
                    THEN n_discount_factor * (n_cash_flow_amount - n_12m_exp_cash_flow) 
                    ELSE n_12m_cash_shortfall_pv END
            WHERE fic_mis_date = %s AND n_run_skey = %s;
            """
            cursor.execute(sql, [fic_mis_date, run_skey])
            updated_count = cursor.rowcount

        save_log('calculate_cashflow_fields_setbased', 'INFO', f"Successfully updated {updated_count} records.")
        return 1 if updated_count > 0 else 0

    except Exception as e:
        save_log('calculate_cashflow_fields_setbased', 'ERROR', f"Error: {e}")
        return 0
