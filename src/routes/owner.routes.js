const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/owner.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRole } = require('../middlewares/role.middleware');

// All routes here require authentication and the OWNER role
router.use(authenticateUser);
router.use(authorizeRole(['OWNER', 'ADMIN']));

router.post('/turfs', ownerController.createTurf);
router.get('/turfs', ownerController.getOwnerTurfs);

module.exports = router;
