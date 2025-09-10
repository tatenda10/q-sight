from django.db import connection, transaction
from IFRS9.models import FCT_Stage_Determination
from .save_log import save_log


def update_stage_determination_EAD_w_ACCR(fic_mis_date):
    """
    Set-based SQL approach to update the n_exposure_at_default field in FCT_Stage_Determination
    by adding n_accrued_interest to n_carrying_amount_ncy.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Perform the set-based update
            cursor.execute("""
                UPDATE fct_stage_determination
                SET n_exposure_at_default = COALESCE(n_carrying_amount_ncy, 0) + COALESCE(n_accrued_interest, 0)
                WHERE fic_mis_date = %s
                  AND n_exposure_at_default IS NULL;
            """, [fic_mis_date])

        # Log success
        save_log(
            'update_stage_determination_EAD_w_ACCR',
            'INFO',
            f"Successfully updated n_exposure_at_default for fic_mis_date={fic_mis_date}."
        )
        return 1  # Success

    except Exception as e:
        # Log any error
        save_log(
            'update_stage_determination_EAD_w_ACCR',
            'ERROR',
            f"Exception during EAD update for fic_mis_date={fic_mis_date}: {e}"
        )
        return 0  # Failure
