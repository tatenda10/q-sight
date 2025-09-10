const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Configure DPD thresholds for each stage
 */
const configureDPDThresholds = async (req, res) => {
    const { paymentFrequency, stage1Threshold, stage2Threshold, stage3Threshold } = req.body;
    
    try {
        const connection = await db.getConnection();
        
        try {
            const query = `
                INSERT INTO fsi_dpd_stage_mapping 
                (payment_frequency, stage_1_threshold, stage_2_threshold, stage_3_threshold, 
                 created_by)
                VALUES (?, ?, ?,?,?)
                ON DUPLICATE KEY UPDATE
                    stage_1_threshold = ?,
                    stage_2_threshold = ?,
                    stage_3_threshold = ?`;

            await connection.query(query, [
                paymentFrequency,
                stage1Threshold,
                stage2Threshold,
                stage3Threshold,
                req.user.username,
                stage1Threshold,
                stage2Threshold,
                stage3Threshold,
                req.user.username
            ]);

            logger.info('DPD thresholds configured successfully', {
                user: req.user.username,
                action: 'configureDPDThresholds',
                paymentFrequency,
                stage1Threshold,
                stage2Threshold,
                stage3Threshold
            });

            res.status(200).json({
                success: true,
                message: 'DPD thresholds configured successfully'
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.log('=== DPD Thresholds Configuration Error ===');
        console.log('Error Message:', error.message);
        console.log('Error Stack:', error.stack);
        console.log('Request Body:', {
            paymentFrequency,
            stage1Threshold,
            stage2Threshold,
            stage3Threshold,
            user: req.user.username
        });
        console.log('=======================================');

        logger.error('Failed to configure DPD thresholds', {
            error: error.message,
            stack: error.stack,
            user: req.user.username,
            action: 'configureDPDThresholds',
            paymentFrequency,
            stage1Threshold,
            stage2Threshold,
            stage3Threshold
        });

        res.status(500).json({
            success: false,
            message: 'Failed to configure DPD thresholds',
            error: error.message
        });
    }
};

/**
 * Get all DPD threshold configurations
 */
const getDPDThresholds = async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        try {
            const query = `
                SELECT * FROM fsi_dpd_stage_mapping
                ORDER BY payment_frequency`;

            const [rows] = await connection.query(query);

            logger.info('DPD thresholds retrieved successfully', {
                user: req.user.username,
                action: 'getDPDThresholds',
                recordCount: rows.length
            });

            res.status(200).json({
                success: true,
                data: rows
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.log('=== Get DPD Thresholds Error ===');
        console.log('Error Message:', error.message);
        console.log('Error Stack:', error.stack);
        console.log('User:', req.user.username);
        console.log('=======================================');

        logger.error('Failed to retrieve DPD thresholds', {
            error: error.message,
            stack: error.stack,
            user: req.user.username,
            action: 'getDPDThresholds'
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve DPD thresholds',
            error: error.message
        });
    }
};

/**
 * Configure delinquency bands
 */
const configureDelinquencyBands = async (req, res) => {
    const { bandCode, description, lowerValue, upperValue, amortizationTermUnit } = req.body;

    // Validate amortization term unit
    const validTermUnits = {
        'D': 'Daily',
        'W': 'Weekly',
        'M': 'Monthly',
        'Q': 'Quarterly',
        'H': 'Half-yearly',
        'Y': 'Yearly'
    };

    if (!validTermUnits[amortizationTermUnit]) {
        return res.status(400).json({
            success: false,
            message: 'Invalid amortization term unit. Must be D, W, M, Q, H, or Y'
        });
    }

    try {
        const connection = await db.getConnection();
        
        try {
            const query = `
                INSERT INTO dim_delinquency_band 
                (n_delq_band_code, v_delq_band_desc, n_delq_lower_value, n_delq_upper_value,
                v_amrt_term_unit, date, created_by)
                VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?)
                ON DUPLICATE KEY UPDATE
                    v_delq_band_desc = ?,
                    n_delq_lower_value = ?,
                    n_delq_upper_value = ?,
                    v_amrt_term_unit = ?`;

            await connection.query(query, [
                bandCode,
                description,
                lowerValue,
                upperValue,
                amortizationTermUnit,
                req.user.id, // Note: changed from username to id to match table
                // Values for UPDATE
                description,
                lowerValue,
                upperValue,
                amortizationTermUnit
            ]);

            logger.info('Delinquency band configured successfully', {
                user: req.user.username,
                action: 'configureDelinquencyBands',
                bandCode,
                description,
                lowerValue,
                upperValue,
                amortizationTermUnit
            });

            res.status(200).json({
                success: true,
                message: 'Delinquency band configured successfully'
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        // Add detailed console logging
        console.log('=== Delinquency Band Configuration Error ===');
        console.log('Error Message:', error.message);
        console.log('Error Stack:', error.stack);
        console.log('Request Body:', {
            bandCode,
            description,
            lowerValue,
            upperValue,
            amortizationTermUnit,
            user: req.user.username
        });
        console.log('=======================================');

        logger.error('Failed to configure delinquency band', {
            error: error.message,
            stack: error.stack,
            user: req.user.username,
            action: 'configureDelinquencyBands',
            bandCode,
            description,
            lowerValue,
            upperValue,
            amortizationTermUnit
        });

        res.status(500).json({
            success: false,
            message: 'Failed to configure delinquency band',
            error: error.message
        });
    }
};

/**
 * Get all delinquency bands
 */
const getDelinquencyBands = async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        try {
            const query = `
                SELECT 
                    n_delq_band_code as bandCode,
                    v_delq_band_desc as description,
                    n_delq_lower_value as lowerValue,
                    n_delq_upper_value as upperValue,
                    v_amrt_term_unit as amortizationTermUnit,
                    created_by as createdBy
                FROM dim_delinquency_band 
                ORDER BY n_delq_lower_value`;

            const [rows] = await connection.query(query);

            logger.info('Delinquency bands retrieved successfully', {
                user: req.user.username,
                action: 'getDelinquencyBands',
                recordCount: rows.length
            });

            res.status(200).json({
                success: true,
                data: rows
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.log('=== Get Delinquency Bands Error ===');
        console.log('Error Message:', error.message);
        console.log('Error Stack:', error.stack);
        console.log('User:', req.user.username);
        console.log('=======================================');

        logger.error('Failed to retrieve delinquency bands', {
            error: error.message,
            stack: error.stack,
            user: req.user.username,
            action: 'getDelinquencyBands'
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve delinquency bands',
            error: error.message
        });
    }
};

module.exports = {
    configureDPDThresholds,
    getDPDThresholds,
    configureDelinquencyBands,
    getDelinquencyBands
}; 