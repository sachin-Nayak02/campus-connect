const prisma = require('../config/db');
const ApiResponse = require('../utils/response');

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;

    if (!query) {
      // Allow empty query - will return all active students
    }

    const cleanQuery = (query || '').trim();

    const searchFilter = cleanQuery.length > 0
      ? {
          OR: [
            { fullName: { contains: cleanQuery, mode: 'insensitive' } },
            { rollNumber: { contains: cleanQuery, mode: 'insensitive' } },
            { branch: { contains: cleanQuery, mode: 'insensitive' } }
          ]
        }
      : {};

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { role: 'student' },
          { status: 'active' },
          searchFilter
        ]
      },
      select: {
        id: true,
        fullName: true,
        rollNumber: true,
        branch: true,
        year: true,
        profilePhoto: true,
        bio: true
      },
      take: 20
    });

    // Check friendship status for each user
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUserId, receiverId: { in: users.map(u => u.id) } },
          { receiverId: currentUserId, requesterId: { in: users.map(u => u.id) } }
        ]
      }
    });

    const userCards = users.map(user => {
      const rel = friendships.find(
        f => (f.requesterId === user.id && f.receiverId === currentUserId) ||
             (f.receiverId === user.id && f.requesterId === currentUserId)
      );

      let friendshipStatus = 'none';
      let friendshipId = null;

      if (rel) {
        friendshipId = rel.id;
        if (rel.status === 'accepted') {
          friendshipStatus = 'friends';
        } else if (rel.status === 'pending') {
          friendshipStatus = rel.requesterId === currentUserId ? 'pending_sent' : 'pending_received';
        }
      }

      return {
        ...user,
        friendshipStatus,
        friendshipId
      };
    });

    return ApiResponse.success(res, 'Users found', userCards);
  } catch (error) {
    console.error('Search users error:', error);
    return ApiResponse.error(res, 'Failed to search users', 500);
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
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
            comments: {
              include: {
                user: {
                  select: { id: true, fullName: true, profilePhoto: true }
                }
              }
            },
            _count: {
              select: { likes: true, comments: true }
            }
          }
        }
      }
    });

    if (!user) {
      return ApiResponse.error(res, 'Student profile not found', 404);
    }

    // Determine friendship relationship
    let friendshipStatus = 'none';
    let friendshipId = null;

    if (id !== currentUserId) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: currentUserId, receiverId: id },
            { requesterId: id, receiverId: currentUserId }
          ]
        }
      });

      if (friendship) {
        friendshipId = friendship.id;
        if (friendship.status === 'accepted') {
          friendshipStatus = 'friends';
        } else if (friendship.status === 'pending') {
          friendshipStatus = friendship.requesterId === currentUserId ? 'pending_sent' : 'pending_received';
        }
      }
    } else {
      friendshipStatus = 'self';
    }

    // Calculate total friends
    const friendsCount = await prisma.friendship.count({
      where: {
        status: 'accepted',
        OR: [{ requesterId: id }, { receiverId: id }]
      }
    });

    // Enrich user posts with isLiked, likesCount, commentsCount
    const enrichedPosts = (user.posts || []).map(post => {
      const isLiked = post.likes.some(like => like.userId === currentUserId);
      return {
        ...post,
        isLiked,
        likesCount: post._count?.likes ?? post.likes.length,
        commentsCount: post._count?.comments ?? post.comments.length
      };
    });

    const { passwordHash: _, ...safeUser } = user;

    return ApiResponse.success(res, 'Profile retrieved', {
      ...safeUser,
      posts: enrichedPosts,
      friendsCount,
      friendshipStatus,
      friendshipId
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return ApiResponse.error(res, 'Failed to fetch user profile', 500);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, bio, phone, branch, year } = req.body;
    const userId = req.user.id;

    const dataToUpdate = {};
    if (fullName) dataToUpdate.fullName = fullName.trim();
    if (bio !== undefined) dataToUpdate.bio = bio.trim();
    if (phone !== undefined) dataToUpdate.phone = phone.trim();
    if (branch) dataToUpdate.branch = branch.trim();
    if (year) dataToUpdate.year = year.trim();

    if (req.files) {
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        dataToUpdate.profilePhoto = `/uploads/avatars/${req.files.profilePhoto[0].filename}`;
      }
      if (req.files.coverPhoto && req.files.coverPhoto[0]) {
        dataToUpdate.coverPhoto = `/uploads/avatars/${req.files.coverPhoto[0].filename}`;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return ApiResponse.success(res, 'Profile updated successfully', safeUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return ApiResponse.error(res, 'Failed to update profile', 500);
  }
};

exports.sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const requesterId = req.user.id;

    if (requesterId === receiverId) {
      return ApiResponse.error(res, 'You cannot send a friend request to yourself', 400);
    }

    // Check existing
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return ApiResponse.error(res, 'You are already friends', 400);
      }
      if (existing.status === 'pending') {
        return ApiResponse.error(res, 'A friend request is already pending', 400);
      }
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        receiverId,
        status: 'pending'
      }
    });

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: receiverId,
        actorId: requesterId,
        type: 'friend_request',
        entityId: friendship.id
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
      io.to(`user:${receiverId}`).emit('notification_receive', notification);
    }

    return ApiResponse.success(res, 'Friend request sent successfully', friendship, 201);
  } catch (error) {
    console.error('Send friend request error:', error);
    return ApiResponse.error(res, 'Failed to send friend request', 500);
  }
};

