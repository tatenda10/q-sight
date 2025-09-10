require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { getConnection } = require('../config/database'); // Correct import
 
const createSysAdmin = async () => {
    // Use environment variables for credentials
    const adminUsername = process.env.ADMIN_USERNAME || 'sysadmin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

    let connection;
    try {
        // Get connection using the getConnection function
        connection = await getConnection();
        
        // Log database connection parameters (remove in production)
        console.log('Attempting to connect with:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
        });

        await connection.beginTransaction();

        try {
            // Check if admin role exists
            const [adminRole] = await connection.execute(
                'SELECT id FROM roles WHERE role_name = ?',
                ['ADMIN']
            );

            let adminRoleId;

            if (adminRole.length === 0) {
                // Create admin role if it doesn't exist
                const [roleResult] = await connection.execute(
                    'INSERT INTO roles (role_name) VALUES (?)',
                    ['ADMIN']
                );
                adminRoleId = roleResult.insertId;
                console.log('Created ADMIN role');
            } else {
                adminRoleId = adminRole[0].id;
                console.log('ADMIN role already exists');
            }

            // Check if sysadmin user exists
            const [existingAdmin] = await connection.execute(
                'SELECT id FROM users WHERE username = ?',
                [adminUsername]
            );

            if (existingAdmin.length > 0) {
                console.log('System administrator already exists');
                await connection.commit();
                return;
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            // Create sysadmin user
            const [userResult] = await connection.execute(
                'INSERT INTO users (username, password, is_active) VALUES (?, ?, true)',
                [adminUsername, hashedPassword]
            );

            // Assign admin role to sysadmin
            await connection.execute(
                'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
                [userResult.insertId, adminRoleId]
            );

            await connection.commit();
            console.log('System administrator created successfully');
            console.log('Username:', adminUsername);
            console.log('Password:', adminPassword);
            console.log('Please change the password upon first login');

        } catch (error) {
            await connection.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error creating system administrator:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\nDatabase connection failed! Please check:');
            console.error('1. Your MySQL server is running');
            console.error('2. Your database credentials in .env file are correct');
            console.error('3. The user has proper permissions');
            console.error('\nCurrent configuration:');
            console.error('DB_HOST:', process.env.DB_HOST);
            console.error('DB_USER:', process.env.DB_USER);
            console.error('DB_NAME:', process.env.DB_NAME);
        }
        process.exit(1);
    } finally {
        if (connection) {
            connection.release();
        }
    }

    process.exit(0);
};

// Run the script
createSysAdmin(); 