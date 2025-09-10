const express = require('express');
const router = express.Router();
const getRoles = require('../controllers/roles/GetRoles');
const { authenticate, hasRoles } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       required:
 *         - id
 *         - role_name
 *       properties:
 *         id:
 *           type: integer
 *           description: The role ID
 *         role_name:
 *           type: string
 *           description: The name of the role
 *       example:
 *         id: 1
 *         role_name: ADMIN
 *   responses:
 *     RolesResponse:
 *       type: object
 *       properties:
 *         roles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Role'
 * 
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all roles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/RolesResponse'
 *             example:
 *               roles:
 *                 - id: 1
 *                   role_name: ADMIN
 *                 - id: 2
 *                   role_name: USER
 *                 - id: 3
 *                   role_name: RUN BATCH
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - Requires ADMIN role
 *       500:
 *         description: Server error
 */

// Get all roles
router.get('/', authenticate, hasRoles(['ADMIN']), getRoles);

module.exports = router; 