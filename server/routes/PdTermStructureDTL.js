const express = require('express');
const router = express.Router();
const {
    addTermStructureDetails,
    getTermStructureDetails,
    updateTermStructureDetails
} = require('../controllers/pd config/Pd_term_structure_dtl');
const { authenticate, hasRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/pd-term-structure-details/add:
 *   post:
 *     summary: Add details to a PD term structure
 *     tags: [PD Term Structure Details]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - termStructureId
 *               - details
 *             properties:
 *               termStructureId:
 *                 type: integer
 *                 description: ID of the term structure to add details to
 *               details:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - ficMisDate
 *                     - creditRiskBasisCd
 *                     - pdPercent
 *                   properties:
 *                     ficMisDate:
 *                       type: string
 *                       format: date
 *                       description: MIS date for the detail
 *                     creditRiskBasisCd:
 *                       type: string
 *                       description: Credit risk basis code
 *                     pdPercent:
 *                       type: number
 *                       format: float
 *                       description: Probability of default percentage
 *     responses:
 *       200:
 *         description: Term structure details added successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/add', authenticate, hasRoles(['ADMIN']), addTermStructureDetails);

/**
 * @swagger
 * /api/pd-term-structure-details:
 *   get:
 *     summary: Get all details for PD term structures
 *     tags: [PD Term Structure Details]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all term structure details
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
 *                       v_pd_term_structure_id:
 *                         type: integer
 *                       fic_mis_date:
 *                         type: string
 *                         format: date
 *                       v_credit_risk_basis_cd:
 *                         type: string
 *                       n_pd_percent:
 *                         type: number
 *                         format: float
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', authenticate, hasRoles(['ADMIN']), getTermStructureDetails);

/**
 * @swagger
 * /api/pd-term-structure-details/update:
 *   put:
 *     summary: Update details for a PD term structure
 *     tags: [PD Term Structure Details]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - termStructureId
 *               - details
 *             properties:
 *               termStructureId:
 *                 type: integer
 *                 description: ID of the term structure to update details for
 *               details:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - ficMisDate
 *                     - creditRiskBasisCd
 *                     - pdPercent
 *                   properties:
 *                     ficMisDate:
 *                       type: string
 *                       format: date
 *                       description: MIS date for the detail
 *                     creditRiskBasisCd:
 *                       type: string
 *                       description: Credit risk basis code
 *                     pdPercent:
 *                       type: number
 *                       format: float
 *                       description: Probability of default percentage
 *     responses:
 *       200:
 *         description: Term structure details updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Term structure not found
 */
router.put('/update', authenticate, hasRoles(['ADMIN']), updateTermStructureDetails);

module.exports = router;
