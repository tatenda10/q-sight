const express = require('express');
const router = express.Router();
const { authenticate, hasRoles } = require('../middleware/auth');
const { 
    configureDPDThresholds, 
    getDPDThresholds, 
    configureDelinquencyBands, 
    getDelinquencyBands 
} = require('../controllers/staging/delinquencyManagement');
const { 
    configureCreditRatingStaging,
    getCreditRatingStaging 
} = require('../controllers/staging/stageConfiguration');

/**
 * @swagger
 * /api/staging/dpd-thresholds:
 *   post:
 *     summary: Configure DPD thresholds for stages
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentFrequency
 *               - stage1Threshold
 *               - stage2Threshold
 *               - stage3Threshold
 *             properties:
 *               paymentFrequency:
 *                 type: string
 *                 enum: [D, W, M, Q, H, Y]
 *                 example: "M"
 *                 description: D=Daily, W=Weekly, M=Monthly, Q=Quarterly, H=Half-yearly, Y=Yearly
 *               stage1Threshold:
 *                 type: integer
 *                 example: 30
 *               stage2Threshold:
 *                 type: integer
 *                 example: 90
 *               stage3Threshold:
 *                 type: integer
 *                 example: 91
 */
router.post('/dpd-thresholds', authenticate, hasRoles(['ADMIN']), configureDPDThresholds);

/**
 * @swagger
 * /api/staging/dpd-thresholds:
 *   get:
 *     summary: Get all DPD threshold configurations
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of DPD threshold configurations
 */
router.get('/dpd-thresholds', authenticate, hasRoles(['ADMIN']), getDPDThresholds);

/**
 * @swagger
 * /api/staging/delinquency-bands:
 *   post:
 *     summary: Configure delinquency bands
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bandCode
 *               - description
 *               - lowerValue
 *               - upperValue
 *               - amortizationTermUnit
 *             properties:
 *               bandCode:
 *                 type: string
 *                 example: "STG1_DPD"
 *                 description: Unique code for the delinquency band
 *               description:
 *                 type: string
 *                 example: "Stage 1 - Current to 30 Days"
 *               lowerValue:
 *                 type: integer
 *                 example: 0
 *                 description: Lower bound of days past due
 *               upperValue:
 *                 type: integer
 *                 example: 30
 *                 description: Upper bound of days past due
 *               amortizationTermUnit:
 *                 type: string
 *                 enum: [D, W, M, Q, H, Y]
 *                 example: "M"
 *                 description: D=Daily, W=Weekly, M=Monthly, Q=Quarterly, H=Half-yearly, Y=Yearly
 *     responses:
 *       200:
 *         description: Delinquency band configured successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/delinquency-bands', authenticate, hasRoles(['ADMIN']), configureDelinquencyBands);

/**
 * @swagger
 * /api/staging/delinquency-bands:
 *   get:
 *     summary: Get all delinquency bands
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of delinquency bands
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bandCode:
 *                         type: string
 *                       description:
 *                         type: string
 *                       lowerValue:
 *                         type: integer
 *                       upperValue:
 *                         type: integer
 *                       amortizationTermUnit:
 *                         type: string
 *                         enum: [D, W, M, Q, H, Y]
 *                       createdDate:
 *                         type: string
 *                         format: date
 *                       createdBy:
 *                         type: integer
 *                       modifiedDate:
 *                         type: string
 *                         format: date
 *                       modifiedBy:
 *                         type: integer
 */
router.get('/delinquency-bands', authenticate, hasRoles(['ADMIN']), getDelinquencyBands);

/**
 * @swagger
 * /api/staging/credit-rating:
 *   post:
 *     summary: Configure credit rating staging
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - creditRating
 *               - stage
 *               - description
 *             properties:
 *               creditRating:
 *                 type: string
 *                 example: "AAA"
 *                 description: Credit rating code
 *               stage:
 *                 type: integer
 *                 example: 1
 *                 description: IFRS 9 stage (1, 2, or 3)
 *               description:
 *                 type: string
 *                 example: "High Grade - Minimal Risk"
 *     responses:
 *       200:
 *         description: Credit rating staging configured successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/credit-rating', authenticate, hasRoles(['ADMIN']), configureCreditRatingStaging);

/**
 * @swagger
 * /api/staging/credit-rating:
 *   get:
 *     summary: Get all credit rating staging configurations
 *     tags: [Staging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of credit rating staging configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       credit_rating:
 *                         type: string
 *                       stage:
 *                         type: integer
 *                       description:
 *                         type: string
 *                       created_by:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       modified_by:
 *                         type: string
 *                       modified_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/credit-rating', authenticate, hasRoles(['ADMIN']), getCreditRatingStaging);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = router;
