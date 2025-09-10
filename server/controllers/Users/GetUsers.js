const { getConnection } = require('../../config/database');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of users
 *       500:
 *         description: Server error
 */
const getUsers = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // First get total count
        const [totalResult] = await connection.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = totalResult[0].count;

        // Then get paginated users with roles
        const [users] = await connection.query(`
            SELECT 
                u.id, 
                u.username, 
                u.created_at, 
                u.is_active,
                u.last_login,
                GROUP_CONCAT(DISTINCT r.role_name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.id, u.username, u.created_at, u.is_active, u.last_login
            ORDER BY u.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `);

        // Transform the data
        const transformedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            created_at: user.created_at,
            last_login: user.last_login,
            is_active: Boolean(user.is_active),
            roles: user.roles ? user.roles.split(',') : []
        }));

        res.json({
            users: transformedUsers,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                totalItems: totalUsers,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            message: 'Error fetching users',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = getUsers; 