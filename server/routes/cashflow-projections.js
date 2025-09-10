const express = require('express');
const router = express.Router();
const { calculateCashFlowsForLoan, getCashFlows, calculateCashFlowsForDate } = require('../controllers/cashflow projections/ExpectedCashflowProjection');
const {  authenticate, hasRoles } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Cashflow Projections
 *   description: API endpoints for managing cashflow projections
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CashflowProjection:
 *       type: object
 *       properties:
 *         fic_mis_date:
 *           type: string
 *           format: date
 *           description: MIS date for the cashflow
 *         v_account_number:
 *           type: string
 *           description: Account number of the loan
 *         n_cash_flow_bucket:
 *           type: integer
 *           description: Bucket number for the cashflow
 *         d_cash_flow_date:
 *           type: string
 *           format: date
 *           description: Date of the cashflow
 *         n_principal_payment:
 *           type: number
 *           format: double
 *           description: Principal payment amount
 *         n_interest_payment:
 *           type: number
 *           format: double
 *           description: Interest payment amount
 *         n_cash_flow_amount:
 *           type: number
 *           format: double
 *           description: Total cashflow amount
 *         n_balance:
 *           type: number
 *           format: double
 *           description: Remaining balance
 *         v_ccy_code:
 *           type: string
 *           description: Currency code
 */

/**
 * @swagger
 * /api/cashflow-projections:
 *   post:
 *     summary: Calculate cashflow projections for a loan
 *     tags: [Cashflow Projections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fic_mis_date
 *               - v_account_number
 *             properties:
 *               fic_mis_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-20"
 *               v_account_number:
 *                 type: string
 *                 example: "LOAN123"
 *     responses:
 *       200:
 *         description: Cashflow projections calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cashflow projections calculated successfully
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, hasRoles(['ADMIN']), calculateCashFlowsForLoan)

/**
 * @swagger
 * /api/cashflow-projections:
 *   get:
 *     summary: Get cashflow projections for a loan
 *     tags: [Cashflow Projections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fic_mis_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-03-20"
 *         description: MIS date for the cashflow projections
 *       - in: query
 *         name: v_account_number
 *         required: true
 *         schema:
 *           type: string
 *         example: "LOAN123"
 *         description: Account number of the loan
 *     responses:
 *       200:
 *         description: Cashflow projections retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CashflowProjection'
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Missing required parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No cashflow projections found
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, hasRoles(['ADMIN', 'USER']), getCashFlows);
router.post('/', authenticate, hasRoles(['ADMIN']), calculateCashFlowsForDate)

module.exports = router; 