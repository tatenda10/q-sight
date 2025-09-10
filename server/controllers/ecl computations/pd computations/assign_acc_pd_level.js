const db = require('../../../config/database');

const calculateAccountLevelPDForAccounts = async (ficMisDate) => {
    const startTime = process.hrtime();
    console.log('Starting calculateAccountLevelPDForAccounts function...');
    console.log('Processing for FIC MIS Date:', ficMisDate);
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Check if we have PD data for this date
        console.log('Checking PD interpolation data...');
        const [pdCheck] = await connection.query(`
            SELECT 
                COUNT(*) as total_pd_records,
                COUNT(DISTINCT v_account_number) as unique_accounts,
                AVG(n_cumulative_default_prob) as avg_pd,
                COUNT(CASE WHEN n_cumulative_default_prob = 0 THEN 1 END) as zero_pd_count
            FROM fsi_pd_account_interpolated
            WHERE fic_mis_date = ?
        `, [ficMisDate]);
        console.log('PD data summary:', pdCheck[0]);

        // If no PD data exists, we should stop processing
        if (pdCheck[0].total_pd_records === 0) {
            throw new Error(`No PD data found in fsi_pd_account_interpolated for date ${ficMisDate}. Please ensure PD interpolation has been run first.`);
        }

        // Create a temporary table for intermediate results
        console.log('Creating temporary calculation table...');
        await connection.execute(`
            CREATE TEMPORARY TABLE temp_pd_calculation AS
            SELECT 
                sd.n_account_number,
                sd.fic_mis_date,
                sd.d_maturity_date,
                sd.v_amrt_term_unit,
                GREATEST(0, TIMESTAMPDIFF(MONTH, sd.fic_mis_date, sd.d_maturity_date)) AS months_to_maturity,
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
            WHERE sd.fic_mis_date = ?
              AND sd.d_maturity_date IS NOT NULL
        `, [ficMisDate]);

        // Modify the long-term accounts query with proper PD handling
        console.log('Creating temporary results table for long-term accounts...');
        await connection.execute(`
            CREATE TEMPORARY TABLE temp_pd_results_gt_12 AS
            SELECT 
                t.n_account_number,
                t.fic_mis_date,
                pd.n_cumulative_default_prob AS original_pd,
                CASE 
                    WHEN t.months_to_maturity <= 12 THEN pd.n_cumulative_default_prob
                    ELSE COALESCE(
                        (SELECT n_cumulative_default_prob 
                         FROM fsi_pd_account_interpolated pd2 
                         WHERE pd2.v_account_number = t.n_account_number 
                         AND pd2.fic_mis_date = t.fic_mis_date 
                         AND pd2.n_months = 12),
                        pd.n_cumulative_default_prob
                    )
                END AS n_twelve_months_pd,
                pd.n_cumulative_default_prob AS n_lifetime_pd
            FROM temp_pd_calculation t
            JOIN fsi_pd_account_interpolated pd
                ON pd.v_account_number = t.n_account_number
                AND pd.fic_mis_date = t.fic_mis_date
            WHERE CEIL(t.months_to_maturity / t.bucket_size) > t.twelve_month_cap
        `);

        // Modify the short-term accounts query with proper PD handling
        console.log('Creating temporary results table for short-term accounts...');
        await connection.execute(`
            CREATE TEMPORARY TABLE temp_pd_results_le_12 AS
            SELECT 
                t.n_account_number,
                t.fic_mis_date,
                pd.n_cumulative_default_prob AS n_twelve_months_pd,
                pd.n_cumulative_default_prob AS n_lifetime_pd
            FROM temp_pd_calculation t
            JOIN fsi_pd_account_interpolated pd
                ON pd.v_account_number = t.n_account_number
                AND pd.fic_mis_date = t.fic_mis_date
            WHERE CEIL(t.months_to_maturity / t.bucket_size) <= t.twelve_month_cap
        `);

        // After creating each temp results table, add result checks
        console.log('Checking long-term account results...');
        const [longTermCheck] = await connection.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN n_twelve_months_pd > 0 THEN 1 END) as non_zero_12m_pd,
                COUNT(CASE WHEN n_lifetime_pd > 0 THEN 1 END) as non_zero_lifetime_pd,
                AVG(n_twelve_months_pd) as avg_12m_pd,
                AVG(n_lifetime_pd) as avg_lifetime_pd
            FROM temp_pd_results_gt_12
        `);
        console.log('Long-term results summary:', longTermCheck[0]);

        console.log('Checking short-term account results...');
        const [shortTermCheck] = await connection.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN n_twelve_months_pd > 0 THEN 1 END) as non_zero_12m_pd,
                COUNT(CASE WHEN n_lifetime_pd > 0 THEN 1 END) as non_zero_lifetime_pd,
                AVG(n_twelve_months_pd) as avg_12m_pd,
                AVG(n_lifetime_pd) as avg_lifetime_pd
            FROM temp_pd_results_le_12
        `);
        console.log('Short-term results summary:', shortTermCheck[0]);

        // Bulk update for accounts with months_to_maturity > 12
        console.log('Updating long-term accounts...');
        await connection.execute(`
            UPDATE fct_stage_determination sd
            INNER JOIN temp_pd_results_gt_12 r
                ON sd.n_account_number = r.n_account_number
                AND sd.fic_mis_date = r.fic_mis_date
            SET 
                sd.n_twelve_months_pd = r.n_twelve_months_pd,
                sd.n_lifetime_pd = r.n_lifetime_pd
        `);

        // Bulk update for accounts with months_to_maturity <= 12
        console.log('Updating short-term accounts...');
        await connection.execute(`
            UPDATE fct_stage_determination sd
            INNER JOIN temp_pd_results_le_12 r
                ON sd.n_account_number = r.n_account_number
                AND sd.fic_mis_date = r.fic_mis_date
            SET 
                sd.n_twelve_months_pd = r.n_twelve_months_pd,
                sd.n_lifetime_pd = r.n_lifetime_pd
        `);

        // Add validation check after updates
        console.log('Checking for invalid PD combinations...');
        const [invalidPDs] = await connection.query(`
            SELECT 
                COUNT(*) as invalid_count,
                AVG(n_twelve_months_pd) as avg_12m_pd,
                AVG(n_lifetime_pd) as avg_lifetime_pd
            FROM fct_stage_determination
            WHERE fic_mis_date = ?
                AND n_twelve_months_pd > n_lifetime_pd
                AND n_lifetime_pd = 0
        `, [ficMisDate]);
        console.log('Invalid PD combinations found:', invalidPDs[0]);

        // After final updates, verify the results
        console.log('Verifying final results...');
        const [finalCheck] = await connection.query(`
            SELECT 
                COUNT(*) as total_updated,
                COUNT(CASE WHEN n_twelve_months_pd > 0 THEN 1 END) as non_zero_12m_pd,
                COUNT(CASE WHEN n_lifetime_pd > 0 THEN 1 END) as non_zero_lifetime_pd,
                AVG(n_twelve_months_pd) as avg_12m_pd,
                AVG(n_lifetime_pd) as avg_lifetime_pd
            FROM fct_stage_determination
            WHERE fic_mis_date = ?
        `, [ficMisDate]);
        console.log('Final results summary:', finalCheck[0]);

        // Drop temporary tables
        console.log('Cleaning up temporary tables...');
        await connection.execute('DROP TEMPORARY TABLE IF EXISTS temp_pd_calculation, temp_pd_results_gt_12, temp_pd_results_le_12');

        await connection.commit();
        console.log(`Account-level PD calculation completed for fic_mis_date=${ficMisDate}`);
        return 1; // Success

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error in calculateAccountLevelPDForAccounts:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
        return 0; // Failure

    } finally {
        if (connection) {
            connection.release();
        }
        const [totalSeconds, totalNanoseconds] = process.hrtime(startTime);
        const totalMilliseconds = (totalSeconds * 1000) + (totalNanoseconds / 1000000);
        console.log(`Total execution time: ${totalMilliseconds.toFixed(2)}ms`);
    }
};

module.exports = {
    calculateAccountLevelPDForAccounts
};
