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

const insertFctStage = async (misDate) => {
    const startTime = process.hrtime();
    console.log('Starting insertFctStage function...');
    
    let connection;
    try {
        connection = await db.getConnection();
        console.log('Database connection established');

        const logTimeElapsed = (operation) => {
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const milliseconds = (seconds * 1000) + (nanoseconds / 1000000);
            console.log(`${operation} - Time elapsed: ${milliseconds.toFixed(2)}ms`);
        };

        const formattedMisDate = format(new Date(misDate), 'yyyy-MM-dd');
        
        // Get the latest run key
        console.log('Getting latest run key...');
        const latestRunKey = await getLatestRunSkey();
        if (!latestRunKey) {
            throw new Error('Failed to get latest run key');
        }
        console.log(`Latest run key: ${latestRunKey}`);
        logTimeElapsed('Get latest run key');

        // Begin transaction
        await connection.beginTransaction();

        // First, check if records exist for this date and run key
        console.log('Checking existing records...');
        const [existingRecords] = await connection.execute(
            'SELECT COUNT(*) as count FROM fct_stage_determination WHERE fic_mis_date = ? AND n_run_key = ?',
            [formattedMisDate, latestRunKey]
        );
        console.log(`Found ${existingRecords[0].count} existing records for date ${formattedMisDate} and run key ${latestRunKey}`);

        // Delete existing records for this date and run key
        console.log('Deleting existing records...');
        const [deleteResult] = await connection.execute(
            'DELETE FROM fct_stage_determination WHERE fic_mis_date = ? AND n_run_key = ?',
            [formattedMisDate, latestRunKey]
        );
        console.log(`Deleted ${deleteResult.affectedRows} records`);
        logTimeElapsed('Delete existing records');

        // Verify deletion
        const [verifyDelete] = await connection.execute(
            'SELECT COUNT(*) as count FROM fct_stage_determination WHERE fic_mis_date = ? AND n_run_key = ?',
            [formattedMisDate, latestRunKey]
        );
        console.log(`Verified ${verifyDelete[0].count} records remain after deletion`);

        // Insert new records
        console.log('Inserting new records...');
        const [insertResult] = await connection.execute(`
            INSERT INTO fct_stage_determination (
                fic_mis_date,
                n_account_number,
                d_acct_start_date,
                d_last_payment_date,
                d_next_payment_date,
                d_maturity_date,
                n_acct_classification,
                n_cust_ref_code,
                n_partner_name,
                n_party_type,
                n_curr_interest_rate,
                n_effective_interest_rate,
                n_lgd_percent,
                n_pd_percent,
                n_stage_descr,
                n_accrued_interest,
                n_rate_chg_min,
                n_accrual_basis_code,
                v_ccy_code,
                n_eop_prin_bal,
                n_carrying_amount_ncy,
                n_collateral_amount,
                n_delinquent_days,
                v_amrt_repayment_type,
                v_amrt_term_unit,
                n_prod_code,
                n_loan_type,
                n_acct_rating_movement,
                n_credit_rating_code,
                n_org_credit_score,
                n_curr_credit_score,
                n_curr_ifrs_stage_skey,
                n_prev_ifrs_stage_skey,
                n_prod_segment,
                n_prod_type,
                n_prod_desc,
                n_segment_skey,
                n_pd_term_structure_skey,
                n_delq_band_code,
                n_pd_term_structure_name,
                n_pd_term_structure_desc,
                v_prod_type,
                v_prod_desc,
                v_prod_segment,
                v_prod_group,
                v_prod_group_desc,
                v_balance_sheet_category,
                v_balance_sheet_category_desc,
                v_prod_type_desc,
                n_run_key
            )
            SELECT DISTINCT
                fic_mis_date,
                v_account_number,
                d_start_date,
                d_last_payment_date,
                d_next_payment_date,
                d_maturity_date,
                v_account_classification_cd,
                v_cust_ref_code,
                NULL as n_partner_name,
                NULL as n_party_type,
                n_curr_interest_rate,
                n_effective_interest_rate,
                n_lgd_percent,
                n_pd_percent,
                NULL as n_stage_descr,
                n_accrued_interest,
                n_interest_changing_rate,
                v_day_count_ind,
                v_ccy_code,
                n_eop_curr_prin_bal,
                n_eop_bal,
                n_collateral_amount,
                n_delinquent_days,
                v_amrt_repayment_type,
                v_amrt_term_unit,
                v_prod_code,
                v_loan_type,
                v_acct_rating_movement,
                v_credit_rating_code,
                v_org_credit_score,
                v_curr_credit_score,
                NULL as n_curr_ifrs_stage_skey,
                NULL as n_prev_ifrs_stage_skey,
                V_MODEL_SEGMENT as n_prod_segment,
                null as n_prod_type,
                v_loan_desc as n_prod_desc,
                NULL as n_segment_skey,
                NULL as n_pd_term_structure_skey,
                NULL as n_delq_band_code,
                NULL as n_pd_term_structure_name,
                NULL as n_pd_term_structure_desc,
                null as v_prod_type,
                v_loan_desc as v_prod_desc,
                V_MODEL_SEGMENT as v_prod_segment,
                NULL as v_prod_group,
                NULL as v_prod_group_desc,
                NULL as v_balance_sheet_category,
                NULL as v_balance_sheet_category_desc,
                NULL as v_prod_type_desc,
                ? as n_run_key
            FROM ldn_financial_instrument
            WHERE DATE(fic_mis_date) = ?
        `, [latestRunKey, formattedMisDate]);
        console.log(`Inserted ${insertResult.affectedRows} new records`);
        logTimeElapsed('Insert new records');

        // Verify insertion
        const [verifyInsert] = await connection.execute(
            'SELECT COUNT(*) as count FROM fct_stage_determination WHERE fic_mis_date = ? AND n_run_key = ?',
            [formattedMisDate, latestRunKey]
        );
        console.log(`Verified ${verifyInsert[0].count} records after insertion`);

        // Commit transaction
        await connection.commit();
        console.log('Records inserted successfully');
        return '1';

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error in insertFctStage:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            sqlMessage: error.sqlMessage
        });
        return '0';
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
    insertFctStage
};
