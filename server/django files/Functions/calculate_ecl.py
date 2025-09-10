from django.db import connection, transaction
from IFRS9.models import Dim_Run
from .save_log import save_log

# ------------------------------------------------------------------------
# 1) Retrieve Latest Run Key
# ------------------------------------------------------------------------
def get_latest_run_skey():
    """
    Retrieve the latest_run_skey from Dim_Run table.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT latest_run_skey FROM dim_run LIMIT 1;")
            result = cursor.fetchone()
            if result:
                return result[0]
            save_log('get_latest_run_skey', 'ERROR', "No run key is available in the Dim_Run table.")
            return None
    except Exception as e:
        save_log('get_latest_run_skey', 'ERROR', f"Error fetching run key: {e}")
        return None

# ------------------------------------------------------------------------
# 2) ECL Calculation: Cash Shortfall
# ------------------------------------------------------------------------
def update_ecl_based_on_cash_shortfall_sql(n_run_key, fic_mis_date, uses_discounting):
    """
    Optimized SQL-based update of ECL based on cash shortfall or present value.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Preload data into a temporary table
            cursor.execute("DROP TABLE IF EXISTS temp_cash_shortfall;")
            if uses_discounting:
                cursor.execute("""
                    CREATE TEMP TABLE temp_cash_shortfall AS
                    SELECT
                        v_account_number,
                        SUM(n_cash_shortfall_pv) AS total_cash_shortfall_pv,
                        SUM(n_12m_cash_shortfall_pv) AS total_12m_cash_shortfall_pv
                    FROM fsi_financial_cash_flow_cal
                    WHERE n_run_skey = %s AND fic_mis_date = %s
                    GROUP BY v_account_number;
                """, [n_run_key, fic_mis_date])
            else:
                cursor.execute("""
                    CREATE TEMP TABLE temp_cash_shortfall AS
                    SELECT
                        v_account_number,
                        SUM(n_cash_shortfall) AS total_cash_shortfall,
                        SUM(n_12m_cash_shortfall) AS total_12m_cash_shortfall
                    FROM fsi_financial_cash_flow_cal
                    WHERE n_run_skey = %s AND fic_mis_date = %s
                    GROUP BY v_account_number;
                """, [n_run_key, fic_mis_date])

            # Index the temporary table for faster joins
            cursor.execute("CREATE INDEX idx_temp_cash_shortfall ON temp_cash_shortfall(v_account_number);")

            # Perform the update using the temporary table
            if uses_discounting:
                cursor.execute("""
                    UPDATE fct_reporting_lines AS rl
                    SET
                        n_lifetime_ecl_ncy = COALESCE(cf.total_cash_shortfall_pv, 0),
                        n_12m_ecl_ncy = COALESCE(cf.total_12m_cash_shortfall_pv, 0)
                    FROM temp_cash_shortfall cf
                    WHERE rl.n_account_number = cf.v_account_number
                      AND rl.n_run_key = %s
                      AND rl.fic_mis_date = %s;
                """, [n_run_key, fic_mis_date])
            else:
                cursor.execute("""
                    UPDATE fct_reporting_lines AS rl
                    SET
                        n_lifetime_ecl_ncy = COALESCE(cf.total_cash_shortfall, 0),
                        n_12m_ecl_ncy = COALESCE(cf.total_12m_cash_shortfall, 0)
                    FROM temp_cash_shortfall cf
                    WHERE rl.n_account_number = cf.v_account_number
                      AND rl.n_run_key = %s
                      AND rl.fic_mis_date = %s;
                """, [n_run_key, fic_mis_date])

        save_log(
            'update_ecl_based_on_cash_shortfall_sql',
            'INFO',
            f"Successfully updated ECL based on cash shortfall for run key {n_run_key}, date {fic_mis_date}."
        )
    except Exception as e:
        save_log('update_ecl_based_on_cash_shortfall_sql', 'ERROR', f"Error: {e}")

