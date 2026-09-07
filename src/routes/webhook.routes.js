const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// This route is NOT authenticated by JWT, it's public for Razorpay to hit
router.post('/razorpay', webhookController.razorpayWebhook);

module.exports = router;
