const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const ApiResponse = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Authorization token missing or invalid', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusconnect_super_secret_jwt_key_2026_x89f2');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return ApiResponse.error(res, 'User no longer exists', 401);
    }

    if (user.status === 'suspended') {
      return ApiResponse.error(res, 'Your account has been suspended by campus administration', 403);
    }

    if (user.status === 'deleted') {
      return ApiResponse.error(res, 'Account has been deleted', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token expired. Please log in again.', 401);
    }
    return ApiResponse.error(res, 'Invalid authentication token', 401);
  }
};

module.exports = { authenticate };
