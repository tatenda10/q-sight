const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, hasRoles } = require('../middleware/auth');
const { uploadCustomerFile, getAllCustomers } = require('../controllers/Customer Info/CustomerInfo');

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/customer-info:
 *   post:
 *     summary: Upload customer information file (CSV or Excel)
 *     tags: [Customer Info]
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
 *                 description: CSV or Excel file containing customer data
 *     responses:
 *       200:
 *         description: File uploaded and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Customers uploaded successfully
 *                 count:
 *                   type: integer
 *                   example: 100
 *       400:
 *         description: Invalid file format or validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Validation failed
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/', 
    authenticate, 
    hasRoles(['ADMIN']), 
    upload.single('file'), 
    uploadCustomerFile
);

/**
 * @swagger
 * /api/customer-info:
 *   get:
 *     summary: Get all customer information with pagination
 *     tags: [Customer Info]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Successfully retrieved customer information
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
 *                       fic_mis_date:
 *                         type: string
 *                         format: date
 *                       v_party_id:
 *                         type: string
 *                       v_partner_name:
 *                         type: string
 *                       v_party_type:
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
 *         description: Server error
 */
router.get('/', 
    authenticate, 
    hasRoles(['ADMIN', 'USER']), 
    getAllCustomers
);

module.exports = router;
