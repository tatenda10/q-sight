const express = require('express');
const router = express.Router();
const { searchAccounts, reassignStage, getStageOverrides } = require('../controllers/staging/StageReassignment');

// Protected routes - require authentication and admin role

// GET / - Search for accounts
router.get('/',  searchAccounts);

// POST /reassign - Reassign stages for accounts
router.post('/reassign', reassignStage);

// GET /api/staging/overrides - Get all stage overrides history
router.get('/overrides',  getStageOverrides);

module.exports = router;
