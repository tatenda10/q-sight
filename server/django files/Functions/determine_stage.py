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

def update_stage(mis_date):
    """
    Set-based updates for determining stages using credit ratings and DPD mappings.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Update stages using credit ratings
            cursor.execute("""
                UPDATE fct_stage_determination
                SET 
                    n_stage_descr = crs.stage,
                    n_curr_ifrs_stage_skey = 
                        CASE crs.stage
                            WHEN 'Stage 1' THEN 1
                            WHEN 'Stage 2' THEN 2
                            WHEN 'Stage 3' THEN 3
                            ELSE NULL
                        END
                FROM fsi_creditrating_stage AS crs
                WHERE crs.credit_rating = fct_stage_determination.n_credit_rating_code
                  AND fct_stage_determination.fic_mis_date = %s;
            """, [mis_date])

            # Update stages using DPD stage mappings
            cursor.execute("""
                UPDATE fct_stage_determination
                SET 
                    n_stage_descr = 
                        CASE 
                            WHEN n_delinquent_days <= dpd.stage_1_threshold THEN 'Stage 1'
                            WHEN n_delinquent_days > dpd.stage_1_threshold 
                              AND n_delinquent_days <= dpd.stage_2_threshold THEN 'Stage 2'
                            ELSE 'Stage 3'
                        END,
                    n_curr_ifrs_stage_skey = 
                        CASE 
                            WHEN n_delinquent_days <= dpd.stage_1_threshold THEN 1
                            WHEN n_delinquent_days > dpd.stage_1_threshold 
                              AND n_delinquent_days <= dpd.stage_2_threshold THEN 2
                            ELSE 3
                        END
                FROM fsi_dpd_stage_mapping AS dpd
                WHERE dpd.payment_frequency = fct_stage_determination.v_amrt_term_unit
                  AND fct_stage_determination.fic_mis_date = %s 
                  AND fct_stage_determination.n_credit_rating_code IS NULL;
            """, [mis_date])

            # Update previous IFRS stage
            cursor.execute("""
                UPDATE fct_stage_determination
                SET n_prev_ifrs_stage_skey = prev_sd.prev_stage
                FROM (
                    SELECT 
                        n_account_number, 
                        MAX(fic_mis_date) AS prev_date,
                        n_curr_ifrs_stage_skey AS prev_stage
                    FROM fct_stage_determination
                    WHERE fic_mis_date < %s
                    GROUP BY n_account_number, n_curr_ifrs_stage_skey
                ) AS prev_sd
                WHERE prev_sd.n_account_number = fct_stage_determination.n_account_number
                  AND fct_stage_determination.fic_mis_date = %s;
            """, [mis_date, mis_date])

        save_log('update_stages_set_based', 'INFO', f"Set-based stage update completed for mis_date={mis_date}.")
        return 1

    except Exception as e:
        save_log('update_stages_set_based', 'ERROR', f"Error during set-based update for mis_date={mis_date}: {e}")
        return 0
