const express = require('express');
const router = express.Router();
const EclConfigController = require('../controllers/ecl computations/ecl/EclConfiguration');

router.get('/config/columns', EclConfigController.getColumns);
router.post('/config/columns', EclConfigController.setColumns);
router.post('/config/columns/reset', EclConfigController.resetColumns);


module.exports = router;