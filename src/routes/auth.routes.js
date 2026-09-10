const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/owner/signup', authController.registerOwner);
router.post('/owner/login', authController.loginOwner);
router.post('/admin/login', authController.loginAdmin);
router.post('/customer/signup', authController.registerCustomer);
router.post('/customer/login', authController.loginCustomer);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationCode);

module.exports = router;
