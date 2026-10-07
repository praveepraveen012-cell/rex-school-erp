const crypto = require('crypto');
const db = require('../database/db');
const config = require('../config/env');
const smsService = require('./smsService');

const otpService = {
  /**
   * Generate and store a secure 6-digit OTP for a given mobile number
   * @param {string} mobile
   * @param {string} role
   * @returns {{ otp: string, expiresAt: Date, isDev: boolean }}
   */
  generateOtp(mobile, role = 'TEACHER') {
    // 6-digit OTP
    const otp = config.enableDevOtp ? config.devDefaultOtp : Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000).toISOString();

    // Invalidate any previous unverified OTPs for this mobile
    db.run(`UPDATE otp_verifications SET verified = 2 WHERE mobile = ? AND verified = 0`, [mobile]);

    // Insert new OTP record
    db.run(
      `INSERT INTO otp_verifications (mobile, otp_hash, role, attempts, verified, expires_at)
       VALUES (?, ?, ?, 0, 0, ?)`,
      [mobile, otpHash, role, expiresAt]
    );

    // Send via Automated SMS Service
    smsService.sendOtpSms(mobile, otp);

    return {
      otp: config.enableDevOtp ? otp : undefined, // only exposed in dev mode response for easy testing
      expiresAt,
      isDev: config.enableDevOtp
    };
  },

  /**
   * Verify an OTP for a given mobile number
   * @param {string} mobile
   * @param {string} inputOtp
   * @returns {{ valid: boolean, message?: string }}
   */
  verifyOtp(mobile, inputOtp) {
    const record = db.get(
      `SELECT * FROM otp_verifications
       WHERE mobile = ? AND verified = 0
       ORDER BY created_at DESC LIMIT 1`,
      [mobile]
    );

    if (!record) {
      return { valid: false, message: 'No active OTP verification found. Please request a new OTP.' };
    }

    // Check expiration
    if (new Date() > new Date(record.expires_at)) {
      db.run(`UPDATE otp_verifications SET verified = 2 WHERE id = ?`, [record.id]);
      return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
    }

    // Check attempts limit
    if (record.attempts >= config.maxOtpAttempts) {
      db.run(`UPDATE otp_verifications SET verified = 2 WHERE id = ?`, [record.id]);
      return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    const inputHash = crypto.createHash('sha256').update(String(inputOtp).trim()).digest('hex');

    if (inputHash !== record.otp_hash) {
      // Increment attempt count
      db.run(`UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?`, [record.id]);
      const remaining = config.maxOtpAttempts - (record.attempts + 1);
      return {
        valid: false,
        message: remaining > 0
          ? `Invalid OTP. ${remaining} attempt(s) remaining.`
          : 'Invalid OTP. Attempt limit exceeded. Please request a new OTP.'
      };
    }

    // Mark verified
    db.run(`UPDATE otp_verifications SET verified = 1 WHERE id = ?`, [record.id]);
    return { valid: true };
  },

  /**
   * SMS delivery provider hook
   * Pluggable for Twilio, MSG91, AWS SNS, etc.
   */
  sendSms(mobile, message) {
    if (config.smsProvider === 'mock' || config.isDev) {
      console.log(`📱 [SMS SERVICE (DEV MOCK)] To: ${mobile} | Message: "${message}"`);
      return Promise.resolve({ success: true, provider: 'mock' });
    }

    // Production hook:
    // e.g. twilioClient.messages.create({ to: mobile, from: config.smsSenderId, body: message })
    console.log(`📱 [SMS DISPATCHED (PROD)] Provider: ${config.smsProvider} | To: ${mobile}`);
    return Promise.resolve({ success: true, provider: config.smsProvider });
  }
};

module.exports = otpService;
