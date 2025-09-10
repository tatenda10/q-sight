const { getConnection } = require('../../config/database');
const moment = require('moment');

// Simulate a Dim_Run table for run_skey (replace with your actual table/logic if needed)
async function getNextRunSkey(connection) {
    try {
      // Get the most recent run_skey based on latest ID
      const [rows] = await connection.query(`
        SELECT latest_run_skey 
        FROM Dim_Run 
        ORDER BY id DESC 
        LIMIT 1
      `);
  
      // If no previous record, start at 1
      const nextRunSkey = rows.length === 0 ? 1 : rows[0].latest_run_skey;
  
      return nextRunSkey;
  
    } catch (e) {
      console.error('Error in getNextRunSkey:', e.message);
      return 1; // fallback if query fails
    }
  }
  
  

// Main function: insert cashflows for a given fic_mis_date
async function insertCashFlowData(fic_mis_date) {
  const connection = await getConnection();
  try {
    if (!fic_mis_date) throw new Error('fic_mis_date is required');
    // Get the next run_skey
    const next_run_skey = await getNextRunSkey(connection);
    if (!next_run_skey) throw new Error('Could not get next run skey');

    // Set-based insert from FSI_Expected_Cashflow into fsi_financial_cash_flow_cal
    const sql = `
      INSERT INTO fsi_financial_cash_flow_cal (
        v_account_number, d_cash_flow_date, n_run_skey, fic_mis_date,
        n_principal_run_off, n_interest_run_off, n_cash_flow_bucket_id,
        n_cash_flow_amount, v_ccy_code, n_exposure_at_default
      )
      SELECT
        v_account_number,
        d_cashflow_date,
        ?,
        fic_mis_date,
        n_principal_component,
        n_interest_component,
        n_cashflow_bucket,
        n_total_component,
        v_ccy_code,
        n_exposure_at_default
      FROM FSI_Expected_Cashflow
      WHERE fic_mis_date = ?
    `;
    const [result] = await connection.query(sql, [next_run_skey, fic_mis_date]);
    console.log(`Inserted ${result.affectedRows} records for fic_mis_date ${fic_mis_date} with run key ${next_run_skey}.`);
    return '1';
  } catch (e) {
    console.error('Error during cash flow insertion:', e.message);
    return '0';
  } finally {
    connection.release();
  }
}

module.exports = { insertCashFlowData };
