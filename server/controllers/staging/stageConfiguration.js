const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Configure credit rating based staging
 */
const configureCreditRatingStaging = async (req, res) => {
    const { creditRating, stage, description } = req.body;

    try {
        const connection = await db.getConnection();
        
        try {
            const query = `
                INSERT INTO fsi_creditrating_stage 
                (credit_rating, stage, description, created_by)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    stage = ?,
                    description = ?`;

            await connection.query(query, [
                creditRating,
                stage,
                description,
                req.user.username,
                // Values for UPDATE
                stage,
                description
            ]);

            logger.info('Credit rating staging configured successfully', {
                user: req.user.username,
                action: 'configureCreditRatingStaging',
                creditRating,
                stage,
                description
            });

            res.status(200).json({
                success: true,
                message: 'Credit rating staging configured successfully'
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.log('=== Credit Rating Staging Configuration Error ===');
        console.log('Error Message:', error.message);
        console.log('Error Stack:', error.stack);
        console.log('Request Body:', {
            creditRating,
            stage,
            description,
            user: req.user.username
        });
        console.log('=======================================');

        logger.error('Failed to configure credit rating staging', {
            error: error.message,
            stack: error.stack,
            user: req.user.username,
            action: 'configureCreditRatingStaging'
        });

        res.status(500).json({
            success: false,
            message: 'Failed to configure credit rating staging',
            error: error.message
        });
    }
};

/**
 * Get credit rating staging configurations
 */
const getCreditRatingStaging = async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        try {
            const query = `
                SELECT 
                    id,
                    credit_rating,
                    stage,
                    description
                    
                FROM fsi_creditrating_stage
                ORDER BY credit_rating`;

            const [rows] = await connection.query(query);

            logger.info('Credit rating staging retrieved successfully', {
                user: req.user.username,
                action: 'getCreditRatingStaging',
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
        console.log('=== Get Credit Rating Staging Error ===');
        console.log('Error Message:', error.message);
        console.log('Error Stack:', error.stack);
        console.log('User:', req.user.username);
        console.log('=======================================');

        logger.error('Failed to retrieve credit rating staging', {
            error: error.message,
            stack: error.stack,
            user: req.user.username,
            action: 'getCreditRatingStaging'
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve credit rating staging',
            error: error.message
        });
    }
};

module.exports = {
    configureCreditRatingStaging,
    getCreditRatingStaging
}; 