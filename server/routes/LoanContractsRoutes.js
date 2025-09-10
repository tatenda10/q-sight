const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { hasRoles } = require('../middleware/auth');
const { uploadLoansFile, getAllLoans, getDistinctDates } = require('../controllers/financial element/LoanContracts');

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/loan-contracts:
 *   post:
 *     summary: Upload loan contracts file (CSV or Excel)
 *     tags: [Loan Contracts]
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
 *                 description: CSV or Excel file containing loan contract data
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
 *                   example: Loans uploaded successfully
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
    uploadLoansFile
);

/**
 * @swagger
 * /api/loan-contracts:
 *   get:
 *     summary: Get all loan contracts with pagination
 *     tags: [Loan Contracts]
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
 *         description: Successfully retrieved loan contracts
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
 *                       v_account_number:
 *                         type: string
 *                       v_cust_ref_code:
 *                         type: string
 *                       v_prod_code:
 *                         type: string
 *                       n_curr_interest_rate:
 *                         type: number
 *                         format: decimal
 *                       # ... other fields ...
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
    getAllLoans
);

/**
 * @swagger
 * /api/loan-contracts/dates:
 *   get:
 *     summary: Get all distinct MIS dates
 *     tags: [Loan Contracts]
 *     responses:
 *       200:
 *         description: List of distinct dates
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
 *                     type: string
 *                     format: date
 *                     example: "2024-03-20"
 *       500:
 *         description: Server error
 */
router.get('/loan-contracts/dates', getDistinctDates);

/**
 * @swagger
 * /api/loan-contracts:
 *   get:
 *     summary: Get loan contracts by date and optional account number
 *     tags: [Loan Contracts]
 *     parameters:
 *       - in: query
 *         name: fic_mis_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: MIS date in YYYY-MM-DD format
 *         example: "2024-03-20"
 *       - in: query
 *         name: v_account_number
 *         schema:
 *           type: string
 *         description: Account number (optional)
 *         example: "ACC123"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Records per page
 *     responses:
 *       200:
 *         description: Successfully retrieved loan contracts
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
 *                       fic_mis_date:
 *                         type: string
 *                         format: date
 *                       v_account_number:
 *                         type: string
 *                       # ... other loan contract fields
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
 *                 filters:
 *                   type: object
 *                   properties:
 *                     fic_mis_date:
 *                       type: string
 *                       format: date
 *                     v_account_number:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Bad request - Missing or invalid fic_mis_date
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
 *                   example: fic_mis_date is required
 *       500:
 *         description: Server error
 */
router.get('/loan-contracts', getAllLoans);

module.exports = router;
