const express = require('express');
const { getEclData } = require('../controllers/ecl computations/ecl/GetEcl');
const router = express.Router();

router.get('/get-ecl', getEclData);

module.exports=router