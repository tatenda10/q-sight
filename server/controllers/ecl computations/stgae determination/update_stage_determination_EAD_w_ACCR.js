const db = require('../../../config/database');

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

const updateStageDeterminationEADWithACCR = async (ficMisDate) => {
    const startTime = process.hrtime();
    console.log('Starting updateStageDeterminationEADWithACCR function...');
    
    let connection;
    try {
        // Establish a database connection
        connection = await db.getConnection();
        console.log('Database connection established');

        // Get the latest run key
        console.log('Getting latest run key...');
        const runKey = await getLatestRunSkey();
        if (!runKey) {
            throw new Error('Failed to get latest run key');
        }
        console.log(`Latest run key: ${runKey}`);

        // Begin a transaction
        await connection.beginTransaction();

        // Perform the set-based update
        const [result] = await connection.execute(`
            UPDATE fct_stage_determination
            SET n_exposure_at_default = COALESCE(n_carrying_amount_ncy, 0) + COALESCE(n_accrued_interest, 0)
            WHERE fic_mis_date = ?
              AND n_run_key = ?
              AND n_exposure_at_default IS NULL;
        `, [ficMisDate, runKey]);

        // Commit the transaction
        await connection.commit();

        // Log success
        console.log(`Successfully updated n_exposure_at_default for fic_mis_date=${ficMisDate}, run_key=${runKey}. Rows affected: ${result.affectedRows}`);
        return 1; // Success

    } catch (error) {
        // Rollback the transaction in case of error
        if (connection) {
            await connection.rollback();
        }
        console.error('Error in updateStageDeterminationEADWithACCR:', error);
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
    updateStageDeterminationEADWithACCR
};
