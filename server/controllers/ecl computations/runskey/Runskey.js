const db = require('../../../config/database');

const updateRunskey = async (fic_mis_date, latest_run_skey = null) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        if (!latest_run_skey) {
            // Get the current max latest_run_skey
            const [rows] = await connection.execute(
                'SELECT MAX(latest_run_skey) as max_skey FROM dim_run'
            );
            latest_run_skey = (rows[0].max_skey || 0) + 1;
        }

        await connection.execute(
            `INSERT INTO dim_run (date, latest_run_skey) VALUES (?, ?)`,
            [fic_mis_date, latest_run_skey]
        );
        await connection.commit();
        console.log(`Inserted new run: date=${fic_mis_date}, latest_run_skey=${latest_run_skey}`);
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error in updateRunskey: ${error.message}`);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

module.exports = {
    updateRunskey
}