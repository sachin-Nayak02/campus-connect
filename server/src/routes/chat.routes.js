const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadChatMedia } = require('../middlewares/upload.middleware');

router.use(authenticate);

router.get('/', chatController.getChats);
router.post('/direct', chatController.createOrGetDirectChat);
router.post('/group', chatController.createGroupChat);
router.get('/:id/messages', chatController.getMessages);
router.post('/:id/messages', uploadChatMedia.single('media'), chatController.sendMessage);

module.exports = router;
