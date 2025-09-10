const express = require('express');
const router = express.Router();
const { 
    createTermStructure, 
    getTermStructures, 
    updateTermStructure, 
    getTermStructureById 
} = require('../controllers/pd config/Pd_term_structure');
const { authenticate, hasRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/pd-term-structures:
 *   post:
 *     summary: Create a new PD term structure
 *     tags: [PD Term Structure]
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
 *               - termStructureName
 *               - termFrequencyUnit
 *               - termStructureType
 *               - ficMisDate
 *             properties:
 *               termStructureId:
 *                 type: string
 *                 description: Unique identifier for the term structure
 *               termStructureName:
 *                 type: integer
 *                 description: Product segment ID reference from FSI_Product_Segment table
 *               termStructureDesc:
 *                 type: string
 *                 description: Description of the term structure
 *               termFrequencyUnit:
 *                 type: string
 *                 enum: [M, Q, H, Y]
 *                 description: M-Monthly, Q-Quarterly, H-Half yearly, Y-Yearly
 *               termStructureType:
 *                 type: string
 *                 enum: [R, D]
 *                 description: R-Rating based, D-Delinquency based
 *               ficMisDate:
 *                 type: string
 *                 format: date
 *                 description: MIS date for the term structure
 *     responses:
 *       200:
 *         description: Term structure created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/', authenticate, hasRoles(['ADMIN']), createTermStructure);

/**
 * @swagger
 * /api/pd-term-structures:
 *   get:
 *     summary: Get all PD term structures
 *     tags: [PD Term Structure]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of PD term structures
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
 *                         type: string
 *                       v_pd_term_structure_name:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', authenticate, hasRoles(['ADMIN']), getTermStructures);

/**
 * @swagger
 * /api/pd-term-structures/{termStructureId}:
 *   get:
 *     summary: Get a specific PD term structure by ID
 *     tags: [PD Term Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: termStructureId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the term structure to retrieve
 *     responses:
 *       200:
 *         description: Term structure details with associated data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Term structure not found
 */
router.get('/:termStructureId', authenticate, hasRoles(['ADMIN']), getTermStructureById);

/**
 * @swagger
 * /api/pd-term-structures/{termStructureId}:
 *   put:
 *     summary: Update a PD term structure
 *     tags: [PD Term Structure]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: termStructureId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the term structure to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               termStructureName:
 *                 type: integer
 *                 description: Product segment ID reference from FSI_Product_Segment table
 *               termStructureDesc:
 *                 type: string
 *                 description: Updated description
 *               termFrequencyUnit:
 *                 type: string
 *                 enum: [M, Q, H, Y]
 *                 description: M-Monthly, Q-Quarterly, H-Half yearly, Y-Yearly
 *               termStructureType:
 *                 type: string
 *                 enum: [R, D]
 *                 description: R-Rating based, D-Delinquency based
 *               ficMisDate:
 *                 type: string
 *                 format: date
 *                 description: Updated MIS date
 *     responses:
 *       200:
 *         description: Term structure updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Term structure not found
 */
router.put('/:termStructureId', authenticate, hasRoles(['ADMIN']), updateTermStructure);

module.exports = router;
