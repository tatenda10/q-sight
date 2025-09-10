const logger = require('../config/logger');

// Store rate limit data in memory
const rateLimit = new Map();

/**
 * Create rate limiter middleware
 * @param {Object} options
 * @param {number} options.maxRequests - Maximum requests allowed
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {string} options.message - Error message when limit is exceeded
 */
const createRateLimiter = ({ maxRequests = 30, windowMs = 60000, message = 'Too many requests' } = {}) => {
    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        
        // Clean up old entries
        if (rateLimit.has(ip)) {
            const { requests, windowStart } = rateLimit.get(ip);
            if (now - windowStart > windowMs) {
                rateLimit.delete(ip);
            }
        }

        // Get or create rate limit entry
        const entry = rateLimit.get(ip) || {
            requests: 0,
            windowStart: now
        };

        // Check if limit is exceeded
        if (entry.requests >= maxRequests) {
            logger.warn('Rate limit exceeded:', {
                ip, 
                requests: entry.requests,
                windowMs 
            });

            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('Retry-After', Math.ceil((entry.windowStart + windowMs - now) / 1000));

            return res.status(429).json({
                message,
                retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000)
            });
        }

        // Increment request count
        entry.requests++;
        rateLimit.set(ip, entry);

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - entry.requests);

        next();
    };
};

// Create specific limiters
const loginLimiter = createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again later.'
});

const defaultLimiter = createRateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please try again later.'
});

module.exports = {
    createRateLimiter,
    loginLimiter,
    defaultLimiter
}; 