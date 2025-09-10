const express = require('express');
const router = express.Router();
const ECLReconciliations = require('../controllers/ECL Reconciliations/ECLReconciliations');

// Middleware to validate date format
const validateDate = (req, res, next) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const { misDate } = req.query;
    
    if (!misDate || !dateRegex.test(misDate)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid date format. Please use YYYY-MM-DD format.'
        });
    }
    next();
};

// Get stage reconciliation for a single period
router.get('/stage-reconciliation', validateDate, async (req, res) => {
    try {
        const { misDate } = req.query;
        const results = await ECLReconciliations.getStageReconciliation(misDate);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error in stage reconciliation route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stage reconciliation data',
            error: error.message
        });
    }
});

// Get delinquency band reconciliation for a single period
router.get('/delinquency-reconciliation', validateDate, async (req, res) => {
    try {
        const { misDate } = req.query;
        const results = await ECLReconciliations.getDelinquencyBandReconciliation(misDate);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error in delinquency reconciliation route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching delinquency reconciliation data',
            error: error.message
        });
    }
});

// Get portfolio quality metrics for a single period
router.get('/portfolio-metrics', validateDate, async (req, res) => {
    try {
        const { misDate } = req.query;
        const results = await ECLReconciliations.getPortfolioQualityMetrics(misDate);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error in portfolio metrics route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching portfolio metrics',
            error: error.message
        });
    }
});

// Get two-period reconciliation
router.get('/two-period-reconciliation', async (req, res) => {
    try {
        const { 
            currentRunKey, 
            currentMisDate, 
            previousRunKey, 
            previousMisDate 
        } = req.query;

        // Validate all required parameters
        if (!currentRunKey || !currentMisDate || !previousRunKey || !previousMisDate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters. Please provide currentRunKey, currentMisDate, previousRunKey, and previousMisDate'
            });
        }

        // Validate date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(currentMisDate) || !dateRegex.test(previousMisDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD format.'
            });
        }

        const results = await ECLReconciliations.getTwoPeriodReconciliation(
            currentRunKey,
            currentMisDate,
            previousRunKey,
            previousMisDate
        );
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error in two-period reconciliation route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching two-period reconciliation data',
            error: error.message
        });
    }
});

// Get ECL movement analysis
router.get('/ecl-movement', async (req, res) => {
    try {
        const { currentMisDate, previousMisDate } = req.query;

        // Validate dates
        if (!currentMisDate || !previousMisDate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters. Please provide currentMisDate and previousMisDate'
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(currentMisDate) || !dateRegex.test(previousMisDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD format.'
            });
        }

        const results = await ECLReconciliations.getECLMovementAnalysis(
            currentMisDate,
            previousMisDate
        );
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error in ECL movement analysis route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ECL movement analysis',
            error: error.message
        });
    }
});

module.exports = router;
