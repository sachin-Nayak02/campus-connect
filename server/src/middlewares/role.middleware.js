const ApiResponse = require('../utils/response');

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Access denied. Administrator privileges required.', 403);
  }
  next();
};

module.exports = { requireAdmin };
