const express = require('express');
const router = express.Router();
const {uploadProductFile , getAllProducts} = require('../controllers/product config/ProductController');
const multer = require('multer');
const { authenticate, hasRoles } = require('../middleware/auth');

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - fic_mis_date
 *         - v_prod_code
 *       properties:
 *         fic_mis_date:
 *           type: string
 *           format: date
 *           description: The date of the product record
 *         v_prod_code:
 *           type: string
 *           description: The product code
 *         v_prod_name:
 *           type: string
 *           description: The name of the product
 *         v_prod_type:
 *           type: string
 *           description: The type of product
 *         v_prod_group:
 *           type: string
 *           description: The product group
 *       example:
 *         fic_mis_date: "2024-01-01"
 *         v_prod_code: "PROD001"
 *         v_prod_name: "Term Loan"
 *         v_prod_type: "Loan"
 *         v_prod_group: "Retail"
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, hasRoles(['ADMIN']), getAllProducts);

/**
 * @swagger
 * /api/products/upload:
 *   post:
 *     summary: Upload product data file
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV or Excel file containing product data
 *     responses:
 *       200:
 *         description: Products uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Products uploaded successfully
 *       400:
 *         description: Validation errors or no file uploaded
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/upload', authenticate, hasRoles(['ADMIN']), upload.single('file'), uploadProductFile);

module.exports = router;
