const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { hasRoles } = require('../middleware/auth');
const { uploadRatingsFile, getAllRatings } = require('../controllers/customer ratin details/CustomerRatings');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', 
    authenticate, 
    hasRoles(['ADMIN']), 
    upload.single('file'), 
    uploadRatingsFile
);

router.get('/', 
    authenticate, 
    hasRoles(['ADMIN', 'USER']), 
    getAllRatings
);

module.exports = router; 