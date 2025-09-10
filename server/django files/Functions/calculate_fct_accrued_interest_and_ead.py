from django.db import connection, transaction
from IFRS9.models import FCT_Stage_Determination
from .save_log import save_log


def update_stage_determination_accrued_interest_and_ead(fic_mis_date):
    """
    SQL-based implementation to update n_accrued_interest and n_exposure_at_default fields in FCT_Stage_Determination.

    1) Precompute accrued interest for each account in one SQL aggregation query.
    2) Use SQL joins to calculate and update EAD in a single query.

    :param fic_mis_date: MIS date to filter records.
    :return: 1 if updates occur, else 0.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Step 1: Precompute accrued interest
            cursor.execute("""
                UPDATE fct_stage_determination
                SET n_accrued_interest = subquery.total_accrued_interest
                FROM (
                    SELECT 
                        ec.v_account_number,
                        SUM(ec.n_accrued_interest) AS total_accrued_interest
                    FROM fsi_expected_cashflow ec
                    WHERE ec.fic_mis_date = %s
                    GROUP BY ec.v_account_number
                ) AS subquery
                WHERE fct_stage_determination.v_account_number = subquery.v_account_number
                  AND fct_stage_determination.fic_mis_date = %s
                  AND fct_stage_determination.n_accrued_interest IS NULL
                  AND fct_stage_determination.n_prod_code IS NOT NULL;
            """, [fic_mis_date, fic_mis_date])

            # Step 2: Calculate and update EAD
            cursor.execute("""
                UPDATE fct_stage_determination
                SET n_exposure_at_default = (
                    COALESCE(n_carrying_amount_ncy, 0) + COALESCE(n_accrued_interest, 0)
                )
                WHERE fic_mis_date = %s
                  AND n_exposure_at_default IS NULL
                  AND n_prod_code IS NOT NULL;
            """, [fic_mis_date])

        # Log success
        save_log(
            'update_stage_determination_accrued_interest_and_ead',
            'INFO',
            f"Successfully updated accrued interest and EAD for FCT_Stage_Determination with fic_mis_date={fic_mis_date}."
        )
        return 1  # Success

    except Exception as e:
        # Log any error
        save_log(
            'update_stage_determination_accrued_interest_and_ead',
            'ERROR',
            f"Exception during update process for fic_mis_date={fic_mis_date}: {e}"
        )
        return 0  # Failure
