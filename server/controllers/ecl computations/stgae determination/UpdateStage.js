const db = require('../../../config/database');
const { format } = require('date-fns');

// Helper function to get latest run key
const getLatestRunSkey = async () => {
    let connection;
    try {
        connection = await db.getConnection();
        
        // Using MAX() to get the latest run key
        const [rows] = await connection.query(`
            SELECT MAX(latest_run_skey) AS max_run_skey 
            FROM dim_run;
        `);
        
        if (rows && rows.length > 0 && rows[0].max_run_skey !== null) {
            return rows[0].max_run_skey;
        }
        
        console.error("No run key available in dim_run table");
        return null;
        
    } catch (error) {
        console.error(`Error fetching run key: ${error.message}`);
        return null;
    } finally {
        if (connection) connection.release();
    }
};

const updateStage = async (misDate) => {
    const startTime = process.hrtime();
    console.log('Starting updateStage function...');
    const connection = await db.getConnection();
    console.log('Database connection established');

    const logTimeElapsed = (operation) => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const milliseconds = (seconds * 1000) + (nanoseconds / 1000000);
        console.log(`${operation} - Time elapsed: ${milliseconds.toFixed(2)}ms`);
    };

    try {
        const formattedMisDate = format(new Date(misDate), 'yyyy-MM-dd');
        
        // Get the latest run key
        console.log('Getting latest run key...');
        const latestRunKey = await getLatestRunSkey();
        if (!latestRunKey) {
            throw new Error('Failed to get latest run key');
        }
        console.log(`Latest run key: ${latestRunKey}`);
        logTimeElapsed('Get latest run key');

        // Update stages using credit ratings
        console.log('Updating stages using credit ratings...');
        await connection.execute(`
            UPDATE fct_stage_determination fsd
            INNER JOIN fsi_creditrating_stage crs ON crs.credit_rating = fsd.n_credit_rating_code
            SET 
                fsd.n_stage_descr = crs.stage,
                fsd.n_curr_ifrs_stage_skey = 
                    CASE crs.stage
                        WHEN 'Stage 1' THEN 1
                        WHEN 'Stage 2' THEN 2
                        WHEN 'Stage 3' THEN 3
                        ELSE NULL
                    END
            WHERE fsd.fic_mis_date = ?
            AND fsd.n_run_key = ?
            AND fsd.n_credit_rating_code IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        logTimeElapsed('Credit rating stage update');

        // Update stages using DPD stage mappings
        console.log('Updating stages using DPD mappings...');
        await connection.execute(`
            UPDATE fct_stage_determination fsd
            SET 
                n_curr_ifrs_stage_skey = 
                    CASE 
                        WHEN n_delinquent_days <= 30 THEN 1
                        WHEN n_delinquent_days > 30 AND n_delinquent_days <= 90 THEN 2
                        WHEN n_delinquent_days > 90 THEN 3
                        ELSE n_curr_ifrs_stage_skey
                    END,
                n_stage_descr = 
                    CASE 
                        WHEN n_delinquent_days <= 30 THEN 'Stage 1'
                        WHEN n_delinquent_days > 30 AND n_delinquent_days <= 90 THEN 'Stage 2'
                        WHEN n_delinquent_days > 90 THEN 'Stage 3'
                        ELSE n_stage_descr
                    END
            WHERE fic_mis_date = ?
            AND n_run_key = ?
            AND (n_credit_rating_code IS NULL OR n_credit_rating_code = '')
            AND n_delinquent_days IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        logTimeElapsed('DPD stage update');

        // Update previous IFRS stage
        console.log('Updating previous IFRS stages...');
        await connection.execute(`
            UPDATE fct_stage_determination fsd
            INNER JOIN (
                SELECT 
                    n_account_number, 
                    MAX(fic_mis_date) AS prev_date,
                    n_curr_ifrs_stage_skey AS prev_stage
                FROM fct_stage_determination
                WHERE fic_mis_date < ?
                AND n_run_key = ?
                GROUP BY n_account_number, n_curr_ifrs_stage_skey
            ) prev_sd ON prev_sd.n_account_number = fsd.n_account_number
            SET fsd.n_prev_ifrs_stage_skey = prev_sd.prev_stage
            WHERE fsd.fic_mis_date = ?
            AND fsd.n_run_key = ?
        `, [formattedMisDate, latestRunKey, formattedMisDate, latestRunKey]);
        logTimeElapsed('Previous stage update');

        // Log the update results
        const [updateResults] = await connection.execute(`
            SELECT 
                n_curr_ifrs_stage_skey,
                COUNT(*) as count,
                MIN(n_delinquent_days) as min_dpd,
                MAX(n_delinquent_days) as max_dpd,
                COUNT(CASE WHEN n_credit_rating_code IS NOT NULL THEN 1 END) as rating_based,
                COUNT(CASE WHEN n_credit_rating_code IS NULL THEN 1 END) as dpd_based
            FROM fct_stage_determination
            WHERE fic_mis_date = ?
            AND n_run_key = ?
            GROUP BY n_curr_ifrs_stage_skey
        `, [formattedMisDate, latestRunKey]);
        
        console.log('Stage Update Results:', updateResults);
        console.log('Stage determination update completed successfully');
        return '1';

    } catch (error) {
        console.error('Error in updateStage:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
        return '0';
    } finally {
        connection.release();
        const [totalSeconds, totalNanoseconds] = process.hrtime(startTime);
        const totalMilliseconds = (totalSeconds * 1000) + (totalNanoseconds / 1000000);
        console.log(`Total execution time: ${totalMilliseconds.toFixed(2)}ms`);
    }
};

module.exports = {
    updateStage,
    getLatestRunSkey
};
