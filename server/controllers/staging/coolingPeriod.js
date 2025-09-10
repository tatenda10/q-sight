const pool = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Controller for managing cooling periods for stage transitions
 */
const coolingPeriodManagement = {
    /**
     * Define cooling period for stage transitions
     */
    async defineCoolingPeriod(req, res) {
        const { amortizationTermUnit, coolingPeriodDays, description } = req.body;

        try {
            const query = `
                INSERT INTO fsi_cooling_period_definition 
                (v_amrt_term_unit, n_cooling_period_days, v_description,
                d_created_date, v_created_by)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
                ON CONFLICT (v_amrt_term_unit) DO UPDATE
                SET n_cooling_period_days = $2,
                    v_description = $3,
                    d_modified_date = CURRENT_TIMESTAMP,
                    v_modified_by = $4`;

            await pool.query(query, [
                amortizationTermUnit,
                coolingPeriodDays,
                description,
                req.user.username
            ]);

            res.status(200).json({
                success: true,
                message: 'Cooling period defined successfully'
            });
        } catch (error) {
            logger.error('Error in defineCoolingPeriod:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to define cooling period',
                error: error.message
            });
        }
    },

    /**
     * Get all cooling period definitions
     */
    async getCoolingPeriods(req, res) {
        try {
            const query = `
                SELECT * FROM fsi_cooling_period_definition
                ORDER BY v_amrt_term_unit`;

            const { rows } = await pool.query(query);

            res.status(200).json({
                success: true,
                data: rows
            });
        } catch (error) {
            logger.error('Error in getCoolingPeriods:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve cooling periods',
                error: error.message
            });
        }
    }
};

module.exports = coolingPeriodManagement; 