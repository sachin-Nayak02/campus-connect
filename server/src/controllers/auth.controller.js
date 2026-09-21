const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const ApiResponse = require('../utils/response');
const { generateOtp, getOtpExpiry, sendOtpEmail } = require('../utils/otp');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'campusconnect_super_secret_jwt_key_2026_x89f2',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.checkRollNumber = async (req, res) => {
  try {
    const { rollNumber } = req.body;
    if (!rollNumber) {
      return ApiResponse.error(res, 'Roll number is required', 400);
    }

    const trimmedRoll = rollNumber.trim().toUpperCase();

    const allowed = await prisma.allowedRollNumber.findUnique({
      where: { rollNumber: trimmedRoll }
    });

    if (!allowed) {
      return ApiResponse.error(
        res,
        'This roll number is not whitelisted by campus administration. Please contact the college admin to register.',
        403
      );
    }

    if (allowed.isUsed) {
      return ApiResponse.error(
        res,
        'An account has already been registered with this roll number. Please log in.',
        409
      );
    }

    return ApiResponse.success(res, 'Roll number verified! You may proceed with registration.', {
      rollNumber: allowed.rollNumber,
      fullName: allowed.fullName,
      branch: allowed.branch,
      year: allowed.year
    });
  } catch (error) {
    console.error('Check roll error:', error);
    return ApiResponse.error(res, 'Failed to verify roll number', 500);
  }
};

