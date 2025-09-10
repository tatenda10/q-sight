from django.db import connection, transaction
from .save_log import save_log

def calculate_account_level_pd_for_accounts_sql(fic_mis_date):
    """
    Set-based account-level PD calculation using raw SQL for PostgreSQL.
    Optimized for speed with indexed queries and minimized computations.
    """
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            # Create a temporary table for intermediate results
            cursor.execute("""
                CREATE TEMP TABLE temp_pd_calculation AS
                SELECT 
                    sd.n_account_number,
                    sd.fic_mis_date,
                    sd.d_maturity_date,
                    sd.v_amrt_term_unit,
                    ((EXTRACT(YEAR FROM sd.d_maturity_date) - EXTRACT(YEAR FROM sd.fic_mis_date)) * 12 
                     + (EXTRACT(MONTH FROM sd.d_maturity_date) - EXTRACT(MONTH FROM sd.fic_mis_date))) AS months_to_maturity,
                    CASE 
                        WHEN sd.v_amrt_term_unit = 'M' THEN 1
                        WHEN sd.v_amrt_term_unit = 'Q' THEN 3
                        WHEN sd.v_amrt_term_unit = 'H' THEN 6
                        WHEN sd.v_amrt_term_unit = 'Y' THEN 12
                        ELSE 1
                    END AS bucket_size,
                    CEIL(12.0 / CASE 
                        WHEN sd.v_amrt_term_unit = 'M' THEN 1
                        WHEN sd.v_amrt_term_unit = 'Q' THEN 3
                        WHEN sd.v_amrt_term_unit = 'H' THEN 6
                        WHEN sd.v_amrt_term_unit = 'Y' THEN 12
                        ELSE 1
                    END) AS twelve_month_cap
                FROM fct_stage_determination sd
                WHERE sd.fic_mis_date = %s
                  AND sd.d_maturity_date IS NOT NULL;
            """, [fic_mis_date])

            # Precompute PD values for accounts with months_to_maturity > 12
            cursor.execute("""
                CREATE TEMP TABLE temp_pd_results_gt_12 AS
                SELECT 
                    t.n_account_number,
                    t.fic_mis_date,
                    COALESCE(
                        (CASE 
                            WHEN CEIL(t.months_to_maturity / t.bucket_size) > t.twelve_month_cap THEN pd.n_cumulative_default_prob
                            ELSE NULL
                        END),
                        0
                    ) AS n_twelve_months_pd,
                    pd.n_cumulative_default_prob AS n_lifetime_pd
                FROM temp_pd_calculation t
                JOIN fsi_pd_account_interpolated pd
                  ON pd.v_account_number = t.n_account_number
                  AND pd.fic_mis_date = t.fic_mis_date
                WHERE CEIL(t.months_to_maturity / t.bucket_size) > t.twelve_month_cap;
            """)

            # Precompute PD values for accounts with months_to_maturity <= 12
            cursor.execute("""
                CREATE TEMP TABLE temp_pd_results_le_12 AS
                SELECT 
                    t.n_account_number,
                    t.fic_mis_date,
                    COALESCE(
                        (CASE 
                            WHEN CEIL(t.months_to_maturity / t.bucket_size) <= t.twelve_month_cap THEN pd.n_cumulative_default_prob
                            ELSE NULL
                        END),
                        0
                    ) AS n_twelve_months_pd,
                    pd.n_cumulative_default_prob AS n_lifetime_pd
                FROM temp_pd_calculation t
                JOIN fsi_pd_account_interpolated pd
                  ON pd.v_account_number = t.n_account_number
                  AND pd.fic_mis_date = t.fic_mis_date
                WHERE CEIL(t.months_to_maturity / t.bucket_size) <= t.twelve_month_cap;
            """)

            # Bulk update for accounts with months_to_maturity > 12
            cursor.execute("""
                UPDATE fct_stage_determination sd
                SET 
                    n_twelve_months_pd = r.n_twelve_months_pd,
                    n_lifetime_pd = r.n_lifetime_pd
                FROM temp_pd_results_gt_12 r
                WHERE sd.n_account_number = r.n_account_number
                  AND sd.fic_mis_date = r.fic_mis_date;
            """)

            # Bulk update for accounts with months_to_maturity <= 12
            cursor.execute("""
                UPDATE fct_stage_determination sd
                SET 
                    n_twelve_months_pd = r.n_twelve_months_pd,
                    n_lifetime_pd = r.n_lifetime_pd
                FROM temp_pd_results_le_12 r
                WHERE sd.n_account_number = r.n_account_number
                  AND sd.fic_mis_date = r.fic_mis_date;
            """)

            # Drop temporary tables to clean up
            cursor.execute("DROP TABLE IF EXISTS temp_pd_calculation, temp_pd_results_gt_12, temp_pd_results_le_12;")

        save_log('calculate_account_level_pd_for_accounts_sql', 'INFO', 
                 f"Account-level PD calculation completed for fic_mis_date={fic_mis_date}.")
        return 1

    except Exception as e:
        save_log('calculate_account_level_pd_for_accounts_sql', 'ERROR', 
                 f"Error during account-level PD calculation: {str(e)}")
        return 0
