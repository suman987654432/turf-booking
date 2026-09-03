const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Public routes do not require authentication
router.get('/turfs', publicController.getActiveTurfs);

module.exports = router;
