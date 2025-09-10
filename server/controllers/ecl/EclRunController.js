const db = require('../../config/database');

// Get all ECL run history
const getAllEclRuns = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const query = 'SELECT * FROM ecl_runs ORDER BY created_at DESC';
    const [rows] = await connection.execute(query);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching ECL run history:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getAllEclRuns
}; 