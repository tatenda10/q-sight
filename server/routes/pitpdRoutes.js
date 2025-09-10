const express = require('express');
const router = express.Router();
const PitPdController = require('../controllers/pitpd/PitPdController');

router.get('/pit-pd-matrix', PitPdController.getPitPdMatrix);

router.post('/ttc-pds', PitPdController.addTtcPds);
router.get('/ttc-pds', PitPdController.getTtcPds);

router.post('/mev-variables', PitPdController.addMevVariables);
router.get('/mev-variables', PitPdController.getMevVariables);

module.exports = router; 