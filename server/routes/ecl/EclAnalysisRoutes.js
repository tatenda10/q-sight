const express = require('express');
const router = express.Router();
const EclAnalysisController = require('../../controllers/ecl/EclAnalysisController');
const LossAllowanceReport = require('../../controllers/ecl/LossAllowanceReport');

// ECL by Stage Report
router.get('/by-stage', EclAnalysisController.getEclByStage);

// ECL by Product Segment Report
router.get('/by-product-segment', EclAnalysisController.getEclByProductSegment);

// Stage Migration Report
router.get('/stage-migration', EclAnalysisController.getStageMigration);

// Period Comparison Report
router.get('/period-comparison', EclAnalysisController.getPeriodComparison);

// Loss Allowance Report (IFRS 7)
router.get('/loss-allowance-report', LossAllowanceReport.getLossAllowanceReport);

module.exports = router; 