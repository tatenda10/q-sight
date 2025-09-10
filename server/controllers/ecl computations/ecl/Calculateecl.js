const db = require('../../../config/database'); // Adjust path if necessary

// ------------------------------------------------------------------------
// 1) Retrieve Latest Run Key
// ------------------------------------------------------------------------
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

// ------------------------------------------------------------------------
// 2) ECL Calculation: Cash Shortfall
// ------------------------------------------------------------------------
const updateEclBasedOnCashShortfallSql = async (n_run_key, fic_mis_date, uses_discounting) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Preload data into a temporary table
    await connection.query("DROP TEMPORARY TABLE IF EXISTS temp_cash_shortfall;");
    if (uses_discounting) {
      await connection.query(`
        CREATE TEMPORARY TABLE temp_cash_shortfall AS
        SELECT
          v_account_number,
          SUM(n_cash_shortfall_pv) AS total_cash_shortfall_pv,
          SUM(n_12m_cash_shortfall_pv) AS total_12m_cash_shortfall_pv
        FROM fsi_financial_cash_flow_cal
        WHERE n_run_skey = ? AND fic_mis_date = ?
        GROUP BY v_account_number;
      `, [n_run_key, fic_mis_date]);
    } else {
      await connection.query(`
        CREATE TEMPORARY TABLE temp_cash_shortfall AS
        SELECT
          v_account_number,
          SUM(n_cash_shortfall) AS total_cash_shortfall,
          SUM(n_12m_cash_shortfall) AS total_12m_cash_shortfall
        FROM fsi_financial_cash_flow_cal
        WHERE n_run_skey = ? AND fic_mis_date = ?
        GROUP BY v_account_number;
      `, [n_run_key, fic_mis_date]);
    }

    // Index the temporary table for faster joins
    await connection.query("CREATE INDEX idx_temp_cash_shortfall ON temp_cash_shortfall(v_account_number);");

    // Perform the update using the temporary table (MySQL UPDATE JOIN syntax)
    if (uses_discounting) {
      await connection.query(`
        UPDATE fct_reporting_lines rl
        JOIN temp_cash_shortfall cf ON rl.n_account_number = cf.v_account_number
        SET
          rl.n_lifetime_ecl_ncy = COALESCE(cf.total_cash_shortfall_pv, 0),
          rl.n_12m_ecl_ncy = COALESCE(cf.total_12m_cash_shortfall_pv, 0)
        WHERE rl.n_run_key = ? AND rl.fic_mis_date = ?;
      `, [n_run_key, fic_mis_date]);
    } else {
      await connection.query(`
        UPDATE fct_reporting_lines rl
        JOIN temp_cash_shortfall cf ON rl.n_account_number = cf.v_account_number
        SET
          rl.n_lifetime_ecl_ncy = COALESCE(cf.total_cash_shortfall, 0),
          rl.n_12m_ecl_ncy = COALESCE(cf.total_12m_cash_shortfall, 0)
        WHERE rl.n_run_key = ? AND rl.fic_mis_date = ?;
      `, [n_run_key, fic_mis_date]);
    }

    await connection.commit();
    console.log(`Successfully updated ECL based on cash shortfall for run key ${n_run_key}, date ${fic_mis_date}.`);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error in updateEclBasedOnCashShortfallSql: ${error.message}`);
    throw error; // Re-throw the error to be caught by the calling function
  } finally {
    if (connection) connection.release();
  }
}

// ------------------------------------------------------------------------
// 3) ECL Calculation: Forward Loss
// ------------------------------------------------------------------------
const updateEclBasedOnForwardLossSql = async (n_run_key, fic_mis_date, uses_discounting) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Preload data into a temporary table
    await connection.query("DROP TEMPORARY TABLE IF EXISTS temp_forward_loss;");
    if (uses_discounting) {
      await connection.query(`
        CREATE TEMPORARY TABLE temp_forward_loss AS
        SELECT
          v_account_number,
          SUM(n_forward_expected_loss_pv) AS total_fwd_loss_pv,
          SUM(n_12m_fwd_expected_loss_pv) AS total_12m_fwd_loss_pv
        FROM fsi_financial_cash_flow_cal
        WHERE n_run_skey = ? AND fic_mis_date = ?
        GROUP BY v_account_number;
      `, [n_run_key, fic_mis_date]);
    } else {
      await connection.query(`
        CREATE TEMPORARY TABLE temp_forward_loss AS
        SELECT
          v_account_number,
          SUM(n_forward_expected_loss) AS total_fwd_loss,
          SUM(n_12m_fwd_expected_loss) AS total_12m_fwd_loss
        FROM fsi_financial_cash_flow_cal
        WHERE n_run_skey = ? AND fic_mis_date = ?
        GROUP BY v_account_number;
      `, [n_run_key, fic_mis_date]);
    }

    // Index the temporary table for faster joins
    await connection.query("CREATE INDEX idx_temp_forward_loss ON temp_forward_loss(v_account_number);");

    // Perform the update using the temporary table (MySQL UPDATE JOIN syntax)
    if (uses_discounting) {
      await connection.query(`
        UPDATE fct_reporting_lines rl
        JOIN temp_forward_loss fwd ON rl.n_account_number = fwd.v_account_number
        SET
          rl.n_lifetime_ecl_ncy = COALESCE(fwd.total_fwd_loss_pv, 0),
          rl.n_12m_ecl_ncy = COALESCE(fwd.total_12m_fwd_loss_pv, 0)
        WHERE rl.n_run_key = ? AND rl.fic_mis_date = ?;
      `, [n_run_key, fic_mis_date]);
    } else {
      await connection.query(`
        UPDATE fct_reporting_lines rl
        JOIN temp_forward_loss fwd ON rl.n_account_number = fwd.v_account_number
        SET
          rl.n_lifetime_ecl_ncy = COALESCE(fwd.total_fwd_loss, 0),
          rl.n_12m_ecl_ncy = COALESCE(fwd.total_12m_fwd_loss, 0)
        WHERE rl.n_run_key = ? AND rl.fic_mis_date = ?;
      `, [n_run_key, fic_mis_date]);
    }

    await connection.commit();
    console.log(`Successfully updated ECL based on forward loss for run key ${n_run_key}, date ${fic_mis_date}.`);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error in updateEclBasedOnForwardLossSql: ${error.message}`);
    throw error; // Re-throw the error
  } finally {
    if (connection) connection.release();
  }
}

