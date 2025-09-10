const { getConnection } = require('../config/database');
const logger = require('../config/logger');

class AuditLogger {
    static ACTION_TYPES = {
        CREATE: 'CREATE',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE',
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT',
        PASSWORD_CHANGE: 'PASSWORD_CHANGE',
        ROLE_CHANGE: 'ROLE_CHANGE'
    };
    static ENTITY_TYPES = {
        USER: 'USER',
        ROLE: 'ROLE',
        PERMISSION: 'PERMISSION',
        SYSTEM: 'SYSTEM'
    };

    static STATUS = {
        SUCCESS: 'SUCCESS',
        FAILURE: 'FAILURE'
    };

    static async log({
        userId = null,
        actionType,
        actionDescription,
        entityType = null,
        entityId = null,
        oldValues = null,
        newValues = null,
        req = null,
        status = 'SUCCESS',
        errorMessage = null
    }) {
        let connection;
        try {
            connection = await getConnection();

            // Get IP and user agent
            const ipAddress = req ? (
                req.headers['x-forwarded-for'] || 
                req.connection.remoteAddress
            ) : null;
            
            const userAgent = req ? req.headers['user-agent'] : null;

            // Convert objects to JSON strings if they exist
            const oldValuesJson = oldValues ? JSON.stringify(oldValues) : null;
            const newValuesJson = newValues ? JSON.stringify(newValues) : null;

            // Insert audit log
            await connection.execute(
                `INSERT INTO audit_logs (
                    user_id, 
                    action_type, 
                    action_description, 
                    entity_type, 
                    entity_id, 
                    old_values, 
                    new_values, 
                    ip_address, 
                    user_agent,
                    error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    actionType,
                    actionDescription,
                    entityType,
                    entityId,
                    oldValuesJson,
                    newValuesJson,
                    ipAddress,
                    userAgent,
                    errorMessage
                ]
            );

            logger.info('Audit log created:', {
                actionType,
                actionDescription,
                entityType,
                entityId,
                status
            });

        } catch (error) {
            logger.error('Error creating audit log:', error);
            // Don't throw the error - we don't want audit logging to break the main functionality
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    static async getAuditLogs({
        userId = null,
        actionType = null,
        entityType = null,
        entityId = null,
        startDate = null,
        endDate = null,
        page = 1,
        limit = 10
    }) {
        let connection;
        try {
            connection = await getConnection();
            
            // Build WHERE clause
            const conditions = [];
            const params = [];
            
            if (userId) {
                conditions.push('user_id = ?');
                params.push(userId);
            }
            if (actionType) {
                conditions.push('action_type = ?');
                params.push(actionType);
            }
            if (entityType) {
                conditions.push('entity_type = ?');
                params.push(entityType);
            }
            if (entityId) {
                conditions.push('entity_id = ?');
                params.push(entityId);
            }
        
            if (startDate) {
                conditions.push('created_at >= ?');
                params.push(startDate);
            }
            if (endDate) {
                conditions.push('created_at <= ?');
                params.push(endDate);
            }

            const whereClause = conditions.length 
                ? `WHERE ${conditions.join(' AND ')}` 
                : '';

            // Calculate offset
            const offset = (page - 1) * limit;
            
            // Get total count
            const [countResult] = await connection.execute(
                `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
                params
            );
            
            // Get paginated results
            const [logs] = await connection.execute(
                `SELECT * FROM audit_logs ${whereClause} 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            return {
                logs,
                pagination: {
                    total: countResult[0].total,
                    page,
                    limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            };

        } catch (error) {
            logger.error('Error retrieving audit logs:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    static getClientIp(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
            || req.ip 
            || req.connection.remoteAddress 
            || 'unknown';
    }

    static sanitizeJsonValues(values) {
        if (!values) return null;
        
        // Remove sensitive data
        const sanitized = { ...values };
        const sensitiveFields = ['password', 'token', 'secret'];
        
        sensitiveFields.forEach(field => {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return JSON.stringify(sanitized);
    }
}

module.exports = AuditLogger; 