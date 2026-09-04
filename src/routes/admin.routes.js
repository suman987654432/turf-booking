const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRole } = require('../middlewares/role.middleware');

// Protect all admin routes
router.use(authenticateUser);
router.use(authorizeRole(['ADMIN']));

router.get('/turfs', adminController.getAllTurfs);
router.patch('/turfs/:id/approve', adminController.approveTurf);
router.patch('/turfs/:id/reject', adminController.rejectTurf);
router.delete('/turfs/:id', adminController.deleteTurf);

router.get('/owners', adminController.getAllOwners);
router.delete('/owners/:id', adminController.deleteOwner);

router.get('/sports-stats', adminController.getSportsStats);

router.get('/customers', adminController.getAllCustomers);

module.exports = router;