exports.handleFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' | 'reject'
    const userId = req.user.id;

    const friendship = await prisma.friendship.findUnique({
      where: { id }
    });

    if (!friendship || friendship.receiverId !== userId) {
      return ApiResponse.error(res, 'Friend request not found or not addressed to you', 404);
    }

    if (action === 'accept') {
      const updated = await prisma.friendship.update({
        where: { id },
        data: { status: 'accepted' }
      });

      // Notify requester
      const notification = await prisma.notification.create({
        data: {
          userId: friendship.requesterId,
          actorId: userId,
          type: 'request_accepted',
          entityId: friendship.id
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
        io.to(`user:${friendship.requesterId}`).emit('notification_receive', notification);
      }

      return ApiResponse.success(res, 'Friend request accepted!', updated);
    } else {
      await prisma.friendship.delete({
        where: { id }
      });
      return ApiResponse.success(res, 'Friend request declined');
    }
  } catch (error) {
    console.error('Handle friend request error:', error);
    return ApiResponse.error(res, 'Failed to update friend request', 500);
  }
};

exports.unfriend = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        OR: [{ requesterId: userId }, { receiverId: userId }]
      }
    });

    if (!friendship) {
      return ApiResponse.error(res, 'Friendship not found', 404);
    }

    await prisma.friendship.delete({
      where: { id }
    });

    return ApiResponse.success(res, 'Friend removed');
  } catch (error) {
    console.error('Unfriend error:', error);
    return ApiResponse.error(res, 'Failed to remove friend', 500);
  }
};

exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { receiverId: userId }]
      },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            rollNumber: true,
            branch: true,
            year: true,
            profilePhoto: true
          }
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            rollNumber: true,
            branch: true,
            year: true,
            profilePhoto: true
          }
        }
      }
    });

    const friends = friendships.map(f => {
      const friend = f.requesterId === userId ? f.receiver : f.requester;
      return {
        friendshipId: f.id,
        ...friend
      };
    });

    return ApiResponse.success(res, 'Friends list fetched', friends);
  } catch (error) {
    console.error('Get friends error:', error);
    return ApiResponse.error(res, 'Failed to fetch friends', 500);
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingRequests = await prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: 'pending'
      },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            rollNumber: true,
            branch: true,
            year: true,
            profilePhoto: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, 'Pending requests fetched', pendingRequests);
  } catch (error) {
    console.error('Get pending requests error:', error);
    return ApiResponse.error(res, 'Failed to fetch pending requests', 500);
  }
};
