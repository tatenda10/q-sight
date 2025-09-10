const db = require('../../config/database');

// Get ECL by Stage Report
const getEclByStage = async (req, res) => {
    const { date, run_key } = req.query;
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
            SELECT 
                stage,
                COUNT(*) as account_count,
                SUM(n_eop_bal) as total_exposure,
                SUM(n_ecl) as total_ecl,
                AVG(n_ecl / NULLIF(n_eop_bal, 0)) * 100 as ecl_percentage
            FROM fct_reporting_lines
            WHERE fic_mis_date = ? AND n_run_key = ?
            GROUP BY stage
            ORDER BY stage;
        `;
        const [rows] = await connection.execute(query, [date, run_key]);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching ECL by stage:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get ECL by Product Segment Report
const getEclByProductSegment = async (req, res) => {
    const { date, run_key } = req.query;
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
            SELECT 
                v_product_class,
                stage,
                COUNT(*) as account_count,
                SUM(n_eop_bal) as total_exposure,
                SUM(n_ecl) as total_ecl,
                AVG(n_ecl / NULLIF(n_eop_bal, 0)) * 100 as ecl_percentage
            FROM fct_reporting_lines
            WHERE fic_mis_date = ? AND n_run_key = ?
            GROUP BY v_product_class, stage
            ORDER BY v_product_class, stage;
        `;
        const [rows] = await connection.execute(query, [date, run_key]);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching ECL by product segment:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get Stage Migration Report
const getStageMigration = async (req, res) => {
    const { current_date, previous_date, current_run_key, previous_run_key } = req.query;
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
            WITH current_stages AS (
                SELECT 
                    v_account_number,
                    stage as current_stage,
                    n_eop_bal as current_balance,
                    n_ecl as current_ecl
                FROM fct_reporting_lines
                WHERE fic_mis_date = ? AND n_run_key = ?
            ),
            previous_stages AS (
                SELECT 
                    v_account_number,
                    stage as previous_stage,
                    n_eop_bal as previous_balance,
                    n_ecl as previous_ecl
                FROM fct_reporting_lines
                WHERE fic_mis_date = ? AND n_run_key = ?
            )
            SELECT 
                COALESCE(ps.previous_stage, 'New') as from_stage,
                cs.current_stage as to_stage,
                COUNT(*) as account_count,
                SUM(cs.current_balance) as total_exposure,
                SUM(cs.current_ecl) as total_ecl,
                AVG(cs.current_ecl / NULLIF(cs.current_balance, 0)) * 100 as ecl_percentage
            FROM current_stages cs
            LEFT JOIN previous_stages ps ON cs.v_account_number = ps.v_account_number
            GROUP BY ps.previous_stage, cs.current_stage
            ORDER BY ps.previous_stage, cs.current_stage;
        `;
        const [rows] = await connection.execute(query, [
            current_date, current_run_key,
            previous_date, previous_run_key
        ]);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching stage migration:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get Period Comparison Report
const getPeriodComparison = async (req, res) => {
    const { current_date, previous_date, current_run_key, previous_run_key } = req.query;
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
            WITH current_period AS (
                SELECT 
                    stage,
                    COUNT(*) as account_count,
                    SUM(n_eop_bal) as total_exposure,
                    SUM(n_ecl) as total_ecl,
                    AVG(n_ecl / NULLIF(n_eop_bal, 0)) * 100 as ecl_percentage
                FROM fct_reporting_lines
                WHERE fic_mis_date = ? AND n_run_key = ?
                GROUP BY stage
            ),
            previous_period AS (
                SELECT 
                    stage,
                    COUNT(*) as account_count,
                    SUM(n_eop_bal) as total_exposure,
                    SUM(n_ecl) as total_ecl,
                    AVG(n_ecl / NULLIF(n_eop_bal, 0)) * 100 as ecl_percentage
                FROM fct_reporting_lines
                WHERE fic_mis_date = ? AND n_run_key = ?
                GROUP BY stage
            )
            SELECT 
                COALESCE(cp.stage, pp.stage) as stage,
                cp.account_count as current_account_count,
                pp.account_count as previous_account_count,
                cp.total_exposure as current_exposure,
                pp.total_exposure as previous_exposure,
                cp.total_ecl as current_ecl,
                pp.total_ecl as previous_ecl,
                cp.ecl_percentage as current_ecl_percentage,
                pp.ecl_percentage as previous_ecl_percentage
            FROM current_period cp
            FULL OUTER JOIN previous_period pp ON cp.stage = pp.stage
            ORDER BY COALESCE(cp.stage, pp.stage);
        `;
        const [rows] = await connection.execute(query, [
            current_date, current_run_key,
            previous_date, previous_run_key
        ]);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching period comparison:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getEclByStage,
    getEclByProductSegment,
    getStageMigration,
    getPeriodComparison
}; 