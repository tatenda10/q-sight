const { verifyToken } = require('../utils/jwt');
const logger = require('../config/logger');
const { getConnection } = require('../config/database');
const AuditLogger = require('../services/auditLogger');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            logger.warn('No token provided');
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            const decoded = verifyToken(token);
            req.user = decoded;

            // Log successful authentication
            await AuditLogger.log({
                userId: decoded.userId,
                actionType: 'AUTHENTICATION',
                actionDescription: 'User authenticated successfully',
                entityType: 'USER',
                entityId: decoded.userId,
                req,
                status: 'SUCCESS'
            });

            next();
        } catch (error) {
            logger.warn('Invalid token:', { error: error.message });
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        logger.error('Authentication error:', { error: error.message });
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const authorize = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const { userId, roles } = req.user;

            if (!roles || !roles.some(role => allowedRoles.includes(role))) {
                // Log unauthorized access attempt
                await AuditLogger.log({
                    userId,
                    actionType: 'AUTHORIZATION',
                    actionDescription: 'Unauthorized access attempt',
                    entityType: 'USER',
                    entityId: userId,
                    req,
                    status: 'FAILURE',
                    errorMessage: `Required roles: ${allowedRoles.join(', ')}`
                });

                return res.status(403).json({ 
                    message: 'You do not have permission to perform this action' 
                });
            }

            next();
        } catch (error) {
            logger.error('Authorization error:', { error: error.message });
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};

const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const { error } = schema.validate(req.body);
            if (error) {
                logger.warn('Request validation failed:', { 
                    error: error.details[0].message,
                    body: req.body 
                });
                return res.status(400).json({ 
                    message: error.details[0].message 
                });
            }
            next();
        } catch (error) {
            logger.error('Validation error:', { error: error.message });
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};

/**
 * Middleware to check if user has required roles
 * @param {string[]} requiredRoles - Array of role names required for access
 */
const hasRoles = (requiredRoles) => {
    return (req, res, next) => {
        try {
            // Check if user exists and has roles
            if (!req.user || !req.user.roles) {
                logger.warn('Role check failed: No user or roles found');
                return res.status(403).json({ message: 'Access denied' });
            }

            // Check if user has any of the required roles
            const hasRequiredRole = req.user.roles.some(role => 
                requiredRoles.includes(role)
            );

            if (!hasRequiredRole) {
                logger.warn('Role check failed:', {
                    userId: req.user.id,
                    userRoles: req.user.roles,
                    requiredRoles
                });

                return res.status(403).json({ 
                    message: 'You do not have the required role to perform this action' 
                });
            }

            next();
        } catch (error) {
            logger.error('Role check error:', { error: error.message });
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};

module.exports = {
    authenticate,
    authorize,
    validateRequest,
    hasRoles
}; 