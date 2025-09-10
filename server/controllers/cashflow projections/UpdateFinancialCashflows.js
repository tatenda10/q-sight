const { getConnection } = require('../../config/database');

// Get the latest run_skey from Dim_Run table
async function getLatestRunSkey(connection) {
  try {
    const [rows] = await connection.query('SELECT latest_run_skey FROM Dim_Run ORDER BY id DESC LIMIT 1');
    if (!rows.length) {
      throw new Error('No run key is available in the Dim_Run table.');
    }
    return rows[0].latest_run_skey;
  } catch (e) {
    console.error('Error fetching latest run_skey:', e.message);
    return null;
  }
}

// Update n_effective_interest_rate and n_lgd_percent in fsi_financial_cash_flow_cal for a given fic_mis_date
async function updateFinancialCashFlow(fic_mis_date) {
  const connection = await getConnection();
  let updated_count = 0;
  try {
    if (!fic_mis_date) throw new Error('fic_mis_date is required');
    const run_skey = await getLatestRunSkey(connection);
    if (!run_skey) {
      console.error('No valid run_skey found.');
      return '0';
    }
    // MySQL UPDATE with JOIN
    const sql = `
      UPDATE fsi_financial_cash_flow_cal cf
      JOIN fct_stage_determination sd
        ON cf.fic_mis_date = sd.fic_mis_date
        AND cf.v_account_number = sd.n_account_number
      SET 
        cf.n_effective_interest_rate = sd.n_effective_interest_rate,
        cf.n_lgd_percent = sd.n_lgd_percent
      WHERE cf.n_run_skey = ? AND cf.fic_mis_date = ?
    `;
    const [result] = await connection.query(sql, [run_skey, fic_mis_date]);
    updated_count = result.affectedRows;
    if (updated_count > 0) {
      console.log(`Successfully updated ${updated_count} rows for fic_mis_date=${fic_mis_date}, run_skey=${run_skey}.`);
      return '1';
    } else {
      console.log(`No rows matched for fic_mis_date=${fic_mis_date}, run_skey=${run_skey}.`);
      return '0';
    }
  } catch (e) {
    console.error(`Error executing fast update for fic_mis_date=${fic_mis_date}:`, e.message);
    return '0';
  } finally {
    connection.release();
  }
}

module.exports = { updateFinancialCashFlow };
