const { getConnection } = require('../../config/database');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update an existing user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: integer
 *             required:
 *               - username
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
const editUser = async (req, res) => {
    const { id } = req.params;
    const { username, password, roles } = req.body;
    let connection;

    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (existingUser.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if username is taken by another user
        const [userWithUsername] = await connection.execute(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [username, id]
        );

        if (userWithUsername.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Update user details
        let updateQuery = 'UPDATE users SET username = ?';
        let updateParams = [username];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            updateParams.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(id);

        await connection.execute(updateQuery, updateParams);

        // Update roles if provided
        if (roles && Array.isArray(roles)) {
            await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);

            if (roles.length > 0) {
                const roleValues = roles.map(roleId => [id, roleId]);
                const placeholders = roleValues.map(() => '(?, ?)').join(', ');

                const roleInsertQuery = `INSERT INTO user_roles (user_id, role_id) VALUES ${placeholders}`;

                // Flatten the roleValues array for the query
                const flatRoleValues = roleValues.flat();

                await connection.execute(roleInsertQuery, flatRoleValues);
            }
        }

        await connection.commit();

        // Fetch updated user data
        const [updatedUser] = await connection.execute(
            `SELECT u.id, u.username, GROUP_CONCAT(ur.role_id) as roles 
            FROM users u 
            LEFT JOIN user_roles ur ON u.id = ur.user_id 
            WHERE u.id = ? 
            GROUP BY u.id`,
            [id]
        );

        const userData = updatedUser[0];
        userData.roles = userData.roles ? userData.roles.split(',').map(Number) : [];

        res.json({
            message: 'User updated successfully',
            user: userData
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    editUser
};
