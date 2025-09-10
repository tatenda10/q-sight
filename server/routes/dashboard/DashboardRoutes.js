const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboard/DashboardController');

// Get latest approved run
router.get('/latest-approved-run', dashboardController.getLatestApprovedRun);

// Get recent approved dates
router.get('/recent-approved-dates', dashboardController.getRecentApprovedDates);

// Get portfolio summary
router.get('/portfolio-summary', dashboardController.getPortfolioSummary);

// Get product segmentation
router.get('/product-segmentation', dashboardController.getProductSegmentation);

// Get ECL trends
router.get('/ecl-trends', dashboardController.getEclTrends);

// Get IFRS 7.35G Report
router.get('/ifrs-735g-report', dashboardController.getIFRS735GReport);

// Get Loss Allowance Report
router.get('/loss-allowance-report', dashboardController.getLossAllowanceReport);

module.exports = router; 