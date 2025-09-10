const db = require('../../../config/database');
const { format } = require('date-fns');

const getLatestRunSkey = async () => {
    let connection;
    try {
        connection = await db.getConnection();

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
}

const updateDelinquencyBandCode = async (misDate) => {
    const startTime = process.hrtime();
    console.log('Starting updateDelinquencyBandCode function...');
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

        // First, check delinquency band structure
        console.log('Checking delinquency band table data...');
        const [bandRows] = await connection.execute(`
            SELECT 
                n_delq_band_code,
                v_delq_band_desc,
                n_delq_lower_value,
                n_delq_upper_value,
                v_amrt_term_unit,
                LENGTH(v_amrt_term_unit) as term_unit_length
            FROM dim_delinquency_band
            LIMIT 10
        `);
        
        console.log('Sample delinquency band records:', bandRows);

        // Check stage determination table
        console.log('Checking stage determination table...');
        const [stageRows] = await connection.execute(`
            SELECT 
                n_delinquent_days,
                v_amrt_term_unit,
                LENGTH(v_amrt_term_unit) as term_unit_length
            FROM fct_stage_determination
            WHERE fic_mis_date = ? 
            AND n_run_key = ?
            LIMIT 10
        `, [formattedMisDate, latestRunKey]);
        
        console.log('Sample stage determination records:', stageRows);
        
        // Verify distinct values
        const [distinctUnitValues] = await connection.execute(`
            SELECT DISTINCT 
                v_amrt_term_unit,
                LEFT(v_amrt_term_unit, 1) as first_char
            FROM fct_stage_determination
            WHERE fic_mis_date = ? 
            AND n_run_key = ?
        `, [formattedMisDate, latestRunKey]);
        
        console.log('Distinct amortization term units in stage determination:', distinctUnitValues);
        
        // Pre-update counts
        const [beforeCounts] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN n_delq_band_code IS NOT NULL THEN 1 ELSE 0 END) as with_band_code
            FROM fct_stage_determination 
            WHERE fic_mis_date = ? AND n_run_key = ?
        `, [formattedMisDate, latestRunKey]);
        
        console.log('Before update counts:', beforeCounts[0]);

        // The key issue: v_amrt_term_unit is char(1) in dim_delinquency_band
        // We need to use only the first character from fct_stage_determination
        console.log('Updating delinquency band codes using first character of amortization term unit...');
        
        const [updateResult] = await connection.execute(`
            UPDATE fct_stage_determination sd
            INNER JOIN dim_delinquency_band band 
                ON CAST(sd.n_delinquent_days AS SIGNED) BETWEEN CAST(band.n_delq_lower_value AS SIGNED) AND CAST(band.n_delq_upper_value AS SIGNED)
                AND band.v_amrt_term_unit = LEFT(sd.v_amrt_term_unit, 1)
            SET sd.n_delq_band_code = band.n_delq_band_code
            WHERE sd.fic_mis_date = ?
            AND sd.n_run_key = ?
        `, [formattedMisDate, latestRunKey]);

        // Log update results
        console.log('Update operation results:', {
            affectedRows: updateResult.affectedRows,
            changedRows: updateResult.changedRows,
            warningStatus: updateResult.warningStatus
        });

        // If first update didn't work, try alternative approaches
        if (updateResult.affectedRows === 0) {
            console.log('First update attempt failed. Trying alternative approaches...');
            
            // Try using actual values from the dim_delinquency_band table
            const [bandValues] = await connection.execute(`
                SELECT DISTINCT v_amrt_term_unit
                FROM dim_delinquency_band
            `);
            
            console.log('Available amortization term units in band table:', bandValues);
            
            // Try updates for each specific band value
            for (const bandValue of bandValues) {
                const termUnit = bandValue.v_amrt_term_unit;
                console.log(`Trying update with band value: '${termUnit}'`);
                
                const [specificUpdate] = await connection.execute(`
                    UPDATE fct_stage_determination sd
                    INNER JOIN dim_delinquency_band band 
                        ON CAST(sd.n_delinquent_days AS SIGNED) BETWEEN CAST(band.n_delq_lower_value AS SIGNED) AND CAST(band.n_delq_upper_value AS SIGNED)
                        AND band.v_amrt_term_unit = ?
                    SET sd.n_delq_band_code = band.n_delq_band_code
                    WHERE sd.fic_mis_date = ?
                    AND sd.n_run_key = ?
                    AND sd.v_amrt_term_unit LIKE CONCAT(?, '%')
                `, [termUnit, formattedMisDate, latestRunKey, termUnit]);
                
                console.log(`Update with term unit '${termUnit}' results:`, {
                    affectedRows: specificUpdate.affectedRows,
                    changedRows: specificUpdate.changedRows
                });
                
                if (specificUpdate.affectedRows > 0) {
                    console.log(`Successfully updated ${specificUpdate.affectedRows} records with term unit '${termUnit}'`);
                }
            }
            
            // Final attempt with delinquent days only
            console.log('Making final attempt with delinquent days only...');
            const [finalAttempt] = await connection.execute(`
                UPDATE fct_stage_determination sd
                INNER JOIN (
                    SELECT 
                        n_delq_lower_value, 
                        n_delq_upper_value, 
                        MIN(n_delq_band_code) as n_delq_band_code
                    FROM dim_delinquency_band
                    GROUP BY n_delq_lower_value, n_delq_upper_value
                ) band 
                    ON CAST(sd.n_delinquent_days AS SIGNED) BETWEEN CAST(band.n_delq_lower_value AS SIGNED) AND CAST(band.n_delq_upper_value AS SIGNED)
                SET sd.n_delq_band_code = band.n_delq_band_code
                WHERE sd.fic_mis_date = ?
                AND sd.n_run_key = ?
                AND sd.n_delq_band_code IS NULL
            `, [formattedMisDate, latestRunKey]);
            
            console.log('Final update attempt results:', {
                affectedRows: finalAttempt.affectedRows,
                changedRows: finalAttempt.changedRows
            });
        }

        // Verify results
        const [verifyResult] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(n_delq_band_code) as with_band_code,
                COUNT(CASE WHEN n_delq_band_code IS NULL THEN 1 END) as without_band_code,
                COUNT(CASE WHEN n_delinquent_days = 0 THEN 1 END) as active_accounts,
                COUNT(CASE WHEN n_delinquent_days BETWEEN 1 AND 30 THEN 1 END) as days_1_30,
                COUNT(CASE WHEN n_delinquent_days BETWEEN 31 AND 60 THEN 1 END) as days_31_60,
                COUNT(CASE WHEN n_delinquent_days BETWEEN 61 AND 89 THEN 1 END) as days_61_89,
                COUNT(CASE WHEN n_delinquent_days >= 90 THEN 1 END) as days_90_plus
            FROM fct_stage_determination
            WHERE fic_mis_date = ?
            AND n_run_key = ?
        `, [formattedMisDate, latestRunKey]);

        console.log('Update verification results:', verifyResult[0]);

        // Sample some updated records
        const [sampleRecords] = await connection.execute(`
            SELECT n_delinquent_days, n_delq_band_code, v_amrt_term_unit
            FROM fct_stage_determination
            WHERE fic_mis_date = ? 
            AND n_run_key = ?
            LIMIT 5
        `, [formattedMisDate, latestRunKey]);

        console.log('Sample updated records:', sampleRecords);

        console.log('Delinquency band code update completed successfully');
        return '1';

    } catch (error) {
        console.error('Error in updateDelinquencyBandCode:', error);
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
    updateDelinquencyBandCode
};