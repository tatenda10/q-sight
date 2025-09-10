const db = require('../../../config/database');

const getLatestRunSkey = async () => {
    try {
        const connection = await db.getConnection();
        const [rows] = await connection.execute("SELECT latest_run_skey FROM dim_run LIMIT 1;");
        connection.release();
        if (rows.length === 0) {
            throw new Error("No run key available in Dim_Run table.");
        }
        return rows[0].latest_run_skey;
    } catch (error) {
        console.error('Error in getLatestRunSkey:', error);
        throw error;
    }
};

const updateLGDForStageDeterminationTermStructure = async (misDate) => {
    const startTime = process.hrtime();
    console.log('Starting updateLGDForStageDeterminationTermStructure function...');
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Update for Rating-Based Term Structure
        await connection.execute(`
            UPDATE fct_stage_determination AS sd
            INNER JOIN ldn_lgd_term_structure AS lts
            ON sd.n_segment_skey = lts.v_lgd_term_structure_id
            SET sd.n_lgd_percent = lts.n_lgd_percent
            WHERE sd.fic_mis_date = ?
            AND sd.n_lgd_percent IS NULL;
        `, [misDate]);

        await connection.commit();
        console.log(`Successfully updated LGD for FCT_Stage_Determination entries on ${misDate}.`);
        return 1; // Success

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error in updateLGDForStageDeterminationTermStructure:', error);
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

const updateLGDForStageDeterminationTermStructureWithBands = async (misDate) => {
    const startTime = process.hrtime();
    console.log('Starting updateLGDForStageDeterminationTermStructureWithBands function...');
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Rating-based update
        await connection.execute(`
            UPDATE fct_stage_determination
            INNER JOIN (
                SELECT
                    lts.v_lgd_term_structure_id,
                    lts.n_lgd_percent,
                    ts.v_pd_term_structure_type,
                    lts.v_credit_risk_basis_cd
                FROM fsi_lgd_term_structure lts
                JOIN ldn_pd_term_structure ts
                ON ts.v_pd_term_structure_id = lts.v_lgd_term_structure_id
                AND ts.fic_mis_date = lts.fic_mis_date
                WHERE ts.v_pd_term_structure_type = 'R'
            ) AS subquery
            ON fct_stage_determination.n_segment_skey = subquery.v_lgd_term_structure_id
            SET fct_stage_determination.n_lgd_percent = subquery.n_lgd_percent
            WHERE fct_stage_determination.fic_mis_date = ?
            AND fct_stage_determination.n_lgd_percent IS NULL
            AND fct_stage_determination.n_credit_rating_code = subquery.v_credit_risk_basis_cd;
        `, [misDate]);

        // Delinquency-based update
        await connection.execute(`
            UPDATE fct_stage_determination
            INNER JOIN (
                SELECT
                    lts.v_lgd_term_structure_id,
                    lts.n_lgd_percent,
                    ts.v_pd_term_structure_type,
                    lts.v_credit_risk_basis_cd
                FROM fsi_lgd_term_structure lts
                JOIN ldn_pd_term_structure ts
                ON ts.v_pd_term_structure_id = lts.v_lgd_term_structure_id
                AND ts.fic_mis_date = lts.fic_mis_date
                WHERE ts.v_pd_term_structure_type = 'D'
            ) AS subquery
            ON fct_stage_determination.n_segment_skey = subquery.v_lgd_term_structure_id
            SET fct_stage_determination.n_lgd_percent = subquery.n_lgd_percent
            WHERE fct_stage_determination.fic_mis_date = ?
            AND fct_stage_determination.n_lgd_percent IS NULL
            AND fct_stage_determination.n_delq_band_code = subquery.v_credit_risk_basis_cd;
        `, [misDate]);

        await connection.commit();
        console.log(`LGD updated for entries on MIS date ${misDate} for both rating and delinquency based structures.`);
        return 1; // Success

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error in updateLGDForStageDeterminationTermStructureWithBands:', error);
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

const updateLGDForStageDeterminationCollateral = async (misDate) => {
    const startTime = process.hrtime();
    console.log('Starting updateLGDForStageDeterminationCollateral function...');
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Check if collateral-based LGD calculation is enabled
        const [rows] = await connection.execute(`
            SELECT 1 
            FROM collateral_lgd 
            WHERE can_calculate_lgd = TRUE 
            LIMIT 1;
        `);
        if (rows.length === 0) {
            console.log("Collateral-based LGD calculation is not enabled.");
            return 0;
        }

        // Update based on collateral
        await connection.execute(`
            UPDATE fct_stage_determination
            SET n_lgd_percent = GREATEST(
                0, 
                LEAST(
                    0.65, 
                    1 - (n_collateral_amount / NULLIF(n_exposure_at_default, 0))
                )
            )
            WHERE fic_mis_date = ?
            AND n_collateral_amount IS NOT NULL
            AND n_exposure_at_default > 0;
        `, [misDate]);

        await connection.commit();
        console.log(`LGD updated for entries on MIS date ${misDate} based on collateral.`);
        return 1; // Success

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error in updateLGDForStageDeterminationCollateral:', error);
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
    getLatestRunSkey,
    updateLGDForStageDeterminationTermStructure,
    updateLGDForStageDeterminationTermStructureWithBands,
    updateLGDForStageDeterminationCollateral
};
