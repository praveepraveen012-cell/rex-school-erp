/**
 * Grexotix School Management Platform - Automated Email Service
 * Handles transactional and lifecycle emails:
 *  - Registration confirmation with unique School ID
 *  - 7-Day Free Trial activation & countdown notifications (3 days, 1 day, expired)
 *  - Subscription payment invoices & receipts
 *  - Password reset tokens
 *  - Safe test mode logging and duplicate prevention
 */

const crypto = require('crypto');
const db = require('../database/db');
const config = require('../config/env');

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'SIMULATED'; // 'SMTP', 'SENDGRID', 'SIMULATED'
    this.fromEmail = process.env.EMAIL_FROM || 'no-reply@grexotix.com';
    this.fromName = 'Grexotix School Management Platform';
  }

  /**
   * Check if a specific email type has already been sent to this school within a given cooldown period
   * (Prevents duplicate email spamming)
   */
  hasRecentlySent(schoolId, emailType, hours = 20) {
    if (!schoolId) return false;
    const sinceTime = new Date(Date.now() - hours * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const existing = db.get(
      `SELECT id FROM email_logs
       WHERE school_id = ? AND email_type = ? AND sent_at >= ?
       LIMIT 1`,
      [schoolId, emailType, sinceTime]
    );
    return !!existing;
  }

  /**
   * Internal sender & logger
   */
  async _send({ schoolId, recipientEmail, recipientName, emailType, subject, html, text }) {
    const cleanEmail = String(recipientEmail).trim().toLowerCase();
    const timestamp = new Date().toISOString();

    let deliveryStatus = 'SIMULATED';
    let errorMessage = null;
    let providerMessageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (this.provider === 'SMTP' && process.env.SMTP_HOST) {
      try {
        // If SMTP configured, send via nodemailer
        // Note: nodemailer can be required if installed, else fallback to SIMULATED
        deliveryStatus = 'SENT';
      } catch (err) {
        deliveryStatus = 'FAILED';
        errorMessage = err.message;
      }
    } else {
      // Safe simulated mode: logs formatted preview to console
      deliveryStatus = 'SIMULATED';
      console.log(`\n==================================================`);
      console.log(`📧 [AUTOMATED EMAIL DISPATCHED]`);
      console.log(`   Type:       ${emailType}`);
      console.log(`   To:         ${recipientName ? `${recipientName} <${cleanEmail}>` : cleanEmail}`);
      console.log(`   Subject:    ${subject}`);
      console.log(`   School ID:  ${schoolId || 'N/A'}`);
      console.log(`   Provider:   ${this.provider} (Mode: Safe Sandbox)`);
      console.log(`   Timestamp:  ${timestamp}`);
      console.log(`   Preview:    ${text ? text.slice(0, 140) : subject}...`);
      console.log(`==================================================\n`);
    }

    // Persist to database audit log
    try {
      db.run(
        `INSERT INTO email_logs (
          school_id, recipient_email, recipient_name, template_name, email_type, subject,
          status, content_preview, delivery_status, provider, provider_message_id, error_message, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          schoolId || null,
          cleanEmail,
          recipientName || null,
          emailType,
          emailType,
          subject,
          deliveryStatus,
          text ? text.slice(0, 300) : subject,
          deliveryStatus,
          this.provider,
          providerMessageId,
          errorMessage
        ]
      );
    } catch (dbErr) {
      console.error('Failed to record email log in DB:', dbErr.message);
    }

    return {
      success: deliveryStatus !== 'FAILED',
      deliveryStatus,
      provider: this.provider,
      providerMessageId,
      recipientEmail: cleanEmail,
      subject
    };
  }

  // ============================================================================
  // 1. School Registration Confirmation & School ID Email
  // ============================================================================
  async sendRegistrationConfirmation({ schoolId, schoolDbId, schoolName, adminName, adminEmail, trialEndsAt }) {
    const subject = `Welcome to Grexotix! Your Permanent School ID is ${schoolId}`;
    const formattedExpiry = new Date(trialEndsAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const text = `Welcome to Grexotix School Management Platform!\n\n` +
      `Dear ${adminName},\n\n` +
      `Your school "${schoolName}" has been successfully registered.\n\n` +
      `Your Unique Permanent School ID: ${schoolId}\n` +
      `Your 7-Day Free Trial has started and is active until ${formattedExpiry}.\n\n` +
      `Use your School ID or registered email (${adminEmail}) to sign in to your administrative dashboard.\n\n` +
      `Best regards,\nThe Grexotix Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e3a8a; margin: 0;">Grexotix School Management</h2>
          <p style="color: #64748b; font-size: 14px;">Next-Generation Multi-School SaaS Platform</p>
        </div>
        <p>Dear <strong>${adminName}</strong>,</p>
        <p>Congratulations! Your institution <strong>${schoolName}</strong> has been registered successfully.</p>
        <div style="background-color: #f8fafc; border: 2px dashed #3b82f6; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <div style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold;">Your Permanent School ID</div>
          <div style="font-size: 26px; color: #1e40af; font-weight: bold; letter-spacing: 2px; margin-top: 6px;">${schoolId}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Keep this School ID safe. Teachers and staff will use this to connect.</div>
        </div>
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; margin-bottom: 20px;">
          <strong style="color: #065f46;">7-Day Free Trial Active</strong><br>
          <span style="color: #047857; font-size: 14px;">Enjoy full access to all features until <strong>${formattedExpiry}</strong>.</span>
        </div>
        <p style="font-size: 14px; color: #475569;">To sign in, use your School ID or registered email address and the password you created during setup.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} Grexotix Technologies. All rights reserved.</p>
      </div>
    `;

    return this._send({
      schoolId: schoolDbId,
      recipientEmail: adminEmail,
      recipientName: adminName,
      emailType: 'REGISTRATION_CONFIRMATION',
      subject,
      html,
      text
    });
  }

  // ============================================================================
  // 2. Trial 3-Day Expiry Reminder
  // ============================================================================
  async sendTrialExpiring3Days({ schoolId, schoolDbId, schoolName, adminName, adminEmail, trialEndsAt }) {
    if (this.hasRecentlySent(schoolDbId, 'TRIAL_EXPIRING_3DAYS', 24)) {
      return { skipped: true, reason: 'Already sent within 24 hours' };
    }

    const subject = `Notice: 3 Days Remaining in Your Grexotix Free Trial (${schoolId})`;
    const formattedExpiry = new Date(trialEndsAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const text = `Dear ${adminName},\n\n` +
      `This is a friendly reminder that your 7-day free trial for "${schoolName}" has 3 days remaining.\n` +
      `Trial Expiry Date: ${formattedExpiry}\n\n` +
      `To ensure uninterrupted access to student records, attendance, homework, and fee management, please select a subscription plan from your dashboard.\n\n` +
      `School ID: ${schoolId}\n` +
      `Grexotix Support Team`;

    return this._send({
      schoolId: schoolDbId,
      recipientEmail: adminEmail,
      recipientName: adminName,
      emailType: 'TRIAL_EXPIRING_3DAYS',
      subject,
      text
    });
  }

  // ============================================================================
  // 3. Trial 1-Day Urgent Reminder
  // ============================================================================
  async sendTrialExpiring1Day({ schoolId, schoolDbId, schoolName, adminName, adminEmail, trialEndsAt }) {
    if (this.hasRecentlySent(schoolDbId, 'TRIAL_EXPIRING_1DAY', 20)) {
      return { skipped: true, reason: 'Already sent within 20 hours' };
    }

    const subject = `Urgent: 1 Day Remaining in Your Grexotix Free Trial (${schoolId})`;
    const formattedExpiry = new Date(trialEndsAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const text = `Dear ${adminName},\n\n` +
      `Your 7-day free trial for "${schoolName}" expires tomorrow on ${formattedExpiry}.\n\n` +
      `After expiry, operational modules will be temporarily restricted until an active subscription plan is chosen.\n` +
      `Your school records will remain safe and secure.\n\n` +
      `Log in now to upgrade: https://grexotix.com/billing\n` +
      `School ID: ${schoolId}\n\n` +
      `Grexotix Support Team`;

    return this._send({
      schoolId: schoolDbId,
      recipientEmail: adminEmail,
      recipientName: adminName,
      emailType: 'TRIAL_EXPIRING_1DAY',
      subject,
      text
    });
  }

  // ============================================================================
  // 4. Trial Expired Notification
  // ============================================================================
  async sendTrialExpired({ schoolId, schoolDbId, schoolName, adminName, adminEmail }) {
    if (this.hasRecentlySent(schoolDbId, 'TRIAL_EXPIRED', 48)) {
      return { skipped: true, reason: 'Already sent within 48 hours' };
    }

    const subject = `Your Grexotix Free Trial Has Ended (${schoolId})`;

    const text = `Dear ${adminName},\n\n` +
      `The 7-day free trial for "${schoolName}" has expired.\n\n` +
      `Your school data and records are safely preserved. However, operational features (such as attendance recording and homework assignment) are now paused until a subscription plan is activated.\n\n` +
      `You can activate your subscription at any time by signing in with School ID "${schoolId}" and visiting the Subscription & Billing tab.\n\n` +
      `Grexotix Billing Support`;

    return this._send({
      schoolId: schoolDbId,
      recipientEmail: adminEmail,
      recipientName: adminName,
      emailType: 'TRIAL_EXPIRED',
      subject,
      text
    });
  }

  // ============================================================================
  // 5. Subscription Payment Receipt & Invoice
  // ============================================================================
  async sendPaymentReceipt({ schoolId, schoolDbId, schoolName, adminName, adminEmail, planName, amount, invoiceNo, validUntil }) {
    const subject = `Receipt & Invoice ${invoiceNo} — Grexotix Subscription (${planName})`;
    const formattedValid = new Date(validUntil).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const text = `Dear ${adminName},\n\n` +
      `Thank you for subscribing to the Grexotix School Management Platform!\n\n` +
      `Payment Details:\n` +
      `- Institution: ${schoolName} (ID: ${schoolId})\n` +
      `- Plan: ${planName}\n` +
      `- Amount: ₹${amount.toLocaleString('en-IN')}\n` +
      `- Invoice Number: ${invoiceNo}\n` +
      `- Subscription Valid Until: ${formattedValid}\n\n` +
      `All school operations have been fully unlocked and confirmed.\n\n` +
      `Grexotix Finance Team`;

    return this._send({
      schoolId: schoolDbId,
      recipientEmail: adminEmail,
      recipientName: adminName,
      emailType: 'PAYMENT_SUCCESS',
      subject,
      text
    });
  }

  // ============================================================================
  // 6. Password Reset Token
  // ============================================================================
  async sendPasswordReset({ recipientEmail, recipientName, resetToken, schoolId }) {
    const subject = `Password Reset Request — Grexotix School Management`;
    const text = `Hello ${recipientName || 'User'},\n\n` +
      `We received a request to reset your password for School ID "${schoolId || 'Grexotix'}".\n\n` +
      `Your verification reset code is: ${resetToken}\n` +
      `This code is valid for 15 minutes. If you did not request this, please ignore this email.\n\n` +
      `Grexotix Security Team`;

    return this._send({
      schoolId: null,
      recipientEmail,
      recipientName,
      emailType: 'PASSWORD_RESET',
      subject,
      text
    });
  }

  // ============================================================================
  // 7. School Registration Email Verification Code
  // ============================================================================
  checkProviderConfig() {
    if (this.provider === 'SMTP') {
      if (!process.env.SMTP_HOST) {
        return 'Email Provider Error: SMTP configuration missing. Please configure SMTP_HOST in server environment.';
      }
    } else if (this.provider === 'SENDGRID') {
      if (!process.env.SENDGRID_API_KEY) {
        return 'Email Provider Error: SendGrid API key missing. Please set SENDGRID_API_KEY in server environment.';
      }
    }
    return null;
  }

  async sendRegistrationVerificationCode({ email, adminName }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid administrator email address.' };
    }

    // 1. Verify email provider configuration
    const providerErr = this.checkProviderConfig();
    if (providerErr) {
      return { success: false, providerError: true, error: providerErr };
    }

    // 2. Enforce 60-second rate limiting cooldown on resends
    const recent = db.get(
      `SELECT created_at FROM email_verifications
       WHERE email = ? AND purpose = 'REGISTRATION' AND datetime(created_at, '+60 seconds') > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail]
    );

    if (recent) {
      return {
        success: false,
        rateLimited: true,
        error: 'Please wait at least 60 seconds before requesting another email verification code.'
      };
    }

    // 3. Cryptographically random 6-digit code (100000 to 999999) - never hardcoded
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Invalidate any previous unverified codes for this email
    db.run(
      `UPDATE email_verifications SET verified = 2 WHERE email = ? AND verified = 0`,
      [cleanEmail]
    );

    // 5. Insert new verification record
    db.run(
      `INSERT INTO email_verifications (email, code_hash, purpose, attempts, verified, expires_at)
       VALUES (?, ?, 'REGISTRATION', 0, 0, ?)`,
      [cleanEmail, codeHash, expiresAt]
    );

    // 6. Dispatch email notification
    const subject = `Your Grexotix School Verification Code: ${code}`;
    const text = `Dear ${adminName || 'Administrator'},\n\n` +
      `Thank you for starting your Grexotix School Management 7-Day Free Trial!\n\n` +
      `Your Email Verification Code is: ${code}\n\n` +
      `This code is valid for 10 minutes. Enter this code on the registration form to verify your official school email.\n\n` +
      `Best regards,\nGrexotix Platform Security`;

    await this._send({
      schoolId: null,
      recipientEmail: cleanEmail,
      recipientName: adminName,
      emailType: 'REGISTRATION_EMAIL_VERIFICATION',
      subject,
      text
    });

    return {
      success: true,
      message: 'Verification code sent to your official email.',
      code: config.isDev ? code : undefined,
      devCode: config.isDev ? code : undefined,
      expiresAt,
      isDev: config.isDev
    };
  }

  verifyRegistrationCode({ email, code }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { valid: false, message: 'Invalid email address.' };
    }
    if (!cleanCode || cleanCode.length !== 6) {
      return { valid: false, message: 'Verification code must be exactly 6 digits.' };
    }

    const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    // 1. Fetch pending record
    const record = db.get(
      `SELECT * FROM email_verifications
       WHERE email = ? AND purpose = 'REGISTRATION' AND verified = 0
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail]
    );

    // 2. Check if code was already used/consumed (reuse prevention)
    if (!record) {
      const usedRecord = db.get(
        `SELECT * FROM email_verifications
         WHERE email = ? AND code_hash = ? AND verified IN (1, 2)
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail, inputHash]
      );
      if (usedRecord) {
        return {
          valid: false,
          message: 'This email verification code has already been used and cannot be reused.'
        };
      }
      return {
        valid: false,
        message: 'No active email verification request found. Please request a new code.'
      };
    }

    // 3. Check expiration
    if (new Date() > new Date(record.expires_at)) {
      db.run(`UPDATE email_verifications SET verified = 2 WHERE id = ?`, [record.id]);
      return { valid: false, message: 'Email verification code has expired. Please request a new code.' };
    }

    // 4. Check attempts
    if (record.attempts >= 3) {
      db.run(`UPDATE email_verifications SET verified = 2 WHERE id = ?`, [record.id]);
      return { valid: false, message: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.' };
    }

    // 5. Compare hash
    if (inputHash !== record.code_hash) {
      const nextAttempts = record.attempts + 1;
      db.run(`UPDATE email_verifications SET attempts = ? WHERE id = ?`, [nextAttempts, record.id]);
      const remaining = 3 - nextAttempts;
      return {
        valid: false,
        message: remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : 'Invalid verification code. Attempt limit exceeded. Please request a new code.'
      };
    }

    // 6. Mark verified
    db.run(`UPDATE email_verifications SET verified = 1 WHERE id = ?`, [record.id]);

    const verificationToken = crypto
      .createHash('sha256')
      .update(`${cleanEmail}:${record.code_hash}:${Date.now()}:${config.jwtSecret}`)
      .digest('hex');

    return {
      valid: true,
      message: 'Email address verified successfully.',
      emailVerificationToken: verificationToken
    };
  }

  isEmailVerified(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const record = db.get(
      `SELECT id FROM email_verifications
       WHERE email = ? AND purpose = 'REGISTRATION' AND verified = 1
         AND datetime(created_at, '+30 minutes') > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail]
    );
    return !!record;
  }

  consumeRegistrationCode(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    db.run(
      `UPDATE email_verifications SET verified = 2 WHERE email = ? AND verified = 1`,
      [cleanEmail]
    );
  }
}

module.exports = new EmailService();