# ------------------------------------------------------------------------
# 3) ECL Calculation: Forward Loss
# ------------------------------------------------------------------------
def update_ecl_based_on_forward_loss_sql(n_run_key, fic_mis_date, uses_discounting):
    """
    Optimized SQL-based update of ECL based on forward loss or present value.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Preload data into a temporary table
            cursor.execute("DROP TABLE IF EXISTS temp_forward_loss;")
            if uses_discounting:
                cursor.execute("""
                    CREATE TEMP TABLE temp_forward_loss AS
                    SELECT
                        v_account_number,
                        SUM(n_forward_expected_loss_pv) AS total_fwd_loss_pv,
                        SUM(n_12m_fwd_expected_loss_pv) AS total_12m_fwd_loss_pv
                    FROM fsi_financial_cash_flow_cal
                    WHERE n_run_skey = %s AND fic_mis_date = %s
                    GROUP BY v_account_number;
                """, [n_run_key, fic_mis_date])
            else:
                cursor.execute("""
                    CREATE TEMP TABLE temp_forward_loss AS
                    SELECT
                        v_account_number,
                        SUM(n_forward_expected_loss) AS total_fwd_loss,
                        SUM(n_12m_fwd_expected_loss) AS total_12m_fwd_loss
                    FROM fsi_financial_cash_flow_cal
                    WHERE n_run_skey = %s AND fic_mis_date = %s
                    GROUP BY v_account_number;
                """, [n_run_key, fic_mis_date])

            # Index the temporary table for faster joins
            cursor.execute("CREATE INDEX idx_temp_forward_loss ON temp_forward_loss(v_account_number);")

            # Perform the update using the temporary table
            if uses_discounting:
                cursor.execute("""
                    UPDATE fct_reporting_lines AS rl
                    SET
                        n_lifetime_ecl_ncy = COALESCE(fwd.total_fwd_loss_pv, 0),
                        n_12m_ecl_ncy = COALESCE(fwd.total_12m_fwd_loss_pv, 0)
                    FROM temp_forward_loss fwd
                    WHERE rl.n_account_number = fwd.v_account_number
                      AND rl.n_run_key = %s
                      AND rl.fic_mis_date = %s;
                """, [n_run_key, fic_mis_date])
            else:
                cursor.execute("""
                    UPDATE fct_reporting_lines AS rl
                    SET
                        n_lifetime_ecl_ncy = COALESCE(fwd.total_fwd_loss, 0),
                        n_12m_ecl_ncy = COALESCE(fwd.total_12m_fwd_loss, 0)
                    FROM temp_forward_loss fwd
                    WHERE rl.n_account_number = fwd.v_account_number
                      AND rl.n_run_key = %s
                      AND rl.fic_mis_date = %s;
                """, [n_run_key, fic_mis_date])

        save_log(
            'update_ecl_based_on_forward_loss_sql',
            'INFO',
            f"Successfully updated ECL based on forward loss for run key {n_run_key}, date {fic_mis_date}."
        )
    except Exception as e:
        save_log('update_ecl_based_on_forward_loss_sql', 'ERROR', f"Error: {e}")


# ------------------------------------------------------------------------
# 5) ECL Calculation: Internal Formula
# ------------------------------------------------------------------------
def update_ecl_based_on_internal_calculations_sql(n_run_key, fic_mis_date):
    """
    SQL-based update of ECL using internal formula: EAD * PD * LGD.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            cursor.execute("""
                UPDATE fct_reporting_lines
                SET
                    n_lifetime_ecl_ncy = COALESCE(n_exposure_at_default_ncy, 0) * COALESCE(n_lifetime_pd, 0) * COALESCE(n_lgd_percent, 0),
                    n_12m_ecl_ncy = COALESCE(n_exposure_at_default_ncy, 0) * COALESCE(n_twelve_months_pd, 0) * COALESCE(n_lgd_percent, 0)
                WHERE n_run_key = %s AND fic_mis_date = %s;
            """, [n_run_key, fic_mis_date])

        save_log(
            'update_ecl_based_on_internal_calculations_sql',
            'INFO',
            f"Successfully updated ECL using internal formula for run key {n_run_key}, date {fic_mis_date}."
        )
    except Exception as e:
        save_log('update_ecl_based_on_internal_calculations_sql', 'ERROR', f"Error: {e}")


# ------------------------------------------------------------------------
# 4) Dispatcher for ECL Calculation
# ------------------------------------------------------------------------
def calculate_ecl_based_on_method(fic_mis_date):
    """
    Dispatch to the correct SQL-based ECL calculation method.
    """
    try:
        # Get the latest run key
        n_run_key = get_latest_run_skey()
        if not n_run_key:
            return '0'

        # Fetch the ECL method
        with connection.cursor() as cursor:
            cursor.execute("SELECT method_name, uses_discounting FROM dim_ecl_method LIMIT 1;")
            result = cursor.fetchone()
            if not result:
                save_log('calculate_ecl_based_on_method', 'ERROR', "No ECL method is defined in the dim_ecl_method table.")
                return '0'

            method_name, uses_discounting = result
            save_log(
                'calculate_ecl_based_on_method',
                'INFO',
                f"Using ECL Method: {method_name}, Discounting: {uses_discounting}, Run Key: {n_run_key}"
            )

        # Dispatch to the correct method
        if method_name == 'forward_exposure':
            update_ecl_based_on_forward_loss_sql(n_run_key, fic_mis_date, uses_discounting)
        elif method_name == 'cash_flow':
            update_ecl_based_on_cash_shortfall_sql(n_run_key, fic_mis_date, uses_discounting)
        elif method_name == 'simple_ead':
            update_ecl_based_on_internal_calculations_sql(n_run_key, fic_mis_date)
        else:
            save_log('calculate_ecl_based_on_method', 'ERROR', f"Unknown ECL method: {method_name}")
            return '0'

        save_log('calculate_ecl_based_on_method', 'INFO', "ECL calculation completed successfully.")
        return '1'

    except Exception as e:
        save_log('calculate_ecl_based_on_method', 'ERROR', f"Error calculating ECL: {e}")
        return '0'
