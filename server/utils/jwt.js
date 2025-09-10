const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const generateToken = (userId, username, roles) => {
    try {
        return jwt.sign(
            { userId, username, roles },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
    } catch (error) {
        logger.error('Error generating token:', { error, userId });
        throw error;
    }
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        logger.error('Error verifying token:', { error, token: token.substring(0, 10) });
        throw error;
    }
};

module.exports = {
    generateToken,
    verifyToken
}; 