const express = require('express');
const AIController = require('../controllers/ai/AIController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const aiController = new AIController();

// Apply authentication middleware to all AI routes
router.use(authenticate);

/**
 * @route   POST /api/ai/analyze-loss-allowance
 * @desc    Analyze Loss Allowance Report with AI
 * @access  Private
 */
router.post('/analyze-loss-allowance', async (req, res) => {
  await aiController.analyzeLossAllowanceReport(req, res);
});

/**
 * @route   POST /api/ai/analyze-ecl-analysis
 * @desc    Analyze ECL Analysis Report with AI
 * @access  Private
 */
router.post('/analyze-ecl-analysis', async (req, res) => {
  await aiController.analyzeECLAnalysisReport(req, res);
});

/**
 * @route   POST /api/ai/analyze-ifrs-735g
 * @desc    Analyze IFRS 7.35G Term Structure Report with AI
 * @access  Private
 */
router.post('/analyze-ifrs-735g', async (req, res) => {
  await aiController.analyzeIFRS735GReport(req, res);
});

/**
 * @route   POST /api/ai/analyze-pd-comparison
 * @desc    Analyze PD Comparison Report with AI
 * @access  Private
 */
router.post('/analyze-pd-comparison', async (req, res) => {
  await aiController.analyzePDComparisonReport(req, res);
});

/**
 * @route   GET /api/ai/status
 * @desc    Get AI service status and health check
 * @access  Private
 */
router.get('/status', async (req, res) => {
  await aiController.getAIStatus(req, res);
});

/**
 * @route   POST /api/ai/generate-summary
 * @desc    Generate AI summary for any ECL report
 * @access  Private
 */
router.post('/generate-summary', async (req, res) => {
  await aiController.generateReportSummary(req, res);
});

/**
 * @route   POST /api/ai/chat
 * @desc    Handle AI chat interactions
 * @access  Private
 */
router.post('/chat', async (req, res) => {
  await aiController.handleChat(req, res);
});

module.exports = router;