exports.signup = async (req, res) => {
  try {
    const {
      rollNumber,
      fullName,
      email,
      password,
      phone,
      dob,
      branch,
      year,
      gender,
      bio
    } = req.body;

    if (!rollNumber || !fullName || !email || !password || !branch || !year) {
      return ApiResponse.error(res, 'Please fill in all mandatory fields', 400);
    }

    const trimmedRoll = rollNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Verify whitelist
    const allowed = await prisma.allowedRollNumber.findUnique({
      where: { rollNumber: trimmedRoll }
    });

    if (!allowed || allowed.isUsed) {
      return ApiResponse.error(
        res,
        'Roll number is invalid or has already been used.',
        400
      );
    }

    // 2. Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      return ApiResponse.error(res, 'An account with this email already exists', 409);
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Handle files
    let profilePhotoUrl = null;
    let coverPhotoUrl = null;

    if (req.files) {
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        profilePhotoUrl = `/uploads/avatars/${req.files.profilePhoto[0].filename}`;
      }
      if (req.files.coverPhoto && req.files.coverPhoto[0]) {
        coverPhotoUrl = `/uploads/avatars/${req.files.coverPhoto[0].filename}`;
      }
    }

    // 5. Create user and mark roll number as used
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          rollNumber: trimmedRoll,
          fullName,
          email: cleanEmail,
          passwordHash,
          phone,
          dob,
          branch,
          year,
          gender,
          profilePhoto: profilePhotoUrl,
          coverPhoto: coverPhotoUrl,
          bio,
          role: 'student',
          status: 'active'
        }
      });

      await tx.allowedRollNumber.update({
        where: { rollNumber: trimmedRoll },
        data: { isUsed: true }
      });

      return newUser;
    });

    // 6. Generate OTP (optional verification step)
    const otp = generateOtp();
    await prisma.otpVerification.create({
      data: {
        email: cleanEmail,
        otpCode: otp,
        purpose: 'signup',
        expiresAt: getOtpExpiry(10)
      }
    });
    await sendOtpEmail(cleanEmail, otp, 'Welcome to CampusConnect - Account Verification');

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    return ApiResponse.success(res, 'Registration successful! Welcome to CampusConnect.', {
      user: safeUser,
      token,
      otpSent: true
    }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return ApiResponse.error(res, error.message || 'Registration failed', 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return ApiResponse.error(res, 'Please provide email/roll number and password', 400);
    }

    const cleanIdentifier = identifier.trim();

    // Find by email or rollNumber
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier.toLowerCase() },
          { rollNumber: cleanIdentifier.toUpperCase() }
        ]
      }
    });

    if (!user) {
      return ApiResponse.error(res, 'Invalid roll number/email or password', 401);
    }

    if (user.status === 'suspended') {
      return ApiResponse.error(res, 'Your account has been suspended by the campus administrator.', 403);
    }

    if (user.status === 'deleted') {
      return ApiResponse.error(res, 'This account has been deactivated.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return ApiResponse.error(res, 'Invalid roll number/email or password', 401);
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    return ApiResponse.success(res, 'Login successful!', {
      user: safeUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return ApiResponse.error(res, 'Login failed', 500);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return ApiResponse.error(res, 'Email address is required', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      // Return success even if not found to prevent user enumeration
      return ApiResponse.success(res, 'If an account exists with this email, an OTP has been sent.');
    }

    // Invalidate any previous unused OTPs for this email
    await prisma.otpVerification.updateMany({
      where: {
        email: cleanEmail,
        purpose: 'password_reset',
        isUsed: false
      },
      data: { isUsed: true }
    });

    const otp = generateOtp();
    await prisma.otpVerification.create({
      data: {
        email: cleanEmail,
        otpCode: otp,
        purpose: 'password_reset',
        expiresAt: getOtpExpiry(10)
      }
    });

    const result = await sendOtpEmail(cleanEmail, otp, 'CampusConnect - Password Reset Request');

    const responseData = { email: cleanEmail };

    // In dev mode (no SMTP), include OTP in response so user can test
    if (!result.sent && result.devOtp) {
      responseData.devOtp = result.devOtp;
      responseData.devNote = 'SMTP not configured. OTP is shown here for development testing.';
    }

    return ApiResponse.success(res, 'Password reset OTP has been sent to your college email.', responseData);
  } catch (error) {
    console.error('Forgot password error:', error);
    return ApiResponse.error(res, 'Failed to process request', 500);
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, purpose = 'password_reset' } = req.body;
    if (!email || !otp) {
      return ApiResponse.error(res, 'Email and OTP are required', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        otpCode: otp.trim(),
        purpose,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!record) {
      return ApiResponse.error(res, 'Invalid or expired OTP code', 400);
    }

    // Mark as used
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { isUsed: true }
    });

    return ApiResponse.success(res, 'OTP verified successfully!');
  } catch (error) {
    console.error('Verify OTP error:', error);
    return ApiResponse.error(res, 'Failed to verify OTP', 500);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return ApiResponse.error(res, 'All fields are required', 400);
    }

    if (newPassword.length < 6) {
      return ApiResponse.error(res, 'Password must be at least 6 characters long', 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify OTP is valid, not expired, and not already used
    const record = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        otpCode: otp.trim(),
        purpose: 'password_reset',
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!record) {
      return ApiResponse.error(res, 'Invalid or expired OTP. Please request a new one.', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password and mark OTP as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { email: cleanEmail },
        data: { passwordHash: newHash }
      }),
      prisma.otpVerification.update({
        where: { id: record.id },
        data: { isUsed: true }
      })
    ]);

    return ApiResponse.success(res, 'Password has been reset successfully! You can now log in.');
  } catch (error) {
    console.error('Reset password error:', error);
    return ApiResponse.error(res, 'Failed to reset password', 500);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        _count: {
          select: {
            posts: true,
            receivedRequests: { where: { status: 'pending' } },
            notifications: { where: { read: false } }
          }
        }
      }
    });

    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    const { passwordHash: _, ...safeUser } = user;
    return ApiResponse.success(res, 'User profile retrieved', {
      ...safeUser,
      unreadNotificationsCount: user._count.notifications,
      pendingRequestsCount: user._count.receivedRequests
    });
  } catch (error) {
    console.error('Get me error:', error);
    return ApiResponse.error(res, 'Failed to retrieve profile', 500);
  }
};
