const express = require('express');
const router = express.Router();
const { getTermStructureReport } = require('../../controllers/reports/termStructureReport');

router.get('/term-structure', getTermStructureReport);

module.exports = router;
