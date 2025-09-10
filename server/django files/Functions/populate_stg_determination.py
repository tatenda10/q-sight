from django.db import connection, transaction
from .save_log import save_log

def insert_fct_stage(fic_mis_date):
    """
    Inserts data into FCT_Stage_Determination table from Ldn_Financial_Instrument based on the given fic_mis_date.
    Deletes existing records for the same fic_mis_date before inserting. Uses a set-based SQL approach.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Step 1: Delete existing records for the given fic_mis_date
            cursor.execute("""
                DELETE FROM fct_stage_determination
                WHERE fic_mis_date = %s;
            """, [fic_mis_date])
            save_log(
                'insert_fct_stage', 
                'INFO', 
                f"Deleted existing records for {fic_mis_date} in FCT_Stage_Determination.", 
                status='SUCCESS'
            )

            # Step 2: Insert new records from ldn_financial_instrument
            cursor.execute("""
                INSERT INTO fct_stage_determination (
                    fic_mis_date,
                    n_account_number,
                    n_curr_interest_rate,
                    n_effective_interest_rate,
                    n_accrued_interest,
                    n_rate_chg_min,
                    n_accrual_basis_code,
                    n_pd_percent,
                    n_lgd_percent,
                    d_acct_start_date,
                    d_last_payment_date,
                    d_next_payment_date,
                    d_maturity_date,
                    v_ccy_code,
                    n_eop_prin_bal,
                    n_carrying_amount_ncy,
                    n_collateral_amount,
                    n_delinquent_days,
                    v_amrt_repayment_type,
                    v_amrt_term_unit,
                    n_prod_code,
                    n_cust_ref_code,
                    n_loan_type,
                    n_acct_rating_movement,
                    n_credit_rating_code,
                    n_org_credit_score,
                    n_curr_credit_score
                )
                SELECT 
                    fic_mis_date,
                    v_account_number,
                    n_curr_interest_rate,
                    n_effective_interest_rate,
                    n_accrued_interest,
                    n_interest_changing_rate,
                    v_day_count_ind,
                    n_pd_percent,
                    n_lgd_percent,
                    d_start_date,
                    d_last_payment_date,
                    d_next_payment_date,
                    d_maturity_date,
                    v_ccy_code,
                    n_eop_curr_prin_bal,
                    n_eop_bal,
                    n_collateral_amount,
                    n_delinquent_days,
                    v_amrt_repayment_type,
                    v_amrt_term_unit,
                    v_prod_code,
                    v_cust_ref_code,
                    v_loan_type,
                    v_acct_rating_movement,
                    v_credit_rating_code,
                    v_org_credit_score,
                    v_curr_credit_score
                FROM Ldn_financial_instrument
                WHERE fic_mis_date = %s;
            """, [fic_mis_date])

            # Log success
            save_log(
                'insert_fct_stage', 
                'INFO', 
                f"Records for {fic_mis_date} inserted successfully into FCT_Stage_Determination.", 
                status='SUCCESS'
            )
            return '1'  # Return '1' on successful completion

    except Exception as e:
        save_log(
            'insert_fct_stage', 
            'ERROR', 
            f"Error during FCT_Stage_Determination insertion process: {e}", 
            status='FAILURE'
        )
        return '0'  # Return '0' in case of any exception
