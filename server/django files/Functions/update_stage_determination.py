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


def update_stage_determination(mis_date):
    """
    Set-based update of various fields in FCT_Stage_Determination for a given mis_date by joining with related tables.
    Compatible with PostgreSQL.
    """
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Update product-related fields
                cursor.execute("""
                    UPDATE fct_stage_determination AS sd
                    SET 
                        n_prod_segment = p.v_prod_segment,
                        n_prod_name = p.v_prod_name,
                        n_prod_type = p.v_prod_type,
                        n_prod_desc = p.v_prod_desc
                    FROM ldn_bank_product_info AS p
                    WHERE p.v_prod_code = sd.n_prod_code
                      AND sd.fic_mis_date = %s;
                """, [mis_date])

                # Update segment key
                cursor.execute("""
                    UPDATE fct_stage_determination AS sd
                    SET n_segment_skey = s.segment_id
                    FROM fsi_product_segment AS s
                    WHERE s.v_prod_segment = sd.n_prod_segment
                      AND s.v_prod_type = sd.n_prod_type
                      AND sd.fic_mis_date = %s;
                """, [mis_date])

                # Update PD term structure key
                cursor.execute("""
                    UPDATE fct_stage_determination
                    SET n_pd_term_structure_skey = n_segment_skey
                    WHERE fic_mis_date = %s;
                """, [mis_date])

                # Update collateral amount where missing
                cursor.execute("""
                    UPDATE fct_stage_determination AS sd
                    SET n_collateral_amount = c.total
                    FROM lgd_collateral AS c
                    WHERE c.v_cust_ref_code = sd.n_cust_ref_code
                      AND c.fic_mis_date = sd.fic_mis_date
                      AND sd.fic_mis_date = %s
                      AND (sd.n_collateral_amount IS NULL OR sd.n_collateral_amount = 0);
                """, [mis_date])

                # Update delinquency band code
                cursor.execute("""
                    UPDATE fct_stage_determination AS sd
                    SET n_delq_band_code = band.n_delq_band_code
                    FROM dim_delinquency_band AS band
                    WHERE sd.n_delinquent_days BETWEEN band.n_delq_lower_value AND band.n_delq_upper_value
                      AND band.v_amrt_term_unit = sd.v_amrt_term_unit
                      AND sd.fic_mis_date = %s;
                """, [mis_date])

                # Update customer info
                cursor.execute("""
                    UPDATE fct_stage_determination AS sd
                    SET 
                        n_partner_name = ci.v_partner_name,
                        n_party_type = ci.v_party_type
                    FROM ldn_customer_info AS ci
                    WHERE ci.v_party_id = sd.n_cust_ref_code
                      AND sd.fic_mis_date = %s;
                """, [mis_date])

                # Update PD term structure info
                cursor.execute("""
                    UPDATE fct_stage_determination AS sd
                    SET 
                        n_pd_term_structure_name = pdt.v_pd_term_structure_desc,
                        n_pd_term_structure_desc = pdt.v_pd_term_structure_desc
                    FROM ldn_pd_term_structure AS pdt
                    WHERE pdt.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                      AND sd.fic_mis_date = %s;
                """, [mis_date])

                # Update customer rating detail if missing
                cursor.execute("""
                    UPDATE fct_stage_determination AS sd
                    SET n_credit_rating_code = rd.v_rating_code
                    FROM ldn_customer_rating_detail AS rd
                    WHERE rd.fic_mis_date = sd.fic_mis_date
                      AND rd.v_party_cd = sd.n_cust_ref_code
                      AND sd.fic_mis_date = %s
                      AND sd.n_credit_rating_code IS NULL;
                """, [mis_date])

                # Update account rating movement
                cursor.execute("""
                    UPDATE fct_stage_determination
                    SET n_acct_rating_movement = n_org_credit_score - n_curr_credit_score
                    WHERE fic_mis_date = %s
                      AND n_org_credit_score IS NOT NULL
                      AND n_curr_credit_score IS NOT NULL;
                """, [mis_date])

        save_log('update_stage_determination_setbased', 'INFO',
                 f"Set-based update completed for mis_date={mis_date}.")
        return '1'

    except Exception as e:
        save_log('update_stage_determination_setbased', 'ERROR', f"Error during set-based update: {e}")
        return '0'
