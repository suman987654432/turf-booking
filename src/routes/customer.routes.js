const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRole } = require('../middlewares/role.middleware');

// We can choose to make this require auth or not. For now, we'll keep it public so customers can browse without logging in.
// If you want to force login, add: authenticateUser, authorizeRole(['CUSTOMER'])
router.get('/turfs', customerController.getActiveTurfs);

module.exports = router;
