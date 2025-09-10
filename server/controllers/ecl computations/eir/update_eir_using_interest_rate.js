const db = require('../../../config/database');

const updateEIRUsingInterestRate = async (ficMisDate) => {
    const startTime = process.hrtime();
    console.log('Starting updateEIRUsingInterestRate function...');
    
    let connection;
    try {
        // Establish a database connection
        connection = await db.getConnection();
        console.log('Database connection established');

        // Begin a transaction
        await connection.beginTransaction();

        // TEMPORARY: Set v_amrt_term_unit = 'M' for all records for this fic_mis_date
        await connection.execute(`
            UPDATE fct_stage_determination
            SET v_amrt_term_unit = 'M'
            WHERE fic_mis_date = ?;
        `, [ficMisDate]);
        console.log(`Set v_amrt_term_unit = 'M' for fic_mis_date=${ficMisDate}`);

        // SQL to calculate and update EIR
        await connection.execute(`
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
            WHERE fic_mis_date = ?
              AND n_effective_interest_rate IS NULL
              AND n_curr_interest_rate IS NOT NULL;
        `, [ficMisDate]);

        // Clamp the EIR to the defined MIN_EIR and MAX_EIR values
        const MAX_EIR = 999.99999999999;
        const MIN_EIR = 0;
        await connection.execute(`
            UPDATE fct_stage_determination
            SET n_effective_interest_rate = LEAST(GREATEST(n_effective_interest_rate, ?), ?)
            WHERE fic_mis_date = ? AND n_effective_interest_rate IS NOT NULL;
        `, [MIN_EIR, MAX_EIR, ficMisDate]);

        // Commit the transaction
        await connection.commit();

        // Log success
        console.log(`Successfully updated EIR for records with fic_mis_date=${ficMisDate}.`);
        return 1; // Success

    } catch (error) {
        // Rollback the transaction in case of error
        if (connection) {
            await connection.rollback();
        }
        console.error('Error in updateEIRUsingInterestRate:', error);
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
    updateEIRUsingInterestRate
};
