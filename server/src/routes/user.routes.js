const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadAvatar } = require('../middlewares/upload.middleware');

router.use(authenticate);

router.get('/search', userController.searchUsers);
router.get('/friends', userController.getFriends);
router.get('/friend-requests', userController.getPendingRequests);
router.post('/friend-request', userController.sendFriendRequest);
router.patch('/friend-requests/:id', userController.handleFriendRequest);
router.delete('/friends/:id', userController.unfriend);

router.get('/:id', userController.getUserProfile);
router.patch(
  '/profile',
  uploadAvatar.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'coverPhoto', maxCount: 1 }
  ]),
  userController.updateProfile
);

module.exports = router;
