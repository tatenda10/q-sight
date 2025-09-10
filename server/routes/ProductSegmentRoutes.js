const express = require('express');
const router = express.Router();
const { 
    createProductSegment, 
    getProductSegments, 
    getProductSegmentById 
} = require('../controllers/product config/ProductSegments');
const { authenticate, hasRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/product-segments:
 *   post:
 *     summary: Create a new product segment
 *     tags: [Product Segments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prodSegment
 *               - prodType
 *             properties:
 *               prodSegment:
 *                 type: string
 *                 description: Product segment name (e.g., RETAIL, CORPORATE)
 *               prodType:
 *                 type: string
 *                 description: Product type (e.g., MORTGAGE, TERM_LOAN)
 *               prodDesc:
 *                 type: string
 *                 description: Description of the product segment
 *     responses:
 *       201:
 *         description: Product segment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     segment_id:
 *                       type: integer
 *                     v_prod_segment:
 *                       type: string
 *                     v_prod_type:
 *                       type: string
 *                     v_prod_desc:
 *                       type: string
 *                     created_by:
 *                       type: string
 *       400:
 *         description: Invalid input or duplicate entry
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/', authenticate, hasRoles(['ADMIN']), createProductSegment);

/**
 * @swagger
 * /api/product-segments:
 *   get:
 *     summary: Get all product segments
 *     tags: [Product Segments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of product segments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       segment_id:
 *                         type: integer
 *                       v_prod_segment:
 *                         type: string
 *                       v_prod_type:
 *                         type: string
 *                       v_prod_desc:
 *                         type: string
 *                       created_by:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', authenticate, hasRoles(['ADMIN']), getProductSegments);

/**
 * @swagger
 * /api/product-segments/{segmentId}:
 *   get:
 *     summary: Get a specific product segment by ID
 *     tags: [Product Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: segmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product segment to retrieve
 *     responses:
 *       200:
 *         description: Product segment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     segment_id:
 *                       type: integer
 *                     v_prod_segment:
 *                       type: string
 *                     v_prod_type:
 *                       type: string
 *                     v_prod_desc:
 *                       type: string
 *                     created_by:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Product segment not found
 */
router.get('/:segmentId', authenticate, hasRoles(['ADMIN']), getProductSegmentById);

module.exports = router;
