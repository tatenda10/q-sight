const express = require('express');
const router = express.Router();
const { 
    getClassificationMeasurement,
    addClassificationMeasurement,
    updateClassificationMeasurement,
    deleteClassificationMeasurement 
} = require('../controllers/classification/ClassificationMeasurement');

const { authenticate, hasRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/classification-measurement:
 *   get:
 *     summary: Get all classification measurements with pagination
 *     tags: [Classification Measurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalRecords:
 *                       type: integer
 *                     recordsPerPage:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server Error
 */
router.get('/', authenticate, hasRoles(['ADMIN']), getClassificationMeasurement);

/**
 * @swagger
 * /api/classification-measurement:
 *   post:
 *     summary: Create a new classification measurement
 *     tags: [Classification Measurement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the classification measurement
 *               description:
 *                 type: string
 *                 description: Description of the classification measurement
 *     responses:
 *       201:
 *         description: Classification measurement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *       400:
 *         description: Bad Request - Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server Error
 */
router.post('/', authenticate, hasRoles(['ADMIN']), addClassificationMeasurement);

/**
 * @swagger
 * /api/classification-measurement:
 *   put:
 *     summary: Update classification and measurement for a product
 *     tags: [Classification Measurement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - classification
 *               - measurement
 *             properties:
 *               id:
 *                 type: integer
 *                 description: ID of the record to update
 *               classification:
 *                 type: string
 *                 enum: 
 *                   - "Financial Asset at Amortized Cost"
 *                   - "Financial Asset at Fair Value Through OCI (FVOCI)"
 *                   - "Financial Asset at Fair Value Through Profit or Loss (FVTPL)"
 *                 description: Classification type
 *               measurement:
 *                 type: string
 *                 enum:
 *                   - "Amortized Cost"
 *                   - "Fair Value (OCI)"
 *                   - "Fair Value (P&L)"
 *                 description: Measurement type
 *     responses:
 *       200:
 *         description: Classification and measurement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Classification and measurement updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     classification:
 *                       type: string
 *                       example: Financial Asset at Amortized Cost
 *                     measurement:
 *                       type: string
 *                       example: Amortized Cost
 *       400:
 *         description: Bad Request - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: ID, classification, and measurement are required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Record not found
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Error updating classification and measurement
 *                 error:
 *                   type: string
 */
router.put('/', authenticate, hasRoles(['ADMIN']), updateClassificationMeasurement);

/**
 * @swagger
 * /api/classification-measurement:
 *   delete:
 *     summary: Delete a classification measurement
 *     tags: [Classification Measurement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: ID of the classification measurement to delete
 *     responses:
 *       200:
 *         description: Classification measurement deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad Request - Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Classification measurement not found
 *       500:
 *         description: Server Error
 */
router.delete('/', authenticate, hasRoles(['ADMIN']), deleteClassificationMeasurement);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
        error: err.message
    });
});

module.exports = router;
