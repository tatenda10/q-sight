const db = require('../../config/database');

// Get the latest approved run key for the most recent date
const getLatestApprovedRun = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
            SELECT 
                run_key,
                DATE_FORMAT(date, '%Y-%m-%d') as date 
            FROM ecl_runs 
            WHERE approved = true 
            ORDER BY date DESC, created_at DESC 
            LIMIT 1
        `;
        const [rows] = await connection.execute(query);
        console.log('Latest approved run:', rows[0]);
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error fetching latest approved run:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get the two most recent approved dates
const getRecentApprovedDates = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
            SELECT DISTINCT 
                DATE_FORMAT(date, '%Y-%m-%d') as date,
                run_key
            FROM ecl_runs 
            WHERE approved = 1
            ORDER BY date DESC 
            LIMIT 2
        `;
        const [rows] = await connection.execute(query);
        
        // Log the results for debugging
        console.log('Recent approved dates:', rows);
        
        if (rows.length === 0) {
            return res.json({ 
                success: false, 
                message: 'No approved dates found',
                data: []
            });
        }
        
        res.json({ 
            success: true, 
            data: rows.map(row => ({
                date: row.date,
                run_key: row.run_key
            }))
        });
    } catch (err) {
        console.error('Error fetching recent approved dates:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching recent approved dates',
            error: err.message 
        });
    } finally {
        if (connection) connection.release();
    }
};

// Get portfolio summary for the most recent approved run
const getPortfolioSummary = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const { run_key, date } = req.query;
        
        // Convert date to YYYY-MM-DD format
        const formattedDate = date ? new Date(date).toISOString().split('T')[0] : null;
        
        console.log('Portfolio Summary Request:', { run_key, date, formattedDate });
        
        const query = `
            WITH LatestRun AS (
                SELECT 
                    run_key, 
                    DATE_FORMAT(date, '%Y-%m-%d') as date
                FROM ecl_runs
                WHERE approved = true
                ORDER BY date DESC, created_at DESC
                LIMIT 1
            )
            SELECT 
                COUNT(DISTINCT frl.n_account_number) as total_accounts,
                SUM(frl.n_12m_ecl_ncy) as total_ecl,
                SUM(frl.n_exposure_at_default_ncy) as total_ead,
                SUM(frl.n_carrying_amount_ncy) as total_outstanding_balance,
                er.run_key,
                DATE_FORMAT(er.date, '%Y-%m-%d') as date
            FROM ecl_runs er
            JOIN fct_reporting_lines frl ON er.run_key = frl.n_run_key 
                AND DATE(er.date) = DATE(frl.fic_mis_date)
            WHERE er.run_key = COALESCE(?, (SELECT run_key FROM LatestRun))
                AND DATE(er.date) = COALESCE(DATE(?), (SELECT DATE(date) FROM LatestRun))
            GROUP BY er.run_key, er.date
        `;
        
        console.log('Executing query with params:', [run_key, formattedDate]);
        const [rows] = await connection.execute(query, [run_key, formattedDate]);
        console.log('Query results:', rows);
        
        if (rows.length === 0) {
            console.log('No data found for the specified criteria');
            return res.json({ 
                success: true, 
                data: null,
                message: 'No data found for the specified criteria'
            });
        }
        
        console.log('Returning data:', rows[0]);
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error fetching portfolio summary:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get product segmentation with account counts
const getProductSegmentation = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const { run_key, date } = req.query;
        
        const query = `
            WITH LatestRun AS (
                SELECT run_key, date
                FROM ecl_runs
                WHERE approved = true
                ORDER BY date DESC, created_at DESC
                LIMIT 1
            )
            SELECT 
                n_prod_type,
                COUNT(DISTINCT n_account_number) as account_count,
                SUM(n_12m_ecl_ncy) as total_ecl,
                SUM(n_exposure_at_default_ncy) as total_ead,
                SUM(n_carrying_amount_ncy) as total_outstanding_balance,
                AVG(n_twelve_months_pd) as average_pd,
                AVG(n_lgd_percent) as average_lgd
            FROM ecl_runs er
            JOIN fct_reporting_lines frl ON er.run_key = frl.n_run_key 
                AND DATE(er.date) = DATE(frl.fic_mis_date)
            WHERE er.run_key = COALESCE(?, (SELECT run_key FROM LatestRun))
                AND DATE(er.date) = COALESCE(DATE(?), (SELECT DATE(date) FROM LatestRun))
            GROUP BY n_prod_type
            ORDER BY account_count DESC
        `;
        
        console.log('Executing product segmentation query with params:', [run_key, date]);
        const [rows] = await connection.execute(query, [run_key, date]);
        console.log('Product segmentation results:', rows);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching product segmentation:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get ECL trends over time (using only approved runs)
