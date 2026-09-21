const prisma = require('../config/db');
const ApiResponse = require('../utils/response');

exports.getStats = async (req, res) => {
  try {
    const [
      totalStudents,
      activeStudents,
      suspendedStudents,
      totalPosts,
      totalWhitelisted,
      usedWhitelisted,
      pendingReports
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'student', status: 'active' } }),
      prisma.user.count({ where: { role: 'student', status: 'suspended' } }),
      prisma.post.count({ where: { isDeleted: false } }),
      prisma.allowedRollNumber.count(),
      prisma.allowedRollNumber.count({ where: { isUsed: true } }),
      prisma.report.count({ where: { status: 'pending' } })
    ]);

    return ApiResponse.success(res, 'Admin stats fetched', {
      totalStudents,
      activeStudents,
      suspendedStudents,
      totalPosts,
      totalWhitelisted,
      usedWhitelisted,
      availableWhitelisted: totalWhitelisted - usedWhitelisted,
      pendingReports
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return ApiResponse.error(res, 'Failed to fetch admin stats', 500);
  }
};

exports.getWhitelist = async (req, res) => {
  try {
    const { search, status } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { rollNumber: { contains: search.trim().toUpperCase() } },
        { fullName: { contains: search.trim() } },
        { branch: { contains: search.trim() } }
      ];
    }

    if (status === 'used') {
      where.isUsed = true;
    } else if (status === 'unused') {
      where.isUsed = false;
    }

    const items = await prisma.allowedRollNumber.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, 'Whitelist fetched', items);
  } catch (error) {
    console.error('Get whitelist error:', error);
    return ApiResponse.error(res, 'Failed to fetch whitelist', 500);
  }
};

exports.addRollNumber = async (req, res) => {
  try {
    const { rollNumber, fullName, branch, year } = req.body;

    if (!rollNumber || !rollNumber.trim()) {
      return ApiResponse.error(res, 'Roll number is required', 400);
    }

    const trimmedRoll = rollNumber.trim().toUpperCase();

    const existing = await prisma.allowedRollNumber.findUnique({
      where: { rollNumber: trimmedRoll }
    });

    if (existing) {
      return ApiResponse.error(res, `Roll number ${trimmedRoll} is already whitelisted`, 409);
    }

    const entry = await prisma.allowedRollNumber.create({
      data: {
        rollNumber: trimmedRoll,
        fullName: fullName ? fullName.trim() : null,
        branch: branch ? branch.trim() : null,
        year: year ? year.trim() : null,
        addedBy: req.user.id
      }
    });

    return ApiResponse.success(res, `Roll number ${trimmedRoll} added to whitelist!`, entry, 201);
  } catch (error) {
    console.error('Add roll number error:', error);
    return ApiResponse.error(res, 'Failed to add roll number', 500);
  }
};

exports.bulkAddRollNumbers = async (req, res) => {
  try {
    const { rollNumbersText } = req.body;

    if (!rollNumbersText || !rollNumbersText.trim()) {
      return ApiResponse.error(res, 'Please provide roll numbers to add', 400);
    }

    // Split by comma, newline, or tab
    const tokens = rollNumbersText
      .split(/[\r\n,]+/)
      .map(item => item.trim().toUpperCase())
      .filter(item => item.length > 0);

    const uniqueRolls = Array.from(new Set(tokens));

    if (uniqueRolls.length === 0) {
      return ApiResponse.error(res, 'No valid roll numbers identified', 400);
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const roll of uniqueRolls) {
      try {
        await prisma.allowedRollNumber.create({
          data: {
            rollNumber: roll,
            addedBy: req.user.id
          }
        });
        addedCount++;
      } catch (e) {
        // Skip duplicates
        skippedCount++;
      }
    }

    return ApiResponse.success(
      res,
      `Successfully whitelisted ${addedCount} roll numbers (${skippedCount} already existed).`,
      { addedCount, skippedCount }
    );
  } catch (error) {
    console.error('Bulk whitelist error:', error);
    return ApiResponse.error(res, 'Failed to process bulk roll numbers', 500);
  }
};

