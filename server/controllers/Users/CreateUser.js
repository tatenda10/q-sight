const bcrypt = require('bcryptjs');
const db = require('../../config/database');

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: number
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
const createUser = async (req, res) => {
    try {
        const { username, password, roles } = req.body;

        // Input validation
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Create user
            const [result] = await connection.execute(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword]
            );

            const userId = result.insertId;

            // Assign roles if provided
            if (roles && Array.isArray(roles) && roles.length > 0) {
                const roleValues = roles.map(roleId => [userId, roleId]);
                await connection.query(
                    'INSERT INTO user_roles (user_id, role_id) VALUES ?',
                    [roleValues]
                );
            }

            await connection.commit();
            connection.release();

            res.status(201).json({
                message: 'User created successfully',
                userId
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

module.exports = createUser;