const getEclTrends = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
            SELECT 
                er.date,
                er.run_key,
                SUM(frl.n_12m_ecl_ncy) as total_12m_ecl_ncy,
                SUM(frl.n_exposure_at_default_ncy) as total_ead,
                COUNT(DISTINCT frl.n_account_number) as total_accounts
            FROM ecl_runs er
            JOIN fct_reporting_lines frl ON er.run_key = frl.n_run_key 
                AND er.date = frl.fic_mis_date
            WHERE er.approved = true
            GROUP BY er.date, er.run_key
            ORDER BY er.date DESC
            LIMIT 12
        `;
        
        const [rows] = await connection.execute(query);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching ECL trends:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get IFRS 7.35G Report data
const getIFRS735GReport = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const { run_key, date } = req.query;
        
        const query = `
            SELECT 
                n_prod_segment,
                n_curr_ifrs_stage_skey as stage,
                COUNT(DISTINCT n_account_number) as account_count,
                SUM(n_exposure_at_default_ncy) as total_ead,
                AVG(n_pd_percent) as average_pd,
                AVG(n_lgd_percent) as average_lgd,
                SUM(n_12m_ecl_ncy) as total_ecl
            FROM fct_reporting_lines
            WHERE n_run_key = ? AND fic_mis_date = ?
            GROUP BY n_prod_segment, n_curr_ifrs_stage_skey
            ORDER BY n_prod_segment, n_curr_ifrs_stage_skey
        `;
        
        const [rows] = await connection.execute(query, [run_key, date]);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching IFRS 7.35G report:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get Loss Allowance Report data
const getLossAllowanceReport = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        
        // Get the latest approved run
        const runQuery = `
            SELECT run_key, date 
            FROM ecl_runs 
            WHERE approved = true 
            ORDER BY date DESC, created_at DESC 
            LIMIT 1
        `;
        const [runs] = await connection.execute(runQuery);
        
        if (runs.length === 0) {
            return res.json({ 
                success: true, 
                data: null,
                message: 'No approved runs found'
            });
        }

        const currentRun = runs[0];
        
        // Get segment-wise metrics
        const query = `
            SELECT 
                n_prod_segment as segment,
                SUM(n_exposure_at_default_ncy) as total_ead,
                AVG(n_pd_percent) as average_pd,
                AVG(n_lgd_percent) as average_lgd,
                SUM(n_12m_ecl_ncy) as total_ecl,
                COUNT(DISTINCT n_account_number) as account_count
            FROM fct_reporting_lines
            WHERE n_run_key = ? AND fic_mis_date = ?
            GROUP BY n_prod_segment
            ORDER BY n_prod_segment
        `;
        
        const [segments] = await connection.execute(query, [currentRun.run_key, currentRun.date]);
        
        // Calculate totals
        const totals = segments.reduce((acc, row) => ({
            total_ead: acc.total_ead + row.total_ead,
            total_ecl: acc.total_ecl + row.total_ecl,
            account_count: acc.account_count + row.account_count,
            // For averages, we'll calculate weighted averages
            weighted_pd: acc.weighted_pd + (row.average_pd * row.total_ead),
            weighted_lgd: acc.weighted_lgd + (row.average_lgd * row.total_ead)
        }), {
            total_ead: 0,
            total_ecl: 0,
            account_count: 0,
            weighted_pd: 0,
            weighted_lgd: 0
        });

        // Calculate final weighted averages
        if (totals.total_ead > 0) {
            totals.average_pd = totals.weighted_pd / totals.total_ead;
            totals.average_lgd = totals.weighted_lgd / totals.total_ead;
        } else {
            totals.average_pd = 0;
            totals.average_lgd = 0;
        }

        delete totals.weighted_pd;
        delete totals.weighted_lgd;
        
        res.json({ 
            success: true, 
            data: {
                segments,
                totals,
                date: currentRun.date
            }
        });
    } catch (err) {
        console.error('Error fetching Loss Allowance report:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getLatestApprovedRun,
    getRecentApprovedDates,
    getPortfolioSummary,
    getProductSegmentation,
    getEclTrends,
    getIFRS735GReport,
    getLossAllowanceReport
};
