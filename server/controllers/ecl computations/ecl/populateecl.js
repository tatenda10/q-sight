const db = require('../../../config/database');

const getLatestRunSkey = async () => {
  let connection;
  try {
      connection = await db.getConnection();

      // Option 1: Using MAX() with alias (best if you specifically want the maximum value)
      const [rows] = await connection.query(`
      SELECT MAX(latest_run_skey) AS max_run_skey 
      FROM dim_run;
    `);

      // Option 2: Using ORDER BY (better if you want most recent by creation)
      // const [rows] = await connection.query(`
      //   SELECT latest_run_skey 
      //   FROM dim_run 
      //   ORDER BY created_date DESC, id DESC 
      //   LIMIT 1;
      // `);

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

async function getRunSkeyForMethod(eclMethod) {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query("SELECT * FROM ECLMethod WHERE method_name = ?", [eclMethod]);

    if (rows.length > 0) {
      return await getLatestRunSkey();
    } else {
      const [latestRun] = await connection.query('SELECT latest_run_skey FROM Dim_Run ORDER BY latest_run_skey DESC LIMIT 1');
      return latestRun[0].latest_run_skey;
    }
  } catch (error) {
    console.error(`Error retrieving run_skey: ${error.message}`);
    return null;
  }
}

async function populateFctReportingLines(misDate, eclMethod) {
  try {
    const lastRunSkey = await getRunSkeyForMethod(eclMethod);
    if (!lastRunSkey) {
      console.error('Failed to retrieve or generate run_skey.');
      return '0';
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get account numbers from the source table for the specific run key
      const [sourceAccounts] = await connection.query(
        'SELECT DISTINCT n_account_number FROM fct_stage_determination WHERE fic_mis_date = ? AND n_run_key = ?',
        [misDate, lastRunSkey]
      );
      
      // Check for existing records for each account
      for (const account of sourceAccounts) {
        const accountNumber = account.n_account_number;
        
        // Check if this specific account already exists for this date and run key
        const [existingRecord] = await connection.query(
          'SELECT COUNT(*) as count FROM fct_reporting_lines WHERE fic_mis_date = ? AND n_run_key = ? AND n_account_number = ?',
          [misDate, lastRunSkey, accountNumber]
        );
        
        if (existingRecord[0].count === 0) {
          // Insert only if this specific account doesn't exist
          const query = `
            INSERT INTO fct_reporting_lines (
              n_run_key, fic_mis_date, n_account_number, d_acct_start_date, d_last_payment_date,
              d_next_payment_date, d_maturity_date, n_acct_classification, n_cust_ref_code,
              n_partner_name, n_party_type, n_accrual_basis_code, n_curr_interest_rate,
              n_effective_interest_rate, v_interest_freq_unit, v_interest_method, n_accrued_interest,
              n_rate_chg_min, n_carrying_amount_ncy, n_exposure_at_default_ncy, n_lgd_percent,
              n_pd_percent, n_twelve_months_orig_pd, n_lifetime_orig_pd, n_twelve_months_pd,
              n_lifetime_pd, n_pd_term_structure_skey, n_pd_term_structure_name, n_pd_term_structure_desc,
              n_12m_pd_change, v_amrt_repayment_type, n_remain_no_of_pmts, n_amrt_term, v_amrt_term_unit,
              v_ccy_code, n_delinquent_days, n_delq_band_code, n_stage_descr, n_curr_ifrs_stage_skey,
              n_prev_ifrs_stage_skey, d_cooling_start_date, n_target_ifrs_stage_skey,
              n_in_cooling_period_flag, n_cooling_period_duration, n_country, n_segment_skey,
              n_prod_segment, n_prod_code, n_prod_name, n_prod_type, n_prod_desc, n_credit_rating_code,
              n_org_credit_score, n_curr_credit_score, n_acct_rating_movement, n_party_rating_movement,
              n_conditionally_cancel_flag, n_collateral_amount, n_loan_type
            )
            SELECT 
              ?, fic_mis_date, n_account_number, d_acct_start_date, d_last_payment_date,
              d_next_payment_date, d_maturity_date, n_acct_classification, n_cust_ref_code,
              n_partner_name, n_party_type, n_accrual_basis_code, n_curr_interest_rate,
              n_effective_interest_rate, v_interest_freq_unit, v_interest_method, n_accrued_interest,
              n_rate_chg_min, n_carrying_amount_ncy, n_exposure_at_default, n_lgd_percent,
              n_pd_percent, n_twelve_months_orig_pd, n_lifetime_orig_pd, n_twelve_months_pd,
              n_lifetime_pd, n_pd_term_structure_skey, n_pd_term_structure_name, n_pd_term_structure_desc,
              n_12m_pd_change, v_amrt_repayment_type, n_remain_no_of_pmts, n_amrt_term, v_amrt_term_unit,
              v_ccy_code, n_delinquent_days, n_delq_band_code, n_stage_descr, n_curr_ifrs_stage_skey,
              n_prev_ifrs_stage_skey, d_cooling_start_date, n_target_ifrs_stage_skey,
              n_in_cooling_period_flag, n_cooling_period_duration, n_country, n_segment_skey,
              n_prod_segment, n_prod_code, n_prod_name, n_prod_type, n_prod_desc, n_credit_rating_code,
              n_org_credit_score, n_curr_credit_score, n_acct_rating_movement, n_party_rating_movement,
              n_conditionally_cancel_flag, n_collateral_amount, n_loan_type
            FROM fct_stage_determination
            WHERE fic_mis_date = ? AND n_account_number = ? AND n_run_key = ?;
          `;
          
          await connection.query(query, [lastRunSkey, misDate, accountNumber, lastRunSkey]);
          console.log(`Inserted account ${accountNumber} for date ${misDate} and run key ${lastRunSkey}`);
        } else {
          console.log(`Skipping account ${accountNumber} - already exists for date ${misDate} and run key ${lastRunSkey}`);
        }
      }
      
      await connection.commit();
      console.log(`Successfully populated FCT_Reporting_Lines for fic_mis_date=${misDate}.`);
      return '1';
    } catch (error) {
      // If any error occurs during the transaction, roll back
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(`Error populating FCT_Reporting_Lines: ${error.message}`);
    return '0';
  }
}

const createPdDocumentationTables = async () => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Create pd_documentation table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pd_documentation (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        version VARCHAR(10) NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_date DATETIME NOT NULL,
        authorized_by VARCHAR(100),
        authorized_date DATETIME,
        status ENUM('draft', 'pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create pd_documentation_history table for version tracking
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pd_documentation_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        documentation_id INT NOT NULL,
        content TEXT NOT NULL,
        version VARCHAR(10) NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_date DATETIME NOT NULL,
        authorized_by VARCHAR(100),
        authorized_date DATETIME,
        status ENUM('draft', 'pending_approval', 'approved', 'rejected') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (documentation_id) REFERENCES pd_documentation(id)
      );
    `);

    // Create pd_documentation_approvers table for managing who can approve
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pd_documentation_approvers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_role (user_id, role)
      );
    `);

    await connection.commit();
    console.log('Successfully created PD documentation tables');
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error creating PD documentation tables: ${error.message}`);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Add function to save PD documentation
const savePdDocumentation = async (content, version, createdBy, authorizedBy = null) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const now = new Date();
    const status = authorizedBy ? 'approved' : 'pending_approval';

    // Insert into main table
    const [result] = await connection.query(`
      INSERT INTO pd_documentation 
      (content, version, created_by, created_date, authorized_by, authorized_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [content, version, createdBy, now, authorizedBy, authorizedBy ? now : null, status]);

    // Insert into history table
    await connection.query(`
      INSERT INTO pd_documentation_history 
      (documentation_id, content, version, created_by, created_date, authorized_by, authorized_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [result.insertId, content, version, createdBy, now, authorizedBy, authorizedBy ? now : null, status]);

    await connection.commit();
    return result.insertId;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error saving PD documentation: ${error.message}`);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Add function to get latest PD documentation
const getLatestPdDocumentation = async () => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT * FROM pd_documentation 
      WHERE status = 'approved' 
      ORDER BY version DESC, created_date DESC 
      LIMIT 1
    `);
    return rows[0] || null;
  } catch (error) {
    console.error(`Error getting latest PD documentation: ${error.message}`);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  populateFctReportingLines,
  createPdDocumentationTables,
  savePdDocumentation,
  getLatestPdDocumentation
};