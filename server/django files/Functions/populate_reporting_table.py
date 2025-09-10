from django.db import connection, transaction
from django.utils import timezone
from IFRS9.models import Dim_Run, FCT_Stage_Determination, ECLMethod
from .save_log import save_log


def get_next_run_skey():
    """
    Retrieve the next n_run_skey from the Dim_Run table.
    """
    try:
        
        with transaction.atomic():
            run_key_record, created = Dim_Run.objects.get_or_create(id=1)

            if created:
                run_key_record.latest_run_skey = 1
            else:
                run_key_record.latest_run_skey += 1

            run_key_record.date = timezone.now()
            run_key_record.save()

            return run_key_record.latest_run_skey

    except Exception as e:
        save_log('get_next_run_skey', 'ERROR', f"Error in getting next run skey: {e}")
        return 1  # Default value in case of error


def get_run_skey_for_method():
    """
    Retrieve or generate a run_skey based on ECL method.
    If the method is 'simple_ead', generate a new run_skey.
    """
    try:
        ecl_method = ECLMethod.objects.filter(method_name='simple_ead').first()
        if ecl_method:
            # Generate a new run_skey for 'simple_ead' method
            return get_next_run_skey()
        else:
            # Default behavior: use the latest run key from Dim_Run
            return Dim_Run.objects.latest('latest_run_skey').latest_run_skey
    except ECLMethod.DoesNotExist:
        save_log('get_run_skey_for_method', 'ERROR', "ECL Method 'simple_ead' does not exist.")
        return Dim_Run.objects.latest('latest_run_skey').latest_run_skey
    except Exception as e:
        save_log('get_run_skey_for_method', 'ERROR', f"Error retrieving run_skey: {e}")
        return None


def populate_fct_reporting_lines(mis_date):
    """
    Populate data in FCT_Reporting_Lines from FCT_Stage_Determination for the given `mis_date`.
    """
    try:
        # Retrieve the appropriate run_skey
        last_run_skey = get_run_skey_for_method()
        if not last_run_skey:
            save_log('populate_fct_reporting_lines', 'ERROR', "Failed to retrieve or generate run_skey.")
            return '0'

        with transaction.atomic(), connection.cursor() as cursor:
            # Bulk insert into FCT_Reporting_Lines
            cursor.execute("""
                INSERT INTO fct_reporting_lines (
                    n_run_key,
                    fic_mis_date,
                    n_account_number,
                    d_acct_start_date,
                    d_last_payment_date,
                    d_next_payment_date,
                    d_maturity_date,
                    n_acct_classification,
                    n_cust_ref_code,
                    n_partner_name,
                    n_party_type,
                    n_accrual_basis_code,
                    n_curr_interest_rate,
                    n_effective_interest_rate,
                    v_interest_freq_unit,
                    v_interest_method,
                    n_accrued_interest,
                    n_rate_chg_min,
                    n_carrying_amount_ncy,
                    n_exposure_at_default_ncy,
                    n_lgd_percent,
                    n_pd_percent,
                    n_twelve_months_orig_pd,
                    n_lifetime_orig_pd,
                    n_twelve_months_pd,
                    n_lifetime_pd,
                    n_pd_term_structure_skey,
                    n_pd_term_structure_name,
                    n_pd_term_structure_desc,
                    n_12m_pd_change,
                    v_amrt_repayment_type,
                    n_remain_no_of_pmts,
                    n_amrt_term,
                    v_amrt_term_unit,
                    v_ccy_code,
                    n_delinquent_days,
                    n_delq_band_code,
                    n_stage_descr,
                    n_curr_ifrs_stage_skey,
                    n_prev_ifrs_stage_skey,
                    d_cooling_start_date,
                    n_target_ifrs_stage_skey,
                    n_in_cooling_period_flag,
                    n_cooling_period_duration,
                    n_country,
                    n_segment_skey,
                    n_prod_segment,
                    n_prod_code,
                    n_prod_name,
                    n_prod_type,
                    n_prod_desc,
                    n_credit_rating_code,
                    n_org_credit_score,
                    n_curr_credit_score,
                    n_acct_rating_movement,
                    n_party_rating_movement,
                    n_conditionally_cancel_flag,
                    n_collateral_amount,
                    n_loan_type
                )
                SELECT 
                    %s AS n_run_key,
                    fic_mis_date,
                    n_account_number,
                    d_acct_start_date,
                    d_last_payment_date,
                    d_next_payment_date,
                    d_maturity_date,
                    n_acct_classification,
                    n_cust_ref_code,
                    n_partner_name,
                    n_party_type,
                    n_accrual_basis_code,
                    n_curr_interest_rate,
                    n_effective_interest_rate,
                    v_interest_freq_unit,
                    v_interest_method,
                    n_accrued_interest,
                    n_rate_chg_min,
                    n_carrying_amount_ncy,
                    n_exposure_at_default,
                    n_lgd_percent,
                    n_pd_percent,
                    n_twelve_months_orig_pd,
                    n_lifetime_orig_pd,
                    n_twelve_months_pd,
                    n_lifetime_pd,
                    n_pd_term_structure_skey,
                    n_pd_term_structure_name,
                    n_pd_term_structure_desc,
                    n_12m_pd_change,
                    v_amrt_repayment_type,
                    n_remain_no_of_pmts,
                    n_amrt_term,
                    v_amrt_term_unit,
                    v_ccy_code,
                    n_delinquent_days,
                    n_delq_band_code,
                    n_stage_descr,
                    n_curr_ifrs_stage_skey,
                    n_prev_ifrs_stage_skey,
                    d_cooling_start_date,
                    n_target_ifrs_stage_skey,
                    n_in_cooling_period_flag,
                    n_cooling_period_duration,
                    n_country,
                    n_segment_skey,
                    n_prod_segment,
                    n_prod_code,
                    n_prod_name,
                    n_prod_type,
                    n_prod_desc,
                    n_credit_rating_code,
                    n_org_credit_score,
                    n_curr_credit_score,
                    n_acct_rating_movement,
                    n_party_rating_movement,
                    n_conditionally_cancel_flag,
                    n_collateral_amount,
                    n_loan_type
                FROM fct_stage_determination
                WHERE fic_mis_date = %s;
            """, [last_run_skey, mis_date])

        save_log(
            'populate_fct_reporting_lines',
            'INFO',
            f"Successfully populated FCT_Reporting_Lines for `fic_mis_date`={mis_date}."
        )
        return '1'

    except Exception as e:
        save_log('populate_fct_reporting_lines', 'ERROR', f"Error populating FCT_Reporting_Lines: {e}")
        return '0'
