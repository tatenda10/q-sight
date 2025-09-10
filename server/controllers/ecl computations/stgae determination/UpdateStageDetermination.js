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

const updateStageDetermination = async (misDate) => {
    const startTime = process.hrtime();
    console.log('Starting updateStageDetermination function...');
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

        // Check if there are records to update
        const [countResult] = await connection.execute(`
            SELECT COUNT(*) as record_count 
            FROM fct_stage_determination 
            WHERE fic_mis_date = ? 
            AND n_run_key = ?
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Found ${countResult[0].record_count} records to update`);
        
        if (countResult[0].record_count === 0) {
            console.log('No records found for the given MIS date and run key');
            return '0';
        }

        // Update segment key - FIXED JOIN CONDITION
        console.log('Updating segment key...');
        const [updateSegmentResult] = await connection.execute(`
             UPDATE fct_stage_determination sd
            INNER JOIN ldn_bank_product_info bpi 
                ON bpi.v_prod_code = sd.n_prod_code
            INNER JOIN fsi_product_segment s 
                ON s.v_prod_segment = bpi.v_prod_type
            SET sd.n_segment_skey = s.segment_id,
                sd.n_prod_name = bpi.v_prod_name,
                sd.n_prod_type = bpi.v_prod_type,
                sd.v_prod_group_desc = bpi.v_prod_group_desc,
                sd.n_prod_segment = bpi.v_prod_segment,
                sd.v_balance_sheet_category = bpi.v_balance_sheet_category,
                sd.v_balance_sheet_category_desc = bpi.v_balance_sheet_category_desc,
                sd.v_prod_type_desc = bpi.v_prod_type_desc,
                sd.n_prod_desc = bpi.v_prod_desc
            WHERE sd.fic_mis_date = ?
            AND sd.n_run_key = ?
            AND sd.n_prod_code IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Updated segment key for ${updateSegmentResult.affectedRows} records`);
        logTimeElapsed('Segment key update');

        // Update PD term structure key
        console.log('Updating PD term structure key...');
        const [updatePdTermResult] = await connection.execute(`
            UPDATE fct_stage_determination
            SET n_pd_term_structure_skey = n_segment_skey
            WHERE fic_mis_date = ?
            AND n_run_key = ?
            AND n_segment_skey IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Updated PD term structure key for ${updatePdTermResult.affectedRows} records`);
        logTimeElapsed('PD term structure key update');

        // Update collateral amount where missing
        console.log('Updating collateral amounts...');
        const [updateCollateralResult] = await connection.execute(`
            UPDATE fct_stage_determination sd
            INNER JOIN lgdcollateral c 
                ON c.v_cust_ref_code = sd.n_cust_ref_code
                AND c.fic_mis_date = sd.fic_mis_date
            SET sd.n_collateral_amount = c.total
            WHERE sd.fic_mis_date = ?
            AND sd.n_run_key = ?
            AND (sd.n_collateral_amount IS NULL OR sd.n_collateral_amount = 0)
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Updated collateral amount for ${updateCollateralResult.affectedRows} records`);
        logTimeElapsed('Collateral amount update');

        // Update delinquency band code
        console.log('Updating delinquency band codes...');
        const [updateDelinquencyResult] = await connection.execute(`
            UPDATE fct_stage_determination sd
            INNER JOIN dim_delinquency_band band 
                ON sd.n_delinquent_days BETWEEN band.n_delq_lower_value AND band.n_delq_upper_value
                AND band.v_amrt_term_unit = sd.v_amrt_term_unit
            SET sd.n_delq_band_code = band.n_delq_band_code
            WHERE sd.fic_mis_date = ?
            AND sd.n_run_key = ?
            AND sd.n_delinquent_days IS NOT NULL
            AND sd.v_amrt_term_unit IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Updated delinquency band for ${updateDelinquencyResult.affectedRows} records`);
        logTimeElapsed('Delinquency band update');

        // Update customer info - FIXED JOIN CONDITION
        console.log('Updating customer information...');
        const [updateCustomerResult] = await connection.execute(`
            UPDATE fct_stage_determination sd
            INNER JOIN ldn_customer_info ci 
                ON ci.v_party_id = sd.n_cust_ref_code
            SET 
                sd.n_partner_name = ci.v_partner_name,
                sd.n_party_type = ci.v_party_type
            WHERE sd.fic_mis_date = ?
            AND sd.n_run_key = ?
            AND sd.n_cust_ref_code IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Updated customer info for ${updateCustomerResult.affectedRows} records`);
        logTimeElapsed('Customer info update');

        // Update PD term structure info
        console.log('Updating PD term structure information...');
        const [updatePdTermInfoResult] = await connection.execute(`
            UPDATE fct_stage_determination sd
            INNER JOIN ldn_pd_term_structure pdt 
                ON CAST(pdt.v_pd_term_structure_name AS CHAR) = CAST(sd.n_pd_term_structure_skey AS CHAR)
            SET 
                sd.n_pd_term_structure_name = pdt.v_pd_term_structure_desc,
                sd.n_pd_term_structure_desc = pdt.v_pd_term_structure_desc
            WHERE sd.fic_mis_date = ?
            AND sd.n_run_key = ?
            AND sd.n_pd_term_structure_skey IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Updated PD term structure info for ${updatePdTermInfoResult.affectedRows} records`);
        logTimeElapsed('PD term structure info update');

        // Update customer rating detail if missing
        console.log('Updating missing customer ratings...');
        const [updateRatingResult] = await connection.execute(`
            UPDATE fct_stage_determination sd
            INNER JOIN ldn_customer_rating_detail rd 
                ON rd.fic_mis_date = sd.fic_mis_date
                AND rd.v_party_cd = sd.n_cust_ref_code
            SET sd.n_credit_rating_code = rd.v_rating_code
            WHERE sd.fic_mis_date = ?
            AND sd.n_run_key = ?
            AND sd.n_credit_rating_code IS NULL
            AND sd.n_cust_ref_code IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Updated customer rating for ${updateRatingResult.affectedRows} records`);
        logTimeElapsed('Customer rating update');

        // Update account rating movement - FIXED TYPE CONVERSION
        console.log('Updating account rating movements...');
        const [updateRatingMovementResult] = await connection.execute(`
            UPDATE fct_stage_determination
            SET n_acct_rating_movement = 
                CASE 
                    WHEN n_org_credit_score REGEXP '^[0-9]+$' AND n_curr_credit_score REGEXP '^[0-9]+$' 
                    THEN CAST(n_org_credit_score AS DECIMAL) - CAST(n_curr_credit_score AS DECIMAL)
                    ELSE NULL
                END
            WHERE fic_mis_date = ?
            AND n_run_key = ?
            AND n_org_credit_score IS NOT NULL
            AND n_curr_credit_score IS NOT NULL
        `, [formattedMisDate, latestRunKey]);
        
        console.log(`Updated account rating movement for ${updateRatingMovementResult.affectedRows} records`);
        logTimeElapsed('Account rating movement update');

        console.log('Stage determination updates completed successfully');
        return '1';

    } catch (error) {
        console.error('Error in updateStageDetermination:', error);
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
    updateStageDetermination
};