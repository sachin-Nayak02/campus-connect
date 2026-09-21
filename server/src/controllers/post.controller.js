const prisma = require('../config/db');
const ApiResponse = require('../utils/response');

exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      where: { isDeleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            rollNumber: true,
            branch: true,
            year: true,
            profilePhoto: true,
            role: true
          }
        },
        media: true,
        likes: {
          select: {
            userId: true
          }
        },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePhoto: true,
                branch: true
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    profilePhoto: true,
                    branch: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    const enrichedPosts = posts.map(post => {
      const isLiked = post.likes.some(like => like.userId === req.user.id);
      return {
        ...post,
        isLiked,
        likesCount: post._count.likes,
        commentsCount: post._count.comments
      };
    });

    return ApiResponse.success(res, 'Feed fetched successfully', {
      posts: enrichedPosts,
      page,
      hasMore: posts.length === limit
    });
  } catch (error) {
    console.error('Feed error:', error);
    return ApiResponse.error(res, 'Failed to fetch feed', 500);
  }
};

exports.createPost = async (req, res) => {
  try {
    const { content, videoDuration } = req.body;
    const files = req.files || [];

    if (!content && files.length === 0) {
      return ApiResponse.error(res, 'Post must contain either text or media', 400);
    }

    // Check if any video exceeds 30 seconds
    if (videoDuration && parseFloat(videoDuration) > 30.5) {
      return ApiResponse.error(
        res,
        'Video exceeds the 30-second campus limit. Please choose a shorter clip.',
        400
      );
    }

    // Prepare media items
    const mediaItems = [];
    if (files.length > 0) {
      for (const file of files) {
        const isVideo = file.mimetype.startsWith('video');
        const duration = isVideo ? (parseFloat(videoDuration) || null) : null;

        if (isVideo && duration && duration > 30.5) {
          return ApiResponse.error(
            res,
            'Video exceeds the maximum allowed length of 30 seconds.',
            400
          );
        }

        mediaItems.push({
          url: `/uploads/posts/${file.filename}`,
          type: isVideo ? 'video' : 'image',
          durationSeconds: duration ? Math.round(duration) : null
        });
      }
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.user.id,
        content: content ? content.trim() : '',
        media: {
          create: mediaItems
        }
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            rollNumber: true,
            branch: true,
            year: true,
            profilePhoto: true
          }
        },
        media: true,
        likes: true,
        comments: true,
        _count: {
          select: { likes: true, comments: true }
        }
      }
    });

    return ApiResponse.success(res, 'Post published successfully!', {
      ...post,
      isLiked: false,
      likesCount: 0,
      commentsCount: 0
    }, 201);
  } catch (error) {
    console.error('Create post error:', error);
    return ApiResponse.error(res, 'Failed to publish post', 500);
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: { postId, userId }
      }
    });

    let liked = false;

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
      liked = false;
    } else {
      await prisma.like.create({
        data: {
          postId,
          userId
        }
      });
      liked = true;

      // Send in-app notification if actor is not the post author
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true }
      });

      if (post && post.authorId !== userId) {
        const notification = await prisma.notification.create({
          data: {
            userId: post.authorId,
            actorId: userId,
            type: 'post_like',
            entityId: postId
          },
          include: {
            actor: {
              select: { id: true, fullName: true, profilePhoto: true }
            }
          }
        });

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${post.authorId}`).emit('notification_receive', notification);
        }
      }
    }

    const likesCount = await prisma.like.count({ where: { postId } });

    return ApiResponse.success(res, liked ? 'Liked post' : 'Unliked post', {
      liked,
      likesCount
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    return ApiResponse.error(res, 'Failed to like post', 500);
  }
};

exports.addComment = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return ApiResponse.error(res, 'Comment text cannot be empty', 400);
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        parentId: parentId || null,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
            branch: true
          }
        }
      }
    });

    // Notify author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (post && post.authorId !== userId) {
      const notification = await prisma.notification.create({
        data: {
          userId: post.authorId,
          actorId: userId,
          type: 'post_comment',
          entityId: postId
        },
        include: {
          actor: {
            select: { id: true, fullName: true, profilePhoto: true }
          }
        }
      });

      // Emit real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${post.authorId}`).emit('notification_receive', notification);
      }
    }

    return ApiResponse.success(res, 'Comment added successfully', comment, 201);
  } catch (error) {
    console.error('Add comment error:', error);
    return ApiResponse.error(res, 'Failed to add comment', 500);
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return ApiResponse.error(res, 'Post not found', 404);
    }

    // Only author or admin can delete
    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'You are not authorized to delete this post', 403);
    }

    await prisma.post.delete({
      where: { id }
    });

    return ApiResponse.success(res, 'Post deleted successfully');
  } catch (error) {
    console.error('Delete post error:', error);
    return ApiResponse.error(res, 'Failed to delete post', 500);
  }
};

exports.reportPost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return ApiResponse.error(res, 'Please provide a reason for the report', 400);
    }

    const report = await prisma.report.create({
      data: {
        postId,
        reporterId: req.user.id,
        reason: reason.trim(),
        status: 'pending'
      }
    });

    return ApiResponse.success(res, 'Thank you. The post has been flagged for admin review.', report);
  } catch (error) {
    console.error('Report post error:', error);
    return ApiResponse.error(res, 'Failed to report post', 500);
  }
};
