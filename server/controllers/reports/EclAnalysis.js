const db = require('../../config/database');

// List of money fields to sum
const MONEY_FIELDS = [
  'n_exposure_at_default_ncy',
  'n_carrying_amount_ncy',
  'n_lifetime_ecl_ncy',
  'n_12m_ecl_ncy'
];

// Helper to build SUM SQL
function buildSumSql(fields) {
  return fields.map(field => `SUM(\`${field}\`) AS \`${field}\``).join(', ');
}

// Helper for WHERE clause
function buildWhere(req) {
  const { fic_mis_date, n_run_key } = req.query;
  let where = [];
  let params = [];
  if (fic_mis_date) {
    where.push('fic_mis_date = ?');
    params.push(fic_mis_date);
  }
  if (n_run_key) {
    where.push('n_run_key = ?');
    params.push(n_run_key);
  }
  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
}

exports.getEclFullAnalysis = async (req, res) => {
    let connection;
    try {
      const { clause, params } = buildWhere(req);
      connection = await db.getConnection();
  
      // 1. Totals by currency
      const byCurrencySql = `
        SELECT v_ccy_code, ${buildSumSql(MONEY_FIELDS)}
        FROM fct_reporting_lines
        ${clause}
        GROUP BY v_ccy_code
      `;
      const [byCurrency] = await connection.query(byCurrencySql, params);
  
      // 2. Grand totals
      const grandTotalSql = `
        SELECT ${buildSumSql(MONEY_FIELDS)}, COUNT(*) AS total_accounts
        FROM fct_reporting_lines
        ${clause}
      `;
      const [grandTotalRows] = await connection.query(grandTotalSql, params);
      const grandTotal = grandTotalRows[0];
  
      // 3. Stage breakdown
      const stageSql = `
        SELECT n_stage_descr, COUNT(*) AS accounts, 
          ${buildSumSql(MONEY_FIELDS)}
        FROM fct_reporting_lines
        ${clause}
        GROUP BY n_stage_descr
      `;
      const [byStage] = await connection.query(stageSql, params);
  
      // 4. Product/segment breakdown
      const segmentSql = `
        SELECT n_prod_segment, COUNT(*) AS accounts,
          ${buildSumSql(MONEY_FIELDS)}
        FROM fct_reporting_lines
        ${clause}
        GROUP BY n_prod_segment
        ORDER BY accounts DESC
      `;
      const [bySegment] = await connection.query(segmentSql, params);
  
      // 5. Delinquency distribution (bands: 0, 1-30, 31-60, 61-90, 91+)
      const delinquencySql = `
        SELECT 
          CASE
            WHEN n_delinquent_days IS NULL THEN 'Unknown'
            WHEN n_delinquent_days = 0 THEN '0'
            WHEN n_delinquent_days BETWEEN 1 AND 30 THEN '1-30'
            WHEN n_delinquent_days BETWEEN 31 AND 60 THEN '31-60'
            WHEN n_delinquent_days BETWEEN 61 AND 90 THEN '61-90'
            ELSE '91+'
          END AS delinquency_band,
          COUNT(*) AS accounts,
          ${buildSumSql(MONEY_FIELDS)}
        FROM fct_reporting_lines
        ${clause}
        GROUP BY delinquency_band
        ORDER BY 
          CASE delinquency_band
            WHEN '0' THEN 0
            WHEN '1-30' THEN 1
            WHEN '31-60' THEN 2
            WHEN '61-90' THEN 3
            WHEN '91+' THEN 4
            ELSE 5
          END
      `;
      const [byDelinquency] = await connection.query(delinquencySql, params);
  
      // 6. Top 10 exposures (by EAD)
      const topExposureSql = `
        SELECT n_account_number, n_exposure_at_default_ncy, n_lifetime_ecl_ncy, n_stage_descr, n_prod_segment, v_ccy_code
        FROM fct_reporting_lines
        ${clause}
        ORDER BY n_exposure_at_default_ncy DESC
        LIMIT 10
      `;
      const [topExposures] = await connection.query(topExposureSql, params);
  
      // 7. Average PD (if present)
      const avgPdSql = `
        SELECT 
          AVG(COALESCE(n_pd_percent, n_twelve_months_pd, n_lifetime_pd)) AS avg_pd
        FROM fct_reporting_lines
        ${clause}
      `;
      const [avgPdRows] = await connection.query(avgPdSql, params);
  
      res.json({
        summary: {
          total_ead: grandTotal.n_exposure_at_default_ncy,
          total_lifetime_ecl: grandTotal.n_lifetime_ecl_ncy,
          total_12m_ecl: grandTotal.n_12m_ecl_ncy,
          total_accounts: grandTotal.total_accounts,
          avg_pd: avgPdRows[0]?.avg_pd
        },
        byCurrency,
        byStage,
        bySegment,
        byDelinquency,
        topExposures,
        grandTotal
      });
    } catch (err) {
      console.error('ECL Full Analysis error:', err);
      res.status(500).json({ error: 'Failed to get ECL full analysis' });
    } finally {
      if (connection) connection.release();
    }
  };