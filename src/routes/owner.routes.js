const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/owner.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRole } = require('../middlewares/role.middleware');
const upload = require('../middlewares/upload.middleware');

// All routes here require authentication and the OWNER role
router.use(authenticateUser);
router.use(authorizeRole(['OWNER', 'ADMIN']));

router.post('/turfs', upload.array('images', 5), ownerController.createTurf);
router.get('/turfs', ownerController.getOwnerTurfs);
router.put('/turfs/:id', upload.array('images', 5), ownerController.updateTurf);
router.delete('/turfs/:id', ownerController.deleteTurf);

module.exports = router;
