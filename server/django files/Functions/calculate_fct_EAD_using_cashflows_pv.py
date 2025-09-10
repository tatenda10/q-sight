from django.db import connection, transaction
from IFRS9.models import FCT_Stage_Determination
from .save_log import save_log

def update_stage_determination_ead_with_cashflow_pv(fic_mis_date):
    """
    SQL-based approach to update FCT_Stage_Determination table's n_exposure_at_default field
    based on the sum of discounted cash flows from fsi_financial_cash_flow_cal.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Step 1: Fetch the latest run key
            cursor.execute("""
                SELECT latest_run_skey FROM dim_run LIMIT 1
            """)
            result = cursor.fetchone()
            if not result:
                save_log(
                    'update_stage_determination_ead_with_cashflow_pv',
                    'ERROR',
                    "No latest run key found in Dim_Run table."
                )
                return 0
            run_skey = result[0]

            # Step 2: Compute and update n_exposure_at_default
            cursor.execute("""
                UPDATE fct_stage_determination
                SET n_exposure_at_default = subquery.total_discounted_cash_flow
                FROM (
                    SELECT
                        fc.v_account_number,
                        SUM(fc.n_cash_flow_amount * fc.n_discount_factor) AS total_discounted_cash_flow
                    FROM fsi_financial_cash_flow_cal fc
                    WHERE fc.fic_mis_date = %s
                      AND fc.n_run_skey = %s
                    GROUP BY fc.v_account_number
                ) AS subquery
                WHERE fct_stage_determination.n_account_number = subquery.v_account_number
                  AND fct_stage_determination.fic_mis_date = %s
                  AND fct_stage_determination.n_exposure_at_default IS NULL
                  AND fct_stage_determination.n_prod_code IS NOT NULL;
            """, [fic_mis_date, run_skey, fic_mis_date])

        # Log success
        save_log(
            'update_stage_determination_ead_with_cashflow_pv',
            'INFO',
            f"Successfully updated EAD for FCT_Stage_Determination with fic_mis_date={fic_mis_date}."
        )
        return 1  # Success

    except Exception as e:
        # Log any error
        save_log(
            'update_stage_determination_ead_with_cashflow_pv',
            'ERROR',
            f"Exception during update process for fic_mis_date={fic_mis_date}: {e}"
        )
        return 0  # Failure
