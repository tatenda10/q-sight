from decimal import Decimal
from django.db import connection, transaction
from .save_log import save_log

MAX_EIR = Decimal('999.99999999999')  # Max value with 15 digits and 11 decimal places
MIN_EIR = Decimal('0')                # Minimum EIR value (non-negative)

def update_eir_using_intrest_rate(fic_mis_date):
    """
    Set-based SQL approach to update Effective Interest Rate (EIR) for accounts in FCT_Stage_Determination.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # SQL to calculate and update EIR
            cursor.execute("""
                UPDATE fct_stage_determination
                SET n_effective_interest_rate = (
                    CASE
                        WHEN n_curr_interest_rate IS NOT NULL AND v_amrt_term_unit IS NOT NULL THEN
                            CASE v_amrt_term_unit
                                WHEN 'D' THEN ROUND(POWER((1 + n_curr_interest_rate / 100 / 365), 365) - 1, 11)
                                WHEN 'W' THEN ROUND(POWER((1 + n_curr_interest_rate / 100 / 52), 52) - 1, 11)
                                WHEN 'M' THEN ROUND(POWER((1 + n_curr_interest_rate / 100 / 12), 12) - 1, 11)
                                WHEN 'Q' THEN ROUND(POWER((1 + n_curr_interest_rate / 100 / 4), 4) - 1, 11)
                                WHEN 'H' THEN ROUND(POWER((1 + n_curr_interest_rate / 100 / 2), 2) - 1, 11)
                                WHEN 'Y' THEN ROUND(POWER((1 + n_curr_interest_rate / 100), 1) - 1, 11)
                                ELSE NULL
                            END
                        ELSE NULL
                    END
                )
                WHERE fic_mis_date = %s
                  AND n_effective_interest_rate IS NULL
                  AND n_curr_interest_rate IS NOT NULL;
            """, [fic_mis_date])

            # Clamp the EIR to the defined MIN_EIR and MAX_EIR values
            cursor.execute("""
                UPDATE fct_stage_determination
                SET n_effective_interest_rate = LEAST(GREATEST(n_effective_interest_rate, %s), %s)
                WHERE fic_mis_date = %s AND n_effective_interest_rate IS NOT NULL;
            """, [MIN_EIR, MAX_EIR, fic_mis_date])

        # Log success
        save_log(
            'update_stage_determination_eir',
            'INFO',
            f"Successfully updated EIR for records with fic_mis_date={fic_mis_date}."
        )
        return 1  # Success

    except Exception as e:
        save_log(
            'update_stage_determination_eir',
            'ERROR',
            f"Error during EIR update for fic_mis_date={fic_mis_date}: {e}"
        )
        return 0  # Failure
