const express = require('express');
const router = express.Router();
const {
    addLGDTermStructure,
    getLGDTermStructures,
    updateLGDTermStructure,
    deleteLGDTermStructure
} = require('../controllers/lgd config/LGDConfig');
const { authenticate, hasRoles } = require('../middleware/auth');

// Route to add a new LGD term structure
/**
 * @swagger
 * /api/lgd-term-structures/add:
 *   post:
 *     summary: Add a new LGD term structure
 *     tags: [LGD Term Structures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lgdTermStructureId:
 *                 type: integer
 *               lgdTermStructureName:
 *                 type: string
 *               lgdPercent:
 *                 type: number
 *                 format: float
 *               ficMisDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: LGD term structure added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/add', authenticate, hasRoles(['ADMIN']), addLGDTermStructure);

/**
 * @swagger
 * /api/lgd-term-structures:
 *   get:
 *     summary: Get all LGD term structures
 *     tags: [LGD Term Structures]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all LGD term structures
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
 *                       v_lgd_term_structure_id:
 *                         type: integer
 *                       v_lgd_term_structure_name:
 *                         type: string
 *                       n_lgd_percent:
 *                         type: number
 *                         format: float
 *                       fic_mis_date:
 *                         type: string
 *                         format: date
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', authenticate, hasRoles(['ADMIN']), getLGDTermStructures);

// Route to update an LGD term structure
/**
 * @swagger
 * /api/lgd-term-structures/update:
 *   put:
 *     summary: Update an existing LGD term structure
 *     tags: [LGD Term Structures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lgdTermStructureId:
 *                 type: integer
 *               lgdPercent:
 *                 type: number
 *                 format: float
 *               ficMisDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: LGD term structure updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.put('/update', authenticate, hasRoles(['ADMIN']), updateLGDTermStructure);

// Route to delete an LGD term structure
/**
 * @swagger
 * /api/lgd-term-structures/{lgdTermStructureId}:
 *   delete:
 *     summary: Delete an LGD term structure
 *     tags: [LGD Term Structures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lgdTermStructureId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the LGD term structure to delete
 *     responses:
 *       200:
 *         description: LGD term structure deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: LGD term structure not found
 */
router.delete('/:lgdTermStructureId', authenticate, hasRoles(['ADMIN']), deleteLGDTermStructure);

module.exports = router;
