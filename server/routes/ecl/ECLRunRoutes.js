const express = require('express');
const router = express.Router();
const eclRunController = require('../../controllers/ecl/EclRunController');

// GET /api/ecl/runs - Endpoint to get all ECL run history
router.get('/runs', eclRunController.getAllEclRuns);

module.exports = router;
