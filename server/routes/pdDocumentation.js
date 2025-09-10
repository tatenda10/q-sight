const express = require('express');
const router = express.Router();
const pdDocumentationController = require('../controllers/pd config/PdDocumentation');

// Save new documentation
router.post('/save', pdDocumentationController.savePdDocumentation);

// Get latest documentation
router.get('/latest', pdDocumentationController.getLatestPdDocumentation);

// Get all documentation versions
router.get('/versions/all', pdDocumentationController.getAllPdDocumentationVersions);

// Get documentation by ID
router.get('/:id', pdDocumentationController.getPdDocumentationById);

// Update documentation status and approvers
router.put('/:id/status', pdDocumentationController.updatePdDocumentationStatus);

module.exports = router; 