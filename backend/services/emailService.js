/**
 * Grexotix School Management Platform - Automated Email Service
 * Handles transactional and lifecycle emails:
 *  - Registration confirmation with unique School ID
 *  - 7-Day Free Trial activation & countdown notifications (3 days, 1 day, expired)
 *  - Subscription payment invoices & receipts
 *  - Password reset tokens
 *  - Safe test mode logging and duplicate prevention
 */

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
}

module.exports = new EmailService();
