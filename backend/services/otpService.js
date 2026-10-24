const crypto = require('crypto');
const db = require('../database/db');
const config = require('../config/env');
const smsService = require('./smsService');

const otpService = {
  /**
   * Check if SMS provider is properly configured
   * Returns null if OK, or an error string if missing credentials
   */
  checkProviderConfig() {
    const provider = config.smsProvider || 'mock';
    if (provider === 'twilio') {
      if (!config.twilioAccountSid || !config.twilioAuthToken) {
        return 'SMS Provider Error: Twilio Account SID or Auth Token is missing in server environment.';
      }
    } else if (provider === 'fast2sms') {
      if (!config.smsApiKey) {
        return 'SMS Provider Error: Fast2SMS API Key is missing in server environment.';
      }
    }
    return null;
  },

  /**
   * Generate and store a secure cryptographically random 6-digit OTP
   * @param {string} mobile
   * @param {string} role
   * @returns {{ success: boolean, otp?: string, devOtp?: string, expiresAt?: string, error?: string, rateLimited?: boolean, providerError?: boolean }}
   */
  generateOtp(mobile, role = 'TEACHER') {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return { success: false, error: 'Please provide a valid 10-digit mobile number.' };
    }

    // 1. Verify SMS provider configuration
    const providerErr = this.checkProviderConfig();
    if (providerErr) {
      return { success: false, providerError: true, error: providerErr };
    }

    // 2. Enforce 60-second rate limiting cooldown on resends
    const recent = db.get(
      `SELECT created_at FROM otp_verifications
       WHERE mobile = ? AND role = ? AND datetime(created_at, '+60 seconds') > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
      [cleanMobile, role]
    );

    if (recent) {
      return {
        success: false,
        rateLimited: true,
        error: 'Please wait at least 60 seconds before requesting another OTP.'
      };
    }

    // 3. Cryptographically random 6-digit OTP (100000 to 999999) - never hardcoded
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000).toISOString();

    // 4. Invalidate any previous unverified OTPs for this mobile
    db.run(
      `UPDATE otp_verifications SET verified = 2 WHERE mobile = ? AND verified = 0`,
      [cleanMobile]
    );

    // 5. Insert new OTP record
    db.run(
      `INSERT INTO otp_verifications (mobile, otp_hash, role, attempts, verified, expires_at)
       VALUES (?, ?, ?, 0, 0, ?)`,
      [cleanMobile, otpHash, role, expiresAt]
    );

    // 6. Send via Automated SMS Service
    smsService.sendOtpSms(cleanMobile, otp);

    return {
      success: true,
      message: 'OTP sent successfully to registered mobile.',
      otp: config.isDev ? otp : undefined,
      devOtp: config.isDev ? otp : undefined,
      expiresAt,
      isDev: config.isDev
    };
  },

  /**
   * Verify an OTP for a given mobile number
   * Prevents invalid, expired, and reused OTPs
   * @param {string} mobile
   * @param {string} inputOtp
   * @param {string|null} role
   * @returns {{ valid: boolean, message?: string, phoneVerificationToken?: string }}
   */
  verifyOtp(mobile, inputOtp, role = null) {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const cleanOtp = String(inputOtp || '').trim();

    if (!cleanMobile || cleanMobile.length !== 10) {
      return { valid: false, message: 'Invalid mobile number format.' };
    }
    if (!cleanOtp || cleanOtp.length !== 6) {
      return { valid: false, message: 'OTP must be exactly 6 digits.' };
    }

    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    // 1. Fetch pending OTP record
    let record;
    if (role) {
      record = db.get(
        `SELECT * FROM otp_verifications
         WHERE mobile = ? AND role = ? AND verified = 0
         ORDER BY created_at DESC LIMIT 1`,
        [cleanMobile, role]
      );
    } else {
      record = db.get(
        `SELECT * FROM otp_verifications
         WHERE mobile = ? AND verified = 0
         ORDER BY created_at DESC LIMIT 1`,
        [cleanMobile]
      );
    }

    // 2. If no pending record, check if OTP was already used/consumed (reused OTP rejection)
    if (!record) {
      const usedRecord = db.get(
        `SELECT * FROM otp_verifications
         WHERE mobile = ? AND otp_hash = ? AND verified IN (1, 2)
         ORDER BY created_at DESC LIMIT 1`,
        [cleanMobile, inputHash]
      );
      if (usedRecord) {
        return {
          valid: false,
          message: 'This OTP has already been used and cannot be reused. Please request a new OTP.'
        };
      }
      return {
        valid: false,
        message: 'No active OTP verification found. Please request a new OTP.'
      };
    }

    // 3. Check expiration
    if (new Date() > new Date(record.expires_at)) {
      db.run(`UPDATE otp_verifications SET verified = 2 WHERE id = ?`, [record.id]);
      return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
    }

    // 4. Check attempts limit
    if (record.attempts >= config.maxOtpAttempts) {
      db.run(`UPDATE otp_verifications SET verified = 2 WHERE id = ?`, [record.id]);
      return { valid: false, message: 'Too many incorrect attempts. This OTP has been invalidated. Please request a new OTP.' };
    }

    // 5. Validate hash
    if (inputHash !== record.otp_hash) {
      const nextAttempts = record.attempts + 1;
      db.run(`UPDATE otp_verifications SET attempts = ? WHERE id = ?`, [nextAttempts, record.id]);
      const remaining = config.maxOtpAttempts - nextAttempts;
      return {
        valid: false,
        message: remaining > 0
          ? `Invalid OTP code. ${remaining} attempt(s) remaining.`
          : 'Invalid OTP code. Attempt limit exceeded. Please request a new OTP.'
      };
    }

    // 6. Mark verified
    db.run(`UPDATE otp_verifications SET verified = 1 WHERE id = ?`, [record.id]);

    const verificationToken = crypto
      .createHash('sha256')
      .update(`${cleanMobile}:${record.otp_hash}:${Date.now()}:${config.jwtSecret}`)
      .digest('hex');

    return {
      valid: true,
      message: 'Mobile number verified successfully.',
      phoneVerificationToken: verificationToken
    };
  },

  /**
   * Check if a mobile number is currently verified (has a verified=1 unconsumed record)
   */
  isMobileVerified(mobile, role = 'REGISTRATION_PHONE') {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const record = db.get(
      `SELECT id FROM otp_verifications
       WHERE mobile = ? AND role = ? AND verified = 1
         AND datetime(created_at, '+30 minutes') > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
      [cleanMobile, role]
    );
    return !!record;
  },

  /**
   * Consume a verified OTP so it can never be used again
   */
  consumeOtp(mobile, role = 'REGISTRATION_PHONE') {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    db.run(
      `UPDATE otp_verifications SET verified = 2 WHERE mobile = ? AND role = ? AND verified = 1`,
      [cleanMobile, role]
    );
  }
};

module.exports = otpService;
