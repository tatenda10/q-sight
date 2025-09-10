const { getConnection } = require('../../config/database');

// Get the latest run_skey from Dim_Run table
async function getLatestRunSkey(connection) {
  try {
    const [rows] = await connection.query('SELECT latest_run_skey FROM Dim_Run ORDER BY id DESC LIMIT 1');
    if (!rows.length) {
      console.error('No run key is available in the Dim_Run table.');
      return null;
    }
    return rows[0].latest_run_skey;
  } catch (e) {
    console.error('Error retrieving latest run key:', e.message);
    return null;
  }
}

// Calculate and update discount rates and factors for all records matching fic_mis_date and latest run key
async function calculateDiscountFactors(fic_mis_date) {
  const connection = await getConnection();
  let updated_count = 0;
  try {
    if (!fic_mis_date) throw new Error('fic_mis_date is required');
    const run_skey = await getLatestRunSkey(connection);
    if (!run_skey) {
      console.error('No valid run_skey found.');
      return 0;
    }
    // MySQL UPDATE with JOIN and CASE for amortization units
    const sql = `
      UPDATE fsi_financial_cash_flow_cal f
      JOIN fct_stage_determination s
        ON s.n_account_number = f.v_account_number AND s.fic_mis_date = f.fic_mis_date
      SET 
        f.n_discount_rate = COALESCE(f.n_effective_interest_rate, f.n_discount_rate),
        f.n_discount_factor = CASE 
          WHEN COALESCE(f.n_effective_interest_rate, f.n_discount_rate) IS NOT NULL 
               AND f.n_cash_flow_bucket_id IS NOT NULL
          THEN 1 / POW(
            1 + COALESCE(f.n_effective_interest_rate, f.n_discount_rate), 
            (f.n_cash_flow_bucket_id / (
              CASE s.v_amrt_term_unit
                WHEN 'D' THEN 365
                WHEN 'W' THEN 52
                WHEN 'M' THEN 12
                WHEN 'Q' THEN 4
                WHEN 'H' THEN 2
                WHEN 'Y' THEN 1
                ELSE 12
              END
            ))
          )
          ELSE f.n_discount_factor
        END
      WHERE f.fic_mis_date = ? AND f.n_run_skey = ?
    `;
    const [result] = await connection.query(sql, [fic_mis_date, run_skey]);
    updated_count = result.affectedRows;
    if (updated_count > 0) {
      console.log(`Successfully updated ${updated_count} records.`);
      return 1;
    } else {
      console.log('No records updated.');
      return 0;
    }
  } catch (e) {
    console.error('Error calculating discount factors:', e.message);
    return 0;
  } finally {
    connection.release();
  }
}

module.exports = { calculateDiscountFactors };