// ------------------------------------------------------------------------
// 5) ECL Calculation: Internal Formula
// ------------------------------------------------------------------------
const updateEclBasedOnInternalCalculationsSql = async (n_run_key, fic_mis_date) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Execute the update and capture the result
    const [result] = await connection.execute(`
      UPDATE fct_reporting_lines
      SET
        n_lifetime_ecl_ncy = COALESCE(n_exposure_at_default_ncy, 0) * COALESCE(n_lifetime_pd, 0) * COALESCE(n_lgd_percent, 0),
        n_12m_ecl_ncy = COALESCE(n_exposure_at_default_ncy, 0) * COALESCE(n_twelve_months_pd, 0) * COALESCE(n_lgd_percent, 0)
      WHERE n_run_key = ? AND fic_mis_date = ?;
    `, [n_run_key, fic_mis_date]);

    await connection.commit();
    
    // Log the number of affected rows
    console.log(`Successfully updated ${result.affectedRows} records with ECL using internal formula for run key ${n_run_key}, date ${fic_mis_date}.`);
    
    return result.affectedRows; // You can return this if needed

  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error in updateEclBasedOnInternalCalculationsSql: ${error.message}`);
    console.error('Full error details:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// ------------------------------------------------------------------------
// 4) Dispatcher for ECL Calculation
// ------------------------------------------------------------------------
const calculateEclBasedOnMethod = async (fic_mis_date, method_name = null) => {
  let connection;
  try {
    // Validate that a method was provided
    if (!method_name) {
      console.error("No ECL method provided");
      return '0';
    }

    // Get the latest run key
    const n_run_key = await getLatestRunSkey();
    if (!n_run_key) {
      return '0';
    }

    // Determine if the method uses discounting
    const uses_discounting = method_name === 'forward_exposure' || method_name === 'cash_flow';
    
    console.log(`Using ECL Method: ${method_name}, Discounting: ${uses_discounting}, Run Key: ${n_run_key}`);

    // Dispatch to the correct method
    if (method_name === 'forward_exposure') {
      await updateEclBasedOnForwardLossSql(n_run_key, fic_mis_date, uses_discounting);
    } else if (method_name === 'cash_flow') {
      await updateEclBasedOnCashShortfallSql(n_run_key, fic_mis_date, uses_discounting);
    } else if (method_name === 'simple_ead') {
      await updateEclBasedOnInternalCalculationsSql(n_run_key, fic_mis_date);
    } else {
      console.error(`Unknown ECL method: ${method_name}`);
      return '0';
    }

    console.log("ECL calculation completed successfully.");
    return '1';

  } catch (error) {
    console.error(`Error calculating ECL: ${error.message}`);
    return '0';
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  calculateEclBasedOnMethod,
  getLatestRunSkey,
  updateEclBasedOnCashShortfallSql,
  updateEclBasedOnForwardLossSql,
  updateEclBasedOnInternalCalculationsSql
};
