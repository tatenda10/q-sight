const { getConnection } = require('../../config/database');

// Helper: Get the latest run_skey from Dim_Run table using raw SQL
async function getLatestRunSkeySQL(connection) {
  const [rows] = await connection.query('SELECT latest_run_skey FROM Dim_Run ORDER BY id DESC LIMIT 1');
  if (!rows.length) {
    throw new Error('No run key available in Dim_Run table.');
  }
  return rows[0].latest_run_skey;
}

// Main: Update fsi_financial_cash_flow_cal using account-level PD values from fsi_pd_account_interpolated
async function updateCashflowWithAccountPdBuckets(fic_mis_date) {
  const connection = await getConnection();
  try {
    if (!fic_mis_date) throw new Error('fic_mis_date is required');
    const n_run_skey = await getLatestRunSkeySQL(connection);

    // First update: Set cumulative loss and impaired probabilities
    const sql1 = `
      UPDATE fsi_financial_cash_flow_cal cf
      JOIN fsi_pd_account_interpolated pd ON
        pd.v_account_number = cf.v_account_number AND
        pd.fic_mis_date = cf.fic_mis_date AND
        pd.v_cash_flow_bucket_id = cf.n_cash_flow_bucket_id
      SET 
        cf.n_cumulative_loss_rate = pd.n_cumulative_default_prob * cf.n_lgd_percent,
        cf.n_cumulative_impaired_prob = pd.n_cumulative_default_prob
      WHERE cf.fic_mis_date = ? AND cf.n_run_skey = ?
    `;
    const [result1] = await connection.query(sql1, [fic_mis_date, n_run_skey]);
    console.log(`Updated cumulative loss/impaired probabilities: ${result1.affectedRows} rows.`);

    // Second update: Set 12-month cumulative PD based on bucket and term unit
    const sql2 = `
      UPDATE fsi_financial_cash_flow_cal cf
      JOIN fsi_pd_account_interpolated pd ON
        pd.v_account_number = cf.v_account_number AND
        pd.fic_mis_date = cf.fic_mis_date AND
        pd.v_cash_flow_bucket_id = (
          CASE 
            WHEN cf.n_cash_flow_bucket_id <= (
              CASE cf.v_amrt_term_unit
                WHEN 'M' THEN 12
                WHEN 'Q' THEN 4
                WHEN 'H' THEN 2
                WHEN 'Y' THEN 1
                ELSE 12
              END
            )
            THEN cf.n_cash_flow_bucket_id
            ELSE (
              CASE cf.v_amrt_term_unit
                WHEN 'M' THEN 12
                WHEN 'Q' THEN 4
                WHEN 'H' THEN 2
                WHEN 'Y' THEN 1
                ELSE 12
              END
            )
          END
        )
      SET cf.n_12m_cumulative_pd = pd.n_cumulative_default_prob
      WHERE cf.fic_mis_date = ? AND cf.n_run_skey = ?
    `;
    const [result2] = await connection.query(sql2, [fic_mis_date, n_run_skey]);
    console.log(`Updated 12-month cumulative PD: ${result2.affectedRows} rows.`);

    return 1;
  } catch (e) {
    console.error('Error updating cashflow with PD buckets:', e.message);
    return 0;
  } finally {
    connection.release();
  }
}

module.exports = { updateCashflowWithAccountPdBuckets };
