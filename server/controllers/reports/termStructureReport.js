const db = require('../../config/database');

const getTermStructureReport = async (req, res) => {
    let connection;
    try {
        const { runKey, reportingDate } = req.query;

        // Get a connection from the pool
        connection = await db.getConnection();

        // Add indexes if they don't exist (you should do this in a migration)
        // CREATE INDEX idx_run_date ON fct_reporting_lines(n_run_key, fic_mis_date);
        // CREATE INDEX idx_term_structure ON fct_reporting_lines(n_pd_term_structure_name);
 
        const query = `
            SELECT 
                n_pd_term_structure_name,
                n_delq_band_code,
                COUNT(*) as account_count,
                SUM(n_exposure_at_default_ncy) as total_exposure,
                SUM(n_12m_ecl_ncy) as total_12m_ecl,
                AVG(n_lgd_percent) as average_lgd,
                AVG(n_twelve_months_pd) as average_pd
            FROM fct_reporting_lines USE INDEX (idx_run_date)
            WHERE n_run_key = ?
            AND fic_mis_date = ?
            GROUP BY n_pd_term_structure_name, n_delq_band_code
            ORDER BY n_pd_term_structure_name, n_delq_band_code;
        `;

        const [results] = await connection.query(query, [runKey, reportingDate]);

        // Transform the results to organize by term structure
        const transformedResults = results.reduce((acc, row) => {
            if (!acc[row.n_pd_term_structure_name]) {
                acc[row.n_pd_term_structure_name] = [];
            }
            
            // Ensure numeric values are properly handled
            const totalExposure = parseFloat(row.total_exposure) || 0;
            const total12MECL = parseFloat(row.total_12m_ecl) || 0;
            const averageLGD = parseFloat(row.average_lgd) || 0;
            const averagePD = parseFloat(row.average_pd) || 0;
            
            acc[row.n_pd_term_structure_name].push({
                delinquencyBand: row.n_delq_band_code,
                totalExposure: totalExposure.toFixed(3),
                total12MECL: total12MECL.toFixed(3),
                averageLGD: averageLGD.toFixed(15),
                averagePD: averagePD.toFixed(15),
                accountCount: parseInt(row.account_count, 10)
            });
            return acc;
        }, {});

        res.json({
            success: true,
            data: transformedResults
        });
    } catch (error) {
        console.error('Error in getTermStructureReport:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getTermStructureReport
};
