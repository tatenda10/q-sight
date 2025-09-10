const fs = require('fs');
const path = require('path');
const db = require('../../../config/database');

// Path to the columns config file
const CONFIG_PATH = path.join(__dirname, 'ecl_columns_config.json');

// Cache for selected columns to avoid repeated file reads
let columnsCache = null;

// Helper to read selected columns with caching
function getSelectedColumns() {
  if (columnsCache) return columnsCache;
  
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('ECL columns config not found');
  }
  
  const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const json = JSON.parse(data);
  columnsCache = Array.isArray(json.columns) ? json.columns : [];
  return columnsCache;
}

// Prepare column list once with date columns identified
function prepareColumnSql() {
  const columns = getSelectedColumns();
  if (!columns.length) return null;
  
  return columns.map(col => {
    // MySQL can format dates directly in the query
    if (col.toLowerCase().includes('date')) {
      return `DATE_FORMAT(\`${col}\`, '%Y-%m-%d') AS \`${col}\``;
    }
    return `\`${col}\``;
  }).join(', ');
}

// Controller to get ECL data
exports.getEclData = async (req, res) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ECL data extraction started`);

  let connection;
  try {
    console.log(`[${new Date().toISOString()}] Processing request params`);
    const { fic_mis_date, n_run_key } = req.query;
    
    if (!fic_mis_date || !n_run_key) {
      return res.status(400).json({ error: 'fic_mis_date and n_run_key are required' });
    }
    
    console.log(`[${new Date().toISOString()}] Preparing column SQL`);
    const columnsSql = prepareColumnSql();
    if (!columnsSql) {
      return res.status(500).json({ error: 'No columns configured for ECL extraction' });
    }
    
    console.log(`[${new Date().toISOString()}] Getting database connection`);
    connection = await db.getConnection();
    
    const sql = `
      SELECT ${columnsSql}
      FROM fct_reporting_lines
      WHERE fic_mis_date = ? AND n_run_key = ?
    `;
    
    console.log(`[${new Date().toISOString()}] Executing database query`);
    console.log(`Query params: fic_mis_date=${fic_mis_date}, n_run_key=${n_run_key}`);
    
    const queryStartTime = Date.now();
    const [rows] = await connection.execute(sql, [fic_mis_date, n_run_key]);
    const queryEndTime = Date.now();
    
    console.log(`[${new Date().toISOString()}] Query executed - ${rows.length} rows retrieved`);
    console.log(`Query execution time: ${queryEndTime - queryStartTime}ms`);
    
    console.log(`[${new Date().toISOString()}] Sending response`);
    res.json({ 
      data: rows,
      executionTime: {
        total: Date.now() - startTime,
        query: queryEndTime - queryStartTime
      }
    });
    
    console.log(`[${new Date().toISOString()}] ECL data extraction completed in ${Date.now() - startTime}ms`);
  } catch (err) {
    const errorTime = Date.now();
    console.error(`[${new Date().toISOString()}] Get ECL error:`, err);
    console.log(`Error occurred after ${errorTime - startTime}ms`);
    res.status(500).json({ 
      error: 'Failed to retrieve ECL data',
      executionTime: Date.now() - startTime
    });
  } finally {
    if (connection) {
      console.log(`[${new Date().toISOString()}] Releasing database connection`);
      connection.release();
    }
  }
};