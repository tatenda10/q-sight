const express = require('express');
const router = express.Router();
const login = require('../controllers/Auth/LoginController');
const { validateRequest } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const Joi = require('joi');

// Validation schemas
const loginSchema = Joi.object({
    username: Joi.string().required().min(3).max(50),
    password: Joi.string().required().min(6)
});

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to the application
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
 *                 minimum: 3
 *                 maximum: 50
 *               password:
 *                 type: string
 *                 minimum: 6
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many requests
 *         headers:
 *           Retry-After:
 *             schema:
 *               type: integer
 *             description: Time in seconds to wait before making another request
 *           X-RateLimit-Limit:
 *             schema:
 *               type: integer
 *             description: The maximum number of requests allowed
 *           X-RateLimit-Remaining:
 *             schema:
 *               type: integer
 *             description: The number of remaining requests
 *           X-RateLimit-Reset:
 *             schema:
 *               type: string
 *             description: The time when the rate limit will reset
 *       500:
 *         description: Server error
 */
router.post('/login', validateRequest(loginSchema), login);

module.exports = router; 