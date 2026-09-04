const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');

router.use(authenticateUser);

router.post('/presigned-url', uploadController.generatePresignedUrl);

module.exports = router;
