const bcrypt = require('bcryptjs');
const { generateToken } = require('../../utils/jwt');
const { getConnection } = require('../../config/database');
const logger = require('../../config/logger');
const AuditLogger = require('../../services/auditLogger');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get token
 *     tags: [Authentication]
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
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
const login = async (req, res) => {
    const { username, password } = req.body;
    let connection;

    console.log('Login attempt:', { username }); // Log login attempt

    try {
        console.log('Getting database connection...');
        connection = await getConnection();
        console.log('Database connection established');

        // Get user with roles
        console.log('Executing user query...');
        const [users] = await connection.execute(`
            SELECT u.*, GROUP_CONCAT(r.role_name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.username = ?
            GROUP BY u.id
        `, [username]);
        console.log('User query result:', { userFound: users.length > 0 });

        if (users.length === 0) {
            console.log('User not found:', { username });
            logger.warn('Login attempt with non-existent username:', { username });
            
            // Log failed attempt
            try {
                await AuditLogger.log({
                    actionType: 'LOGIN',
                    actionDescription: 'Failed login attempt - user not found',
                    entityType: 'USER',
                    req,
                    status: 'FAILURE',
                    errorMessage: 'User not found'
                });
            } catch (auditError) {
                console.error('Error logging failed login attempt:', auditError);
            }

            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        console.log('User found:', { userId: user.id, isActive: user.is_active });

        // Check if user is active
        if (!user.is_active) {
            console.log('Inactive account login attempt:', { username });
            logger.warn('Login attempt on inactive account:', { username });
            
            try {
                await AuditLogger.log({
                    userId: user.id,
                    actionType: 'LOGIN',
                    actionDescription: 'Failed login attempt - account inactive',
                    entityType: 'USER',
                    entityId: user.id,
                    req,
                    status: 'FAILURE',
                    errorMessage: 'Account inactive'
                });
            } catch (auditError) {
                console.error('Error logging inactive account attempt:', auditError);
            }

            return res.status(401).json({ message: 'Account is inactive' });
        }

        // Verify password
        console.log('Verifying password...');
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Password verification result:', { isValid: isValidPassword });

        if (!isValidPassword) {
            console.log('Invalid password attempt:', { username });
            logger.warn('Failed login attempt - invalid password:', { username });
            
            try {
                await AuditLogger.log({
                    userId: user.id,
                    actionType: 'LOGIN',
                    actionDescription: 'Failed login attempt - invalid password',
                    entityType: 'USER',
                    entityId: user.id,
                    req,
                    status: 'FAILURE',
                    errorMessage: 'Invalid password'
                });
            } catch (auditError) {
                console.error('Error logging invalid password attempt:', auditError);
            }

            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        console.log('Generating token...');
        const roles = user.roles ? user.roles.split(',') : [];
        const token = generateToken(user.id, user.username, roles);
        console.log('Token generated successfully');

        // Log successful login
        try {
            console.log('Logging successful login...');
            await AuditLogger.log({
                userId: user.id,
                actionType: 'LOGIN',
                actionDescription: 'User logged in successfully',
                entityType: 'USER',
                entityId: user.id,
                req,
                status: 'SUCCESS'
            });
            console.log('Login logged successfully');
        } catch (auditError) {
            console.error('Error logging successful login:', auditError);
            // Continue despite logging error
        }

        // Update last login timestamp
        try {
            console.log('Updating last login timestamp...');
            await connection.execute(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );
            console.log('Last login timestamp updated');
        } catch (updateError) {
            console.error('Error updating last login timestamp:', updateError);
            // Continue despite update error
        }

        console.log('Login successful:', { userId: user.id, username: user.username });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                roles,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error('Login error details:', {
            error: error.message,
            stack: error.stack,
            username
        });
        logger.error('Login error:', { error: error.message, username });
        res.status(500).json({ message: 'Error during login' });
    } finally {
        if (connection) {
            console.log('Releasing database connection...');
            connection.release();
            console.log('Database connection released');
        }
    }
};

module.exports = login; 