const prisma = require('../config/db');
const ApiResponse = require('../utils/response');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
            rollNumber: true
          }
        }
      }
    });

    return ApiResponse.success(res, 'Notifications fetched', notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    return ApiResponse.error(res, 'Failed to fetch notifications', 500);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId: req.user.id, read: false },
        data: { read: true }
      });
      return ApiResponse.success(res, 'All notifications marked as read');
    }

    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { read: true }
    });

    if (result.count === 0) {
      return ApiResponse.error(res, 'Notification not found', 404);
    }

    return ApiResponse.success(res, 'Notification marked as read');
  } catch (error) {
    console.error('Mark read error:', error);
    return ApiResponse.error(res, 'Failed to mark notification', 500);
  }
};
