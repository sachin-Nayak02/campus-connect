const crypto = require('crypto');
const nodemailer = require('nodemailer');

function generateOtp() {
  // Use cryptographically secure random number generator
  return crypto.randomInt(100000, 1000000).toString();
}

function getOtpExpiry(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// Create reusable transporter only if SMTP is configured
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: (parseInt(process.env.SMTP_PORT) || 587) === 465,
      auth: { user, pass }
    });
    console.log('[OTP] Email transport configured via SMTP');
    return transporter;
  }

  return null;
}

/**
 * Send OTP via email if SMTP is configured, otherwise log to console.
 * Returns { sent: boolean, devOtp?: string }
 * - sent=true: email was sent via SMTP
 * - sent=false: dev mode fallback, devOtp contains the OTP code
 */
async function sendOtpEmail(email, otp, purpose = 'Verification') {
  const transport = getTransporter();

  if (transport) {
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM || '"CampusConnect" <noreply@campusconnect.edu>',
        to: email,
        subject: purpose,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #4f46e5;">CampusConnect</h2>
            <p>Your verification code is:</p>
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
      console.log(`[OTP] Email sent to ${email} for: ${purpose}`);
      return { sent: true };
    } catch (err) {
      console.error('[OTP] Failed to send email:', err.message);
      // Fall through to dev mode
    }
  }

  // Dev mode fallback: log to console and return OTP for API response
  console.log('====================================================');
  console.log(`[CAMPUSCONNECT OTP SERVICE - DEV MODE]`);
  console.log(`To: ${email}`);
  console.log(`Purpose: ${purpose}`);
  console.log(`OTP Code: ${otp}`);
  console.log(`Expires in: 10 minutes`);
  console.log('====================================================');

  return { sent: false, devOtp: otp };
}

module.exports = {
  generateOtp,
  getOtpExpiry,
  sendOtpEmail
};
