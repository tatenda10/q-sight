const { getConnection } = require('../../config/database');

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of all roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       role_name:
 *                         type: string
 *       500:
 *         description: Server error
 */
const getRoles = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [roles] = await connection.query(`
            SELECT id, role_name
            FROM roles
            ORDER BY id
        `);

        res.json({
            roles: roles.map(role => ({
                id: role.id,
                role_name: role.role_name
            }))
        });

    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ 
            message: 'Error fetching roles',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = getRoles;
