const express=require('express');
const router=express.Router();

const { getEclFullAnalysis } = require('../../controllers/reports/EclAnalysis');
router.get('/ecl-full-analysis', getEclFullAnalysis);

module.exports=router;