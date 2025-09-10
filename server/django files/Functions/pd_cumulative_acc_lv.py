from django.db import connection, transaction
from .save_log import save_log

def get_latest_run_skey_sql():
    """Retrieve the latest_run_skey from Dim_Run table using raw SQL."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT latest_run_skey FROM dim_run LIMIT 1;")
        row = cursor.fetchone()
        if not row:
            raise ValueError("No run key available in Dim_Run table.")
        return row[0]

def update_cash_flow_with_account_pd_buckets(fic_mis_date):
    """
    Updates the fsi_financial_cash_flow_cal table using account-level PD values from 
    fsi_pd_account_interpolated in a set-based manner.
    """
    try:
        # Retrieve the latest run_skey using raw SQL
        n_run_skey = get_latest_run_skey_sql()

        with transaction.atomic(), connection.cursor() as cursor:
            # First update: Set cumulative loss and impaired probabilities
            cursor.execute("""
                UPDATE fsi_financial_cash_flow_cal
                SET 
                    n_cumulative_loss_rate = pd.n_cumulative_default_prob * fsi_financial_cash_flow_cal.n_lgd_percent,
                    n_cumulative_impaired_prob = pd.n_cumulative_default_prob
                FROM fsi_pd_account_interpolated AS pd
                WHERE pd.v_account_number = fsi_financial_cash_flow_cal.v_account_number
                  AND pd.fic_mis_date = fsi_financial_cash_flow_cal.fic_mis_date
                  AND pd.v_cash_flow_bucket_id = fsi_financial_cash_flow_cal.n_cash_flow_bucket_id
                  AND fsi_financial_cash_flow_cal.fic_mis_date = %s
                  AND fsi_financial_cash_flow_cal.n_run_skey = %s;
            """, [fic_mis_date, n_run_skey])

            # Second update: Set 12-month cumulative PD based on bucket and term unit
            cursor.execute("""
                UPDATE fsi_financial_cash_flow_cal
                SET n_12m_cumulative_pd = pd.n_cumulative_default_prob
                FROM fsi_pd_account_interpolated AS pd
                WHERE pd.v_account_number = fsi_financial_cash_flow_cal.v_account_number
                  AND pd.fic_mis_date = fsi_financial_cash_flow_cal.fic_mis_date
                  AND pd.v_cash_flow_bucket_id = 
                      CASE 
                        WHEN fsi_financial_cash_flow_cal.n_cash_flow_bucket_id <= 
                            CASE fsi_financial_cash_flow_cal.v_amrt_term_unit
                                WHEN 'M' THEN 12
                                WHEN 'Q' THEN 4
                                WHEN 'H' THEN 2
                                WHEN 'Y' THEN 1
                                ELSE 12
                            END
                        THEN fsi_financial_cash_flow_cal.n_cash_flow_bucket_id
                        ELSE 
                            CASE fsi_financial_cash_flow_cal.v_amrt_term_unit
                                WHEN 'M' THEN 12
                                WHEN 'Q' THEN 4
                                WHEN 'H' THEN 2
                                WHEN 'Y' THEN 1
                                ELSE 12
                            END
                      END
                  AND fsi_financial_cash_flow_cal.fic_mis_date = %s
                  AND fsi_financial_cash_flow_cal.n_run_skey = %s;
            """, [fic_mis_date, n_run_skey])

        save_log('update_cash_flow_with_account_pd_buckets_sql', 'INFO', 
                 f"Successfully updated cash flows for run_skey {n_run_skey} and fic_mis_date {fic_mis_date}.")
        return 1

    except Exception as e:
        save_log('update_cash_flow_with_account_pd_buckets_sql', 'ERROR', 
                 f"Error updating cash flow for fic_mis_date {fic_mis_date}: {e}")
        return 0
