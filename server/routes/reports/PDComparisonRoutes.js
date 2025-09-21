const express = require('express');
const router = express.Router();
const { getPDComparisonReport } = require('../../controllers/reports/PDComparisonReport');

/**
 * @route   GET /api/reports/pd-comparison
 * @desc    Get PD Comparison Report data
 * @access  Private
 */
router.get('/pd-comparison', async (req, res) => {
    await getPDComparisonReport(req, res);
});

module.exports = router;
