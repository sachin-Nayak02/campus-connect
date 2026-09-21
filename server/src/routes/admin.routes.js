const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');

router.use(authenticate, requireAdmin);

router.get('/stats', adminController.getStats);

// Whitelist management
router.get('/whitelist', adminController.getWhitelist);
router.post('/whitelist', adminController.addRollNumber);
router.post('/whitelist/bulk', adminController.bulkAddRollNumbers);
router.delete('/whitelist/:id', adminController.removeRollNumber);

// User management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Moderation
router.get('/reports', adminController.getReports);
router.patch('/reports/:id', adminController.resolveReport);

module.exports = router;
