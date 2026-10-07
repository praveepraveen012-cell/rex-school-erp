const db = require('../database/db');
const config = require('../config/env');

const smsService = {
  /**
   * Dispatch an automated SMS to a recipient
   * @param {{ recipient: string, message: string, type: 'OTP'|'ABSENTEE_ALERT'|'EMERGENCY'|'ANNOUNCEMENT'|'GENERAL' }} param0
   */
  async sendDirectSms({ recipient, message, type = 'GENERAL' }) {
    if (!recipient || !message) {
      console.warn('⚠️ [SMS SERVICE] Missing recipient or message body.');
      return { success: false, error: 'Recipient and message are required' };
    }

    const cleanMobile = String(recipient).replace(/[^0-9]/g, '');
    const provider = config.smsProvider || 'mock';

    // 1. Initial log entry in database
    let logId = null;
    try {
      const res = db.run(
        `INSERT INTO sms_logs (recipient, message, sms_type, status, provider)
         VALUES (?, ?, ?, 'PENDING', ?)`,
        [cleanMobile, message, type, provider]
      );
      logId = res.lastInsertRowid;
    } catch (e) {
      console.error('Failed to create sms_log entry:', e.message);
    }

    // If SMS globally disabled in configuration
    if (!config.smsEnabled) {
      console.log(`🔕 [SMS DISABLED IN CONFIG] To: ${cleanMobile} | Msg: "${message}"`);
      if (logId) {
        db.run(`UPDATE sms_logs SET status = 'FAILED', error_message = 'SMS disabled in configuration' WHERE id = ?`, [logId]);
      }
      return { success: false, reason: 'SMS disabled in config' };
    }

    // 2. Dispatch via selected provider
    try {
      if (provider === 'mock' || config.isDev) {
        // Development / Mock delivery: Instant 100% reliable simulation
        console.log(`\n==================================================`);
        console.log(`📱 [AUTOMATED SMS DISPATCHED]`);
        console.log(`   Type:      ${type}`);
        console.log(`   To:        ${cleanMobile}`);
        console.log(`   Provider:  MOCK/SIMULATED`);
        console.log(`   Message:   ${message}`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        console.log(`==================================================\n`);

        if (logId) {
          db.run(`UPDATE sms_logs SET status = 'SENT', reference_id = ? WHERE id = ?`, [`MOCK-${Date.now()}`, logId]);
        }
        return { success: true, provider: 'mock', recipient: cleanMobile };
      }

      if (provider === 'fast2sms' && config.smsApiKey) {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': config.smsApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'v3',
            sender_id: config.smsSenderId,
            message: message,
            language: 'english',
            flash: 0,
            numbers: cleanMobile
          })
        });

        const data = await response.json();
        const isOk = response.ok && (data.return === true || data.status_code === 200);

        if (logId) {
          db.run(
            `UPDATE sms_logs SET status = ?, reference_id = ?, error_message = ? WHERE id = ?`,
            [isOk ? 'SENT' : 'FAILED', data.request_id || null, isOk ? null : JSON.stringify(data), logId]
          );
        }
        return { success: isOk, provider: 'fast2sms', response: data };
      }

      if (provider === 'twilio' && config.twilioAccountSid && config.twilioAuthToken) {
        // Format recipient with E.164 country code (+91 for India if not already formatted)
        let toFormatted = cleanMobile;
        if (cleanMobile.length === 10) {
          toFormatted = `+91${cleanMobile}`;
        } else if (cleanMobile.startsWith('91') && cleanMobile.length === 12) {
          toFormatted = `+${cleanMobile}`;
        } else if (!toFormatted.startsWith('+')) {
          toFormatted = `+${toFormatted}`;
        }

        const twilioAuth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', toFormatted);
        if (config.twilioMessagingServiceSid) {
          params.append('MessagingServiceSid', config.twilioMessagingServiceSid);
        } else if (config.twilioPhoneNumber) {
          params.append('From', config.twilioPhoneNumber);
        } else if (config.smsSenderId) {
          params.append('From', config.smsSenderId);
        }
        params.append('Body', message);

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        const data = await response.json();
        const isOk = response.ok && !data.error_code;

        if (logId) {
          db.run(
            `UPDATE sms_logs SET status = ?, reference_id = ?, error_message = ? WHERE id = ?`,
            [isOk ? 'SENT' : 'FAILED', data.sid || null, isOk ? null : (data.message || JSON.stringify(data)), logId]
          );
        }
        return { success: isOk, provider: 'twilio', sid: data.sid, response: data };
      }

      if (provider === 'webhook' && config.smsWebhookUrl) {
        const response = await fetch(config.smsWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: cleanMobile,
            message,
            type,
            senderId: config.smsSenderId,
            timestamp: new Date().toISOString()
          })
        });

        const isOk = response.ok;
        if (logId) {
          db.run(
            `UPDATE sms_logs SET status = ?, error_message = ? WHERE id = ?`,
            [isOk ? 'SENT' : 'FAILED', isOk ? null : `HTTP ${response.status}`, logId]
          );
        }
        return { success: isOk, provider: 'webhook' };
      }

      // Fallback if provider not specifically matched
      if (logId) {
        db.run(`UPDATE sms_logs SET status = 'SENT' WHERE id = ?`, [logId]);
      }
      return { success: true, provider };
    } catch (err) {
      console.error(`❌ [SMS SEND ERROR] To: ${cleanMobile}:`, err.message);
      if (logId) {
        db.run(`UPDATE sms_logs SET status = 'FAILED', error_message = ? WHERE id = ?`, [err.message, logId]);
      }
      return { success: false, error: err.message };
    }
  },

  /**
   * Automated OTP SMS
   */
  async sendOtpSms(mobile, otp) {
    const message = `Your Rex School ERP login verification code is ${otp}. Valid for ${config.otpExpiryMinutes} minutes. Do NOT share this code with anyone.`;
    return this.sendDirectSms({
      recipient: mobile,
      message,
      type: 'OTP'
    });
  },

  /**
   * Automated Daily Absentee Alert to Parent
   */
  async sendAbsenteeAlert({ mobile, studentName, rollNo, className, sectionName, date }) {
    const message = `Christus Rex School: Dear Parent, your ward ${studentName} (Class ${className}-${sectionName}, Roll ${rollNo}) is marked ABSENT on ${date}. Please contact the school office if this was unauthorized.`;
    return this.sendDirectSms({
      recipient: mobile,
      message,
      type: 'ABSENTEE_ALERT'
    });
  },

  /**
   * Automated Announcement / Emergency Broadcast SMS
   */
  async sendBroadcastSms({ mobile, title, message }) {
    const formatted = `Christus Rex Alert: [${title}] ${message}`;
    return this.sendDirectSms({
      recipient: mobile,
      message: formatted,
      type: 'EMERGENCY'
    });
  },

  /**
   * Get historical SMS dispatch logs with filtering
   */
  getLogs({ limit = 50, offset = 0, type, recipient } = {}) {
    let sql = `SELECT * FROM sms_logs WHERE 1=1`;
    const params = [];

    if (type) {
      sql += ` AND sms_type = ?`;
      params.push(type);
    }
    if (recipient) {
      sql += ` AND recipient LIKE ?`;
      params.push(`%${recipient}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.query(sql, params);
  },

  /**
   * Get SMS summary stats
   */
  getStats() {
    const today = new Date().toISOString().split('T')[0];
    const total = db.get(`SELECT COUNT(*) as count FROM sms_logs`)?.count || 0;
    const sent = db.get(`SELECT COUNT(*) as count FROM sms_logs WHERE status = 'SENT'`)?.count || 0;
    const failed = db.get(`SELECT COUNT(*) as count FROM sms_logs WHERE status = 'FAILED'`)?.count || 0;
    const todayCount = db.get(`SELECT COUNT(*) as count FROM sms_logs WHERE date(created_at) = ?`, [today])?.count || 0;
    const byType = db.query(`SELECT sms_type, COUNT(*) as count FROM sms_logs GROUP BY sms_type`);

    return {
      total,
      sent,
      failed,
      todayCount,
      byType,
      provider: config.smsProvider,
      enabled: config.smsEnabled
    };
  }
};

module.exports = smsService;
