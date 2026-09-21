const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const onlineUsers = new Map(); // userId -> Set of socketIds

function setupSocketIO(io) {
  // Socket JWT authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'campusconnect_super_secret_jwt_key_2026_x89f2'
      );

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, fullName: true, rollNumber: true, role: true, status: true }
      });

      if (!user || user.status !== 'active') {
        return next(new Error('User unauthorized'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication failed: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`[Socket] User connected: ${socket.user.fullName} (${userId})`);

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast user online to everyone
    io.emit('presence_update', {
      userId,
      status: 'online',
      onlineUserIds: Array.from(onlineUsers.keys())
    });

    // Join personal user room for targeted notifications
    socket.join(`user:${userId}`);

    // Join chat room (with membership verification)
    socket.on('join_chat', async (chatId) => {
      try {
        const membership = await prisma.groupMember.findUnique({
          where: { chatId_userId: { chatId, userId } }
        });
        if (membership) {
          socket.join(`chat:${chatId}`);
        } else {
          socket.emit('error', { message: 'Not a member of this chat' });
        }
      } catch (err) {
        console.error('[Socket] join_chat error:', err.message);
      }
    });

    // Leave chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    // Typing indicators
    socket.on('typing_start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user_typing', {
        chatId,
        userId,
        fullName: socket.user.fullName
      });
    });

    socket.on('typing_stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user_stopped_typing', {
        chatId,
        userId
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.fullName}`);
      if (onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('presence_update', {
            userId,
            status: 'offline',
            onlineUserIds: Array.from(onlineUsers.keys())
          });
        }
      }
    });
  });
}

module.exports = { setupSocketIO };
