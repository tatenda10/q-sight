const db = require('../../../config/database');
const { format } = require('date-fns');

class ECLReconciliations {
    static async getLatestRunSkey() {
        let connection;
        try {
            connection = await db.getConnection();
            const [rows] = await connection.query(`
                SELECT MAX(n_run_key) AS max_run_skey 
                FROM fct_reporting_lines
            `);

            if (rows && rows.length > 0 && rows[0].max_run_skey !== null) {
                return rows[0].max_run_skey;
            }
            throw new Error("No run key available in fct_reporting_lines table");
        } catch (error) {
            console.error(`Error fetching run key: ${error.message}`);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    static async getTwoPeriodReconciliation(currentRunKey, currentMisDate, previousRunKey, previousMisDate) {
        let connection;
        try {
            connection = await db.getConnection();
            const formattedCurrentDate = format(new Date(currentMisDate), 'yyyy-MM-dd');
            const formattedPreviousDate = format(new Date(previousMisDate), 'yyyy-MM-dd');

            // Get stage comparison
            const [stageComparison] = await connection.execute(`
                WITH CurrentPeriod AS (
                    SELECT 
                        n_curr_ifrs_stage_skey as stage,
                        COUNT(*) as account_count,
                        SUM(n_carrying_amount_rcy) as total_balance,
                        SUM(n_lifetime_ecl_rcy) as total_ecl,
                        AVG(n_pd_percent) as avg_pd,
                        AVG(n_lgd_percent) as avg_lgd
                    FROM fct_reporting_lines
                    WHERE fic_mis_date = ?
                    AND n_run_key = ?
                    GROUP BY n_curr_ifrs_stage_skey
                ),
                PreviousPeriod AS (
                    SELECT 
                        n_curr_ifrs_stage_skey as stage,
                        COUNT(*) as account_count,
                        SUM(n_carrying_amount_rcy) as total_balance,
                        SUM(n_lifetime_ecl_rcy) as total_ecl,
                        AVG(n_pd_percent) as avg_pd,
                        AVG(n_lgd_percent) as avg_lgd
                    FROM fct_reporting_lines
                    WHERE fic_mis_date = ?
                    AND n_run_key = ?
                    GROUP BY n_curr_ifrs_stage_skey
                )
                SELECT 
                    COALESCE(c.stage, p.stage) as stage,
                    c.account_count as current_accounts,
                    p.account_count as previous_accounts,
                    c.total_balance as current_balance,
                    p.total_balance as previous_balance,
                    c.total_ecl as current_ecl,
                    p.total_ecl as previous_ecl,
                    c.avg_pd as current_pd,
                    p.avg_pd as previous_pd,
                    c.avg_lgd as current_lgd,
                    p.avg_lgd as previous_lgd,
                    (c.account_count - p.account_count) as account_movement,
                    (c.total_balance - p.total_balance) as balance_movement,
                    (c.total_ecl - p.total_ecl) as ecl_movement
                FROM CurrentPeriod c
                FULL OUTER JOIN PreviousPeriod p ON c.stage = p.stage
                ORDER BY COALESCE(c.stage, p.stage)
            `, [formattedCurrentDate, currentRunKey, formattedPreviousDate, previousRunKey]);

            // Get delinquency band comparison
            const [delinquencyComparison] = await connection.execute(`
                WITH CurrentPeriod AS (
                    SELECT 
                        n_delq_band_code,
                        COUNT(*) as account_count,
                        SUM(n_carrying_amount_rcy) as total_balance,
                        SUM(n_lifetime_ecl_rcy) as total_ecl
                    FROM fct_reporting_lines
                    WHERE fic_mis_date = ?
                    AND n_run_key = ?
                    GROUP BY n_delq_band_code
                ),
                PreviousPeriod AS (
                    SELECT 
                        n_delq_band_code,
                        COUNT(*) as account_count,
                        SUM(n_carrying_amount_rcy) as total_balance,
                        SUM(n_lifetime_ecl_rcy) as total_ecl
                    FROM fct_reporting_lines
                    WHERE fic_mis_date = ?
                    AND n_run_key = ?
                    GROUP BY n_delq_band_code
                )
                SELECT 
                    COALESCE(c.n_delq_band_code, p.n_delq_band_code) as delq_band,
                    c.account_count as current_accounts,
                    p.account_count as previous_accounts,
                    c.total_balance as current_balance,
                    p.total_balance as previous_balance,
                    c.total_ecl as current_ecl,
                    p.total_ecl as previous_ecl,
                    (c.account_count - p.account_count) as account_movement,
                    (c.total_balance - p.total_balance) as balance_movement,
                    (c.total_ecl - p.total_ecl) as ecl_movement
                FROM CurrentPeriod c
                FULL OUTER JOIN PreviousPeriod p ON c.n_delq_band_code = p.n_delq_band_code
                ORDER BY COALESCE(c.n_delq_band_code, p.n_delq_band_code)
            `, [formattedCurrentDate, currentRunKey, formattedPreviousDate, previousRunKey]);

            // Get portfolio quality metrics comparison
            const [portfolioComparison] = await connection.execute(`
                WITH CurrentPeriod AS (
                    SELECT 
                        COUNT(*) as total_accounts,
                        SUM(CASE WHEN n_curr_ifrs_stage_skey = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as stage_1_pct,
                        SUM(CASE WHEN n_curr_ifrs_stage_skey = 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as stage_2_pct,
                        SUM(CASE WHEN n_curr_ifrs_stage_skey = 3 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as stage_3_pct,
                        AVG(n_pd_percent) as avg_pd,
                        AVG(n_lgd_percent) as avg_lgd,
                        SUM(n_lifetime_ecl_rcy) * 100.0 / SUM(n_carrying_amount_rcy) as coverage_ratio
                    FROM fct_reporting_lines
                    WHERE fic_mis_date = ?
                    AND n_run_key = ?
                ),
                PreviousPeriod AS (
                    SELECT 
                        COUNT(*) as total_accounts,
                        SUM(CASE WHEN n_curr_ifrs_stage_skey = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as stage_1_pct,
                        SUM(CASE WHEN n_curr_ifrs_stage_skey = 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as stage_2_pct,
                        SUM(CASE WHEN n_curr_ifrs_stage_skey = 3 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as stage_3_pct,
                        AVG(n_pd_percent) as avg_pd,
                        AVG(n_lgd_percent) as avg_lgd,
                        SUM(n_lifetime_ecl_rcy) * 100.0 / SUM(n_carrying_amount_rcy) as coverage_ratio
                    FROM fct_reporting_lines
                    WHERE fic_mis_date = ?
                    AND n_run_key = ?
                )
                SELECT 
                    c.total_accounts as current_total_accounts,
                    p.total_accounts as previous_total_accounts,
                    c.stage_1_pct as current_stage_1_pct,
                    p.stage_1_pct as previous_stage_1_pct,
                    c.stage_2_pct as current_stage_2_pct,
                    p.stage_2_pct as previous_stage_2_pct,
                    c.stage_3_pct as current_stage_3_pct,
                    p.stage_3_pct as previous_stage_3_pct,
                    c.avg_pd as current_avg_pd,
                    p.avg_pd as previous_avg_pd,
                    c.avg_lgd as current_avg_lgd,
                    p.avg_lgd as previous_avg_lgd,
                    c.coverage_ratio as current_coverage_ratio,
                    p.coverage_ratio as previous_coverage_ratio,
                    (c.total_accounts - p.total_accounts) as account_movement,
                    (c.coverage_ratio - p.coverage_ratio) as coverage_ratio_movement
                FROM CurrentPeriod c
                CROSS JOIN PreviousPeriod p
            `, [formattedCurrentDate, currentRunKey, formattedPreviousDate, previousRunKey]);

            return {
                stageComparison,
                delinquencyComparison,
                portfolioComparison: portfolioComparison[0]
            };
        } catch (error) {
            console.error('Error in getTwoPeriodReconciliation:', error);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    static async getStageReconciliation(misDate) {
        let connection;
        try {
            connection = await db.getConnection();
            const latestRunKey = await this.getLatestRunSkey();
            const formattedMisDate = format(new Date(misDate), 'yyyy-MM-dd');

            const [results] = await connection.execute(`
                SELECT 
                    n_curr_ifrs_stage_skey AS stage,
                    COUNT(*) AS account_count,
                    SUM(n_carrying_amount_rcy) AS total_outstanding_balance,
                    SUM(n_lifetime_ecl_rcy) AS total_ecl_amount,
                    AVG(n_pd_percent) AS average_pd,
                    AVG(n_lgd_percent) AS average_lgd,
                    AVG(n_exposure_at_default_rcy) AS average_ead
                FROM fct_reporting_lines
                WHERE fic_mis_date = ?
                AND n_run_key = ?
                GROUP BY n_curr_ifrs_stage_skey
                ORDER BY n_curr_ifrs_stage_skey
            `, [formattedMisDate, latestRunKey]);

            return results;
        } catch (error) {
            console.error('Error in getStageReconciliation:', error);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    static async getDelinquencyBandReconciliation(misDate) {
        let connection;
        try {
            connection = await db.getConnection();
            const latestRunKey = await this.getLatestRunSkey();
            const formattedMisDate = format(new Date(misDate), 'yyyy-MM-dd');

            const [results] = await connection.execute(`
                SELECT 
                    n_delq_band_code,
                    n_stage_descr as delq_band_desc,
                    COUNT(*) AS account_count,
                    SUM(n_carrying_amount_rcy) AS total_outstanding_balance,
                    SUM(n_lifetime_ecl_rcy) AS total_ecl_amount
                FROM fct_reporting_lines
                WHERE fic_mis_date = ?
                AND n_run_key = ?
                GROUP BY n_delq_band_code, n_stage_descr
                ORDER BY n_delq_band_code
            `, [formattedMisDate, latestRunKey]);

            return results;
        } catch (error) {
            console.error('Error in getDelinquencyBandReconciliation:', error);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    static async getECLMovementAnalysis(currentMisDate, previousMisDate) {
        let connection;
        try {
            connection = await db.getConnection();
            const latestRunKey = await this.getLatestRunSkey();
            const formattedCurrentDate = format(new Date(currentMisDate), 'yyyy-MM-dd');
            const formattedPreviousDate = format(new Date(previousMisDate), 'yyyy-MM-dd');

            const [results] = await connection.execute(`
                WITH CurrentECL AS (
                    SELECT 
                        n_account_number,
                        n_curr_ifrs_stage_skey as stage,
                        n_lifetime_ecl_rcy as current_ecl
                    FROM fct_reporting_lines
                    WHERE fic_mis_date = ?
                    AND n_run_key = ?
                ),
                PreviousECL AS (
                    SELECT 
                        n_account_number,
                        n_curr_ifrs_stage_skey as stage,
                        n_lifetime_ecl_rcy as previous_ecl
                    FROM fct_reporting_lines
                    WHERE fic_mis_date = ?
                    AND n_run_key = ?
                )
                SELECT 
                    CASE 
                        WHEN c.stage = p.stage THEN 'No Stage Movement'
                        WHEN c.stage > p.stage THEN 'Stage Deterioration'
                        WHEN c.stage < p.stage THEN 'Stage Improvement'
                        WHEN p.stage IS NULL THEN 'New Accounts'
                        WHEN c.stage IS NULL THEN 'Closed Accounts'
                    END as movement_type,
                    COUNT(*) as account_count,
                    SUM(COALESCE(c.current_ecl, 0) - COALESCE(p.previous_ecl, 0)) as ecl_movement
                FROM CurrentECL c
                FULL OUTER JOIN PreviousECL p
                    ON c.n_account_number = p.n_account_number
                GROUP BY 
                    CASE 
                        WHEN c.stage = p.stage THEN 'No Stage Movement'
                        WHEN c.stage > p.stage THEN 'Stage Deterioration'
                        WHEN c.stage < p.stage THEN 'Stage Improvement'
                        WHEN p.stage IS NULL THEN 'New Accounts'
                        WHEN c.stage IS NULL THEN 'Closed Accounts'
                    END
            `, [formattedCurrentDate, latestRunKey, formattedPreviousDate, latestRunKey]);

            return results;
        } catch (error) {
            console.error('Error in getECLMovementAnalysis:', error);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    static async getPortfolioQualityMetrics(misDate) {
        let connection;
        try {
            connection = await db.getConnection();
            const latestRunKey = await this.getLatestRunSkey();
            const formattedMisDate = format(new Date(misDate), 'yyyy-MM-dd');

            const [results] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_accounts,
                    SUM(CASE WHEN n_curr_ifrs_stage_skey = 1 THEN 1 ELSE 0 END) / COUNT(*) * 100 as stage_1_percentage,
                    SUM(CASE WHEN n_curr_ifrs_stage_skey = 2 THEN 1 ELSE 0 END) / COUNT(*) * 100 as stage_2_percentage,
                    SUM(CASE WHEN n_curr_ifrs_stage_skey = 3 THEN 1 ELSE 0 END) / COUNT(*) * 100 as stage_3_percentage,
                    AVG(n_pd_percent) as average_portfolio_pd,
                    AVG(n_lgd_percent) as average_portfolio_lgd,
                    SUM(n_lifetime_ecl_rcy) / SUM(n_carrying_amount_rcy) * 100 as coverage_ratio
                FROM fct_reporting_lines
                WHERE fic_mis_date = ?
                AND n_run_key = ?
            `, [formattedMisDate, latestRunKey]);

            return results[0];
        } catch (error) {
            console.error('Error in getPortfolioQualityMetrics:', error);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = ECLReconciliations;