exports.removeRollNumber = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.allowedRollNumber.findUnique({
      where: { id }
    });

    if (!entry) {
      return ApiResponse.error(res, 'Roll number entry not found', 404);
    }

    if (entry.isUsed) {
      return ApiResponse.error(
        res,
        'Cannot remove roll number that has already been registered to a student account. Delete the student account first.',
        400
      );
    }

    await prisma.allowedRollNumber.delete({
      where: { id }
    });

    return ApiResponse.success(res, `Roll number ${entry.rollNumber} removed from whitelist`);
  } catch (error) {
    console.error('Remove whitelist error:', error);
    return ApiResponse.error(res, 'Failed to remove roll number', 500);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { search, branch, year, status } = req.query;

    const where = {
      role: 'student'
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search.trim() } },
        { rollNumber: { contains: search.trim().toUpperCase() } },
        { email: { contains: search.trim().toLowerCase() } }
      ];
    }

    if (branch && branch !== 'all') {
      where.branch = branch;
    }

    if (year && year !== 'all') {
      where.year = year;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { posts: true }
        }
      }
    });

    const safeUsers = users.map(u => {
      const { passwordHash: _, ...rest } = u;
      return {
        ...rest,
        postsCount: u._count.posts
      };
    });

    return ApiResponse.success(res, 'Users fetched', safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    return ApiResponse.error(res, 'Failed to fetch users', 500);
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'suspended'

    if (!['active', 'suspended'].includes(status)) {
      return ApiResponse.error(res, 'Invalid status', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status }
    });

    const { passwordHash: _, ...safeUser } = user;
    return ApiResponse.success(
      res,
      `Student account has been ${status === 'active' ? 'reactivated' : 'suspended'}.`,
      safeUser
    );
  } catch (error) {
    console.error('Update status error:', error);
    return ApiResponse.error(res, 'Failed to update user status', 500);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    // Free up the roll number if desired or mark unused
    await prisma.$transaction([
      prisma.allowedRollNumber.updateMany({
        where: { rollNumber: user.rollNumber },
        data: { isUsed: false }
      }),
      prisma.user.delete({
        where: { id }
      })
    ]);

    return ApiResponse.success(res, `Student account (${user.rollNumber}) deleted successfully.`);
  } catch (error) {
    console.error('Delete user error:', error);
    return ApiResponse.error(res, 'Failed to delete user', 500);
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, fullName: true, rollNumber: true, profilePhoto: true }
        },
        post: {
          include: {
            author: {
              select: { id: true, fullName: true, rollNumber: true, profilePhoto: true }
            },
            media: true
          }
        }
      }
    });

    return ApiResponse.success(res, 'Reports fetched', reports);
  } catch (error) {
    console.error('Get reports error:', error);
    return ApiResponse.error(res, 'Failed to fetch reports', 500);
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'dismiss' | 'delete_post'

    const report = await prisma.report.findUnique({
      where: { id },
      include: { post: true }
    });

    if (!report) {
      return ApiResponse.error(res, 'Report not found', 404);
    }

    if (action === 'delete_post' && report.post) {
      // Resolve ALL pending reports for this post first, then soft-delete post
      await prisma.$transaction([
        prisma.report.updateMany({
          where: { postId: report.postId, status: 'pending' },
          data: { status: 'resolved' }
        }),
        prisma.post.update({
          where: { id: report.postId },
          data: { isDeleted: true }
        })
      ]);
      return ApiResponse.success(res, 'Post removed and all related reports marked resolved.');
    } else {
      await prisma.report.update({
        where: { id },
        data: { status: 'dismissed' }
      });
      return ApiResponse.success(res, 'Report dismissed.');
    }
  } catch (error) {
    console.error('Resolve report error:', error);
    return ApiResponse.error(res, 'Failed to resolve report', 500);
  }
};
