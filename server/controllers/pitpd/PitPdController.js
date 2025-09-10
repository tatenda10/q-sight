const db = require('../../config/database');
const VasicekModel = require('../models/vasicheck model/Vasicheck');

class PitPdController {
  static async getPitPdMatrix(req, res) {
    let connection;
    try {
      const { scenario, period, portfolio, product } = req.query;
      connection = await db.getConnection();

      // 1. Load TTC PDs for the requested segment(s)
      const [ttcRows] = await connection.execute(
        `SELECT portfolio, product, risk_band, bucket, ttc_pd
         FROM ttc_pd_term_structures
         WHERE portfolio = ? AND product = ?`,
        [portfolio, product]
      );

      // 2. Group into matrix structure
      const ttcMatrix = [];
      const grouped = {};
      for (const row of ttcRows) {
        const key = `${row.portfolio}:${row.product}:${row.risk_band}`;
        if (!grouped[key]) {
          grouped[key] = { portfolio: row.portfolio, product: row.product, risk_band: row.risk_band, buckets: [] };
          ttcMatrix.push(grouped[key]);
        }
        grouped[key].buckets[row.bucket - 1] = row.ttc_pd;
      }

      // 3. Load MEV scenario
      const [mevVars] = await connection.execute(
        `SELECT variable_name, value FROM mev_variables WHERE period = ? AND scenario = ?`,
        [period, scenario]
      );
      const mev = {};
      mevVars.forEach(v => { mev[v.variable_name] = v.value; });

      // 4. Load coefficients (segment-specific or global)
      const segmentKey = `${portfolio}:${product}`;
      const [coeffRows] = await connection.execute(
        `SELECT variable_name, coefficient FROM mev_coefficients WHERE segment_key IS NULL OR segment_key = ?`,
        [segmentKey]
      );
      const coefficients = {};
      coeffRows.forEach(c => { coefficients[c.variable_name] = c.coefficient; });

      // 5. Compute PIT PD matrix
      const pitMatrix = VasicekModel.computePitPdMatrix(ttcMatrix, mev, coefficients);

      res.json({ success: true, pitMatrix });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }

  // 1. Add TTC PDs (bulk insert)
  static async addTtcPds(req, res) {
    let connection;
    try {
      const { ttcPds } = req.body; // Array of { portfolio, product, risk_band, bucket, ttc_pd, valid_from, valid_to }
      if (!Array.isArray(ttcPds) || ttcPds.length === 0) {
        return res.status(400).json({ success: false, message: 'No TTC PDs provided' });
      }
      connection = await db.getConnection();
      const values = ttcPds.map(
        pd => [pd.portfolio, pd.product, pd.risk_band, pd.bucket, pd.ttc_pd, pd.valid_from, pd.valid_to]
      );
      await connection.query(
        `INSERT INTO ttc_pd_term_structures (portfolio, product, risk_band, bucket, ttc_pd, valid_from, valid_to)
         VALUES ?`,
        [values]
      );
      res.json({ success: true, message: 'TTC PDs added' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }

  // 2. Get TTC PDs (with optional filters)
  static async getTtcPds(req, res) {
    let connection;
    try {
      const { portfolio, product, risk_band } = req.query;
      connection = await db.getConnection();
      let sql = `SELECT * FROM ttc_pd_term_structures WHERE 1=1`;
      const params = [];
      if (portfolio) { sql += ' AND portfolio = ?'; params.push(portfolio); }
      if (product) { sql += ' AND product = ?'; params.push(product); }
      if (risk_band) { sql += ' AND risk_band = ?'; params.push(risk_band); }
      const [rows] = await connection.execute(sql, params);
      res.json({ success: true, ttcPds: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }

  // 3. Add macroeconomic variables (bulk insert)
  static async addMevVariables(req, res) {
    let connection;
    try {
      const { mevVariables } = req.body; // Array of { period, scenario, variable_name, value }
      if (!Array.isArray(mevVariables) || mevVariables.length === 0) {
        return res.status(400).json({ success: false, message: 'No MEV variables provided' });
      }
      connection = await db.getConnection();
      const values = mevVariables.map(
        v => [v.period, v.scenario, v.variable_name, v.value]
      );
      await connection.query(
        `INSERT INTO mev_variables (period, scenario, variable_name, value)
         VALUES ?`,
        [values]
      );
      res.json({ success: true, message: 'MEV variables added' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }

  // 4. Get macroeconomic variables (with optional filters)
  static async getMevVariables(req, res) {
    let connection;
    try {
      const { period, scenario, variable_name } = req.query;
      connection = await db.getConnection();
      let sql = `SELECT * FROM mev_variables WHERE 1=1`;
      const params = [];
      if (period) { sql += ' AND period = ?'; params.push(period); }
      if (scenario) { sql += ' AND scenario = ?'; params.push(scenario); }
      if (variable_name) { sql += ' AND variable_name = ?'; params.push(variable_name); }
      const [rows] = await connection.execute(sql, params);
      res.json({ success: true, mevVariables: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = PitPdController; 