from django.db import connection, transaction
from IFRS9.models import FCT_Stage_Determination
from .save_log import save_log

def calculate_pd_for_accounts(fic_mis_date):
    """
    Set-based update for calculating and updating PDs (Probability of Default).
    Optimized with temporary tables for PostgreSQL.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Update PD values for Rating-Based Term Structures
            cursor.execute("""
                CREATE TEMP TABLE temp_rating_based_pd AS
                SELECT 
                    sd.n_account_number,
                    sd.n_pd_term_structure_skey,
                    sd.n_credit_rating_code,
                    ((EXTRACT(YEAR FROM sd.d_maturity_date) - EXTRACT(YEAR FROM sd.fic_mis_date)) * 12 
                     + (EXTRACT(MONTH FROM sd.d_maturity_date) - EXTRACT(MONTH FROM sd.fic_mis_date))) AS months_to_maturity,
                    CASE 
                        WHEN ts.v_pd_term_frequency_unit = 'M' THEN 1
                        WHEN ts.v_pd_term_frequency_unit = 'Q' THEN 3
                        WHEN ts.v_pd_term_frequency_unit = 'H' THEN 6
                        WHEN ts.v_pd_term_frequency_unit = 'Y' THEN 12
                        ELSE 1
                    END AS bucket_size,
                    LEAST(
                        GREATEST(
                            CEIL(((EXTRACT(YEAR FROM sd.d_maturity_date) - EXTRACT(YEAR FROM sd.fic_mis_date)) * 12 
                                  + (EXTRACT(MONTH FROM sd.d_maturity_date) - EXTRACT(MONTH FROM sd.fic_mis_date))) /
                                  CASE 
                                    WHEN ts.v_pd_term_frequency_unit = 'M' THEN 1
                                    WHEN ts.v_pd_term_frequency_unit = 'Q' THEN 3
                                    WHEN ts.v_pd_term_frequency_unit = 'H' THEN 6
                                    WHEN ts.v_pd_term_frequency_unit = 'Y' THEN 12
                                    ELSE 1
                                  END),
                            1
                        ),
                        CEIL(12.0 / CASE 
                            WHEN ts.v_pd_term_frequency_unit = 'M' THEN 1
                            WHEN ts.v_pd_term_frequency_unit = 'Q' THEN 3
                            WHEN ts.v_pd_term_frequency_unit = 'H' THEN 6
                            WHEN ts.v_pd_term_frequency_unit = 'Y' THEN 12
                            ELSE 1
                        END)
                    ) AS n_twelve_months_bucket,
                    CEIL(((EXTRACT(YEAR FROM sd.d_maturity_date) - EXTRACT(YEAR FROM sd.fic_mis_date)) * 12 
                         + (EXTRACT(MONTH FROM sd.d_maturity_date) - EXTRACT(MONTH FROM sd.fic_mis_date))) /
                         CASE 
                            WHEN ts.v_pd_term_frequency_unit = 'M' THEN 1
                            WHEN ts.v_pd_term_frequency_unit = 'Q' THEN 3
                            WHEN ts.v_pd_term_frequency_unit = 'H' THEN 6
                            WHEN ts.v_pd_term_frequency_unit = 'Y' THEN 12
                            ELSE 1
                         END) AS n_lifetime_bucket
                FROM fct_stage_determination sd
                JOIN ldn_pd_term_structure ts
                  ON ts.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                WHERE ts.v_pd_term_structure_type = 'R'
                  AND sd.fic_mis_date = %s
                  AND sd.d_maturity_date IS NOT NULL;
            """, [fic_mis_date])

            cursor.execute("""
                CREATE TEMP TABLE temp_rating_based_results AS
                SELECT 
                    t.n_account_number,
                    t.n_pd_term_structure_skey,
                    t.n_twelve_months_bucket,
                    t.n_lifetime_bucket,
                    COALESCE(
                        (SELECT pd12.n_cumulative_default_prob
                         FROM fsi_pd_interpolated pd12
                         WHERE pd12.v_pd_term_structure_id = t.n_pd_term_structure_skey
                           AND pd12.v_cash_flow_bucket_id = t.n_twelve_months_bucket
                           AND pd12.v_int_rating_code = t.n_credit_rating_code),
                        0
                    ) AS n_twelve_months_pd,
                    COALESCE(
                        (SELECT pd12.n_cumulative_default_prob
                         FROM fsi_pd_interpolated pd12
                         WHERE pd12.v_pd_term_structure_id = t.n_pd_term_structure_skey
                           AND pd12.v_cash_flow_bucket_id = t.n_lifetime_bucket
                           AND pd12.v_int_rating_code = t.n_credit_rating_code),
                        0
                    ) AS n_lifetime_pd
                FROM temp_rating_based_pd t;
            """)

            cursor.execute("""
                UPDATE fct_stage_determination sd
                SET 
                    n_twelve_months_pd = r.n_twelve_months_pd,
                    n_lifetime_pd = r.n_lifetime_pd
                FROM temp_rating_based_results r
                WHERE sd.n_account_number = r.n_account_number
                  AND sd.n_pd_term_structure_skey = r.n_pd_term_structure_skey
                  AND sd.fic_mis_date = %s;
            """, [fic_mis_date])

            # Update PD values for Delinquency-Based Term Structures
            cursor.execute("""
                CREATE TEMP TABLE temp_delinquency_based_pd AS
                SELECT 
                    sd.n_account_number,
                    sd.n_pd_term_structure_skey,
                    sd.n_delq_band_code,
                    ((EXTRACT(YEAR FROM sd.d_maturity_date) - EXTRACT(YEAR FROM sd.fic_mis_date)) * 12 
                     + (EXTRACT(MONTH FROM sd.d_maturity_date) - EXTRACT(MONTH FROM sd.fic_mis_date))) AS months_to_maturity,
                    CASE 
                        WHEN ts.v_pd_term_frequency_unit = 'M' THEN 1
                        WHEN ts.v_pd_term_frequency_unit = 'Q' THEN 3
                        WHEN ts.v_pd_term_frequency_unit = 'H' THEN 6
                        WHEN ts.v_pd_term_frequency_unit = 'Y' THEN 12
                        ELSE 1
                    END AS bucket_size,
                    LEAST(
                        GREATEST(
                            CEIL(((EXTRACT(YEAR FROM sd.d_maturity_date) - EXTRACT(YEAR FROM sd.fic_mis_date)) * 12 
                                  + (EXTRACT(MONTH FROM sd.d_maturity_date) - EXTRACT(MONTH FROM sd.fic_mis_date))) /
                                  CASE 
                                    WHEN ts.v_pd_term_frequency_unit = 'M' THEN 1
                                    WHEN ts.v_pd_term_frequency_unit = 'Q' THEN 3
                                    WHEN ts.v_pd_term_frequency_unit = 'H' THEN 6
                                    WHEN ts.v_pd_term_frequency_unit = 'Y' THEN 12
                                    ELSE 1
                                  END),
                            1
                        ),
                        CEIL(12.0 / CASE 
                            WHEN ts.v_pd_term_frequency_unit = 'M' THEN 1
                            WHEN ts.v_pd_term_frequency_unit = 'Q' THEN 3
                            WHEN ts.v_pd_term_frequency_unit = 'H' THEN 6
                            WHEN ts.v_pd_term_frequency_unit = 'Y' THEN 12
                            ELSE 1
                        END)
                    ) AS n_twelve_months_bucket,
                    CEIL(((EXTRACT(YEAR FROM sd.d_maturity_date) - EXTRACT(YEAR FROM sd.fic_mis_date)) * 12 
                         + (EXTRACT(MONTH FROM sd.d_maturity_date) - EXTRACT(MONTH FROM sd.fic_mis_date))) /
                         CASE 
                            WHEN ts.v_pd_term_frequency_unit = 'M' THEN 1
                            WHEN ts.v_pd_term_frequency_unit = 'Q' THEN 3
                            WHEN ts.v_pd_term_frequency_unit = 'H' THEN 6
                            WHEN ts.v_pd_term_frequency_unit = 'Y' THEN 12
                            ELSE 1
                         END) AS n_lifetime_bucket
                FROM fct_stage_determination sd
                JOIN ldn_pd_term_structure ts
                  ON ts.v_pd_term_structure_id = sd.n_pd_term_structure_skey
                WHERE ts.v_pd_term_structure_type = 'D'
                  AND sd.fic_mis_date = %s
                  AND sd.d_maturity_date IS NOT NULL;
            """, [fic_mis_date])

            cursor.execute("""
                CREATE TEMP TABLE temp_delinquency_based_results AS
                SELECT 
                    t.n_account_number,
                    t.n_pd_term_structure_skey,
                    t.n_twelve_months_bucket,
                    t.n_lifetime_bucket,
                    COALESCE(
                        (SELECT pd12.n_cumulative_default_prob
                         FROM fsi_pd_interpolated pd12
                         WHERE pd12.v_pd_term_structure_id = t.n_pd_term_structure_skey
                           AND pd12.v_cash_flow_bucket_id = t.n_twelve_months_bucket
                           AND pd12.v_delq_band_code = t.n_delq_band_code),
                        0
                    ) AS n_twelve_months_pd,
                    COALESCE(
                        (SELECT pd12.n_cumulative_default_prob
                         FROM fsi_pd_interpolated pd12
                         WHERE pd12.v_pd_term_structure_id = t.n_pd_term_structure_skey
                           AND pd12.v_cash_flow_bucket_id = t.n_lifetime_bucket
                           AND pd12.v_delq_band_code = t.n_delq_band_code),
                        0
                    ) AS n_lifetime_pd
                FROM temp_delinquency_based_pd t;
            """)

            cursor.execute("""
                UPDATE fct_stage_determination sd
                SET 
                    n_twelve_months_pd = r.n_twelve_months_pd,
                    n_lifetime_pd = r.n_lifetime_pd
                FROM temp_delinquency_based_results r
                WHERE sd.n_account_number = r.n_account_number
                  AND sd.n_pd_term_structure_skey = r.n_pd_term_structure_skey
                  AND sd.fic_mis_date = %s;
            """, [fic_mis_date])

            # Drop temporary tables to clean up
            cursor.execute("DROP TABLE IF EXISTS temp_rating_based_pd, temp_rating_based_results, temp_delinquency_based_pd, temp_delinquency_based_results;")

        save_log('calculate_pd_set_based', 'INFO', f"Set-based PD calculation completed for fic_mis_date={fic_mis_date}.")
        return 1

    except Exception as e:
        save_log('calculate_pd_set_based', 'ERROR', f"Error during set-based PD calculation: {str(e)}")
        return 0
