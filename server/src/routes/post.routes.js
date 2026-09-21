const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadPostMedia } = require('../middlewares/upload.middleware');

router.use(authenticate);

router.get('/', postController.getFeed);
router.post('/', uploadPostMedia.array('media', 5), postController.createPost);
router.post('/:id/like', postController.toggleLike);
router.post('/:id/comment', postController.addComment);
router.delete('/:id', postController.deletePost);
router.post('/:id/report', postController.reportPost);

module.exports = router;
