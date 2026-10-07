const db = require('../database/db');
const config = require('../config/env');
const auditService = require('./auditService');
const smsService = require('./smsService');

/**
 * Helper to obtain broken-down date/time components in school timezone (Asia/Kolkata)
 * @param {string|Date|null} customDate
 */
function getKolkataTime(customDate = null) {
  const d = customDate ? new Date(customDate) : new Date();
  const tz = config.schoolTimezone || 'Asia/Kolkata';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);
  const ymd = `${year}-${month}-${day}`;
  const totalMinutes = hour * 60 + minute;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    ymd,
    totalMinutes,
    iso: d.toISOString()
  };
}

/**
 * Parse time string into hour, minute, 24-hour HH:MM format, and 12-hour display format
 * Supports '17:00', '17:30', '05:00 PM', '5:00 PM', etc.
 * @param {string} timeStr
 */
function parseTimeString(timeStr) {
  if (!timeStr) return { hour: 17, minute: 0, time24: '17:00', display: '05:00 PM' };
  const str = String(timeStr).trim();
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3] ? ampmMatch[3].toUpperCase() : null;
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    const displayPeriod = hour >= 12 ? 'PM' : 'AM';
    const display = `${displayHour}:${String(minute).padStart(2, '0')} ${displayPeriod}`;
    return { hour, minute, time24, display };
  }
  return { hour: 17, minute: 0, time24: '17:00', display: '5:00 PM' };
}

/**
 * Retrieve current homework automation and communication settings
 */
function getAutomationSettings() {
  const row = db.get(`SELECT * FROM homework_automation_settings WHERE id = 1`) || {
    auto_send_enabled: 1,
    auto_send_time: '17:00',
    timezone: 'Asia/Kolkata',
    send_method: 'WhatsApp'
  };

  const parsed = parseTimeString(row.auto_send_time);
  const kolkataNow = getKolkataTime();
  const currentMinutes = kolkataNow.totalMinutes;
  const targetMinutes = parsed.hour * 60 + parsed.minute;

  let nextScheduledSend = 'Disabled';
  if (row.auto_send_enabled === 1) {
    if (currentMinutes < targetMinutes) {
      nextScheduledSend = `Today at ${parsed.display}`;
    } else {
      nextScheduledSend = `Tomorrow at ${parsed.display}`;
    }
  }

  const isMetaConfigured = Boolean(config.whatsappAccessToken && config.whatsappPhoneNumberId);
  const isTwilioConfigured = Boolean(config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber);
  const isConfigured = isMetaConfigured || isTwilioConfigured;

  return {
    auto_send_enabled: row.auto_send_enabled === 1,
    auto_send_time: parsed.time24,
    auto_send_time_display: parsed.display,
    timezone: row.timezone || config.schoolTimezone || 'Asia/Kolkata',
    send_method: row.send_method || 'WhatsApp',
    scheduler_status: schedulerInterval ? 'ACTIVE' : 'INACTIVE',
    scheduler_active: Boolean(schedulerInterval),
    next_scheduled_send: nextScheduledSend,
    available_send_methods: ['WhatsApp'],
    provider_status: {
      provider: 'WhatsApp',
      connection: isConfigured ? '✓ Connected' : '✕ Not Configured',
      is_configured: isConfigured,
      note: isConfigured
        ? (isMetaConfigured ? 'Meta WhatsApp Cloud API active' : 'Twilio WhatsApp API active')
        : 'Messaging provider is not configured. Automatic sending cannot be performed until a messaging provider is connected.'
    }
  };
}

/**
 * Update homework automation settings
 */
function updateAutomationSettings(newSettings = {}) {
  const {
    autoSendEnabled,
    auto_send_enabled,
    autoSendTime,
    auto_send_time,
    timezone,
    sendMethod,
    send_method
  } = newSettings;

  let isEnabled = null;
  if (auto_send_enabled !== undefined) {
    isEnabled = auto_send_enabled ? 1 : 0;
  } else if (autoSendEnabled !== undefined) {
    isEnabled = autoSendEnabled ? 1 : 0;
  }

  const rawTime = auto_send_time || autoSendTime;
  const parsedTime = rawTime ? parseTimeString(rawTime) : null;
  const tz = timezone || null;
  const method = send_method || sendMethod || null;

  db.run(
    `UPDATE homework_automation_settings SET
       auto_send_enabled = COALESCE(?, auto_send_enabled),
       auto_send_time = COALESCE(?, auto_send_time),
       timezone = COALESCE(?, timezone),
       send_method = COALESCE(?, send_method),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [isEnabled, parsedTime ? parsedTime.time24 : null, tz, method]
  );

  // If time was updated, update scheduled_send_at for all pending scheduled homework
  if (parsedTime) {
    const scheduledList = db.query(
      `SELECT id, assigned_date FROM homework WHERE status = 'SCHEDULED' AND auto_send_enabled = 1`
    );
    for (const h of scheduledList) {
      db.run(
        `UPDATE homework SET scheduled_send_at = ? WHERE id = ?`,
        [`${h.assigned_date} ${parsedTime.time24}:00`, h.id]
      );
    }
  }

  return getAutomationSettings();
}

/**
 * Check if the configured deadline has passed for a given assigned_date in Asia/Kolkata
 * @param {string} assignedDate - YYYY-MM-DD
 * @param {string|Date|null} simulatedTime
 * @returns {boolean}
 */
function isDeadlinePassed(assignedDate, simulatedTime = null) {
  const kolkata = getKolkataTime(simulatedTime);
  const targetDateStr = String(assignedDate).slice(0, 10);

  if (kolkata.ymd > targetDateStr) {
    return true; // The assigned date has passed
  }
  if (kolkata.ymd === targetDateStr) {
    const settings = getAutomationSettings();
    const parsed = parseTimeString(settings.auto_send_time);
    const deadlineMinutes = parsed.hour * 60 + parsed.minute;
    return kolkata.totalMinutes >= deadlineMinutes;
  }
  return false; // Assigned date is in the future
}

/**
 * Check if teacher editing is locked
 * @param {Object} homework
 * @param {string|Date|null} simulatedTime
 * @returns {{ locked: boolean, reason?: string }}
 */
function isEditLocked(homework, simulatedTime = null) {
  if (!homework) {
    return { locked: true, reason: 'Homework not found.' };
  }

  // If already sent to parents, locked regardless of time
  if (homework.status === 'SENT' || homework.status === 'published') {
    return { locked: true, reason: 'Homework has already been sent to parents.' };
  }

  // Configured deadline check
  if (isDeadlinePassed(homework.assigned_date, simulatedTime)) {
    return { locked: true, reason: 'Homework editing deadline has passed.' };
  }

  return { locked: false };
}

/**
 * Check if Super Admin can enable Auto Send for a given assigned_date
 * If past configured send time on assigned date, returns error message
 * @param {string} assignedDate
 * @param {string|Date|null} simulatedTime
 */
function validateAutoSendEnable(assignedDate, simulatedTime = null) {
  const settings = getAutomationSettings();
  if (isDeadlinePassed(assignedDate, simulatedTime)) {
    return {
      allowed: false,
      error: `The scheduled ${settings.auto_send_time_display} send time has already passed. Please use Send Now.`
    };
  }
  return { allowed: true };
}

/**
 * Format official WhatsApp homework notification message
 * @param {{ studentName: string, className: string, subjectName: string, title: string, description: string, dueDate: string }} data
 */
function formatWhatsAppHomeworkMessage(data) {
  return (
    `School Homework Notification\n\n` +
    `Student: ${data.studentName}\n` +
    `Class: ${data.className}\n` +
    `Subject: ${data.subjectName}\n\n` +
    `Homework:\n${data.title}\n\n` +
    `${data.description}\n\n` +
    `Due Date:\n${data.dueDate}\n\n` +
    `Please check the School Management App for complete details.`
  );
}

/**
 * Send WhatsApp notification to parent
 * Supports Meta Cloud API, Twilio WhatsApp, or Mock simulation
 * @param {{ recipient: string, message: string, forceFail?: boolean }} param0
 */
async function sendWhatsAppNotification({ recipient, message, forceFail = false }) {
  if (forceFail) {
    return {
      success: false,
      error: 'WhatsApp provider rejected message: Template parameter mismatch or quota exceeded'
    };
  }

  const cleanMobile = String(recipient).replace(/[^0-9]/g, '');
  let formattedRecipient = cleanMobile;
  if (cleanMobile.length === 10) {
    formattedRecipient = `+91${cleanMobile}`;
  } else if (!cleanMobile.startsWith('+')) {
    formattedRecipient = `+${cleanMobile}`;
  }

  // 1. Meta WhatsApp Cloud API
  if (config.whatsappAccessToken && config.whatsappPhoneNumberId) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.whatsappPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.whatsappAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedRecipient.replace('+', ''),
            type: 'text',
            text: { preview_url: false, body: message }
          })
        }
      );
      const data = await response.json();
      if (response.ok && data.messages && data.messages.length > 0) {
        return {
          success: true,
          provider: 'meta_whatsapp',
          providerMessageId: data.messages[0].id
        };
      }
      return {
        success: false,
        error: data.error ? data.error.message : 'Meta WhatsApp API error'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 2. Twilio WhatsApp
  if (config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber) {
    try {
      const twilioAuth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', `whatsapp:${formattedRecipient}`);
      params.append('From', `whatsapp:${config.twilioPhoneNumber}`);
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
      if (response.ok && !data.error_code) {
        return {
          success: true,
          provider: 'twilio_whatsapp',
          providerMessageId: data.sid
        };
      }
      return {
        success: false,
        error: data.message || `Twilio WhatsApp error ${data.error_code}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 3. Fallback / Mock WhatsApp Simulation
  return {
    success: true,
    provider: 'simulated_whatsapp',
    providerMessageId: `WA-SIM-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  };
}

/**
 * Dispatches homework notifications to all linked parents
 * @param {number|string} homeworkId
 * @param {Object} options
 * @param {'MANUAL'|'AUTO_5PM'} [options.sendMode='MANUAL']
 * @param {number|null} [options.sentBy=null]
 * @param {string|Date|null} [options.simulatedTime=null]
 * @param {boolean} [options.forceFailWhatsApp=false]
 */
async function sendHomeworkToParents(homeworkId, options = {}) {
  const {
    sendMode = 'MANUAL',
    sentBy = null,
    simulatedTime = null,
    forceFailWhatsApp = false
  } = options;

  // 1. Fetch latest homework from database (never use stale cached copy)
  const homework = db.get(
    `SELECT h.*,
            sub.name as subject_name,
            c.name as class_name,
            sec.name as section_name,
            t.name as teacher_name
     FROM homework h
     JOIN subjects sub ON h.subject_id = sub.id
     JOIN classes c ON h.class_id = c.id
     JOIN sections sec ON h.section_id = sec.id
     JOIN teachers t ON h.teacher_id = t.id
     WHERE h.id = ?`,
    [homeworkId]
  );

  if (!homework) {
    return { success: false, error: 'Homework not found.' };
  }

  // 2. Duplicate Send Protection: never send twice
  if (homework.status === 'SENT') {
    return {
      success: false,
      alreadySent: true,
      error: 'Duplicate send prevented: this homework has already been sent to parents.'
    };
  }

  // 3. Find linked students and parents strictly within class & section
  const targetStudents = db.query(
    `SELECT s.id as student_id,
            s.first_name,
            s.last_name,
            s.parent_id,
            s.parent_mobile,
            p.id as linked_parent_id,
            p.name as parent_name,
            p.mobile as parent_mobile_db,
            p.alternate_phone as parent_alternate_phone,
            p.user_id as parent_user_id
     FROM students s
     LEFT JOIN parents p ON s.parent_id = p.id
     WHERE s.class_id = ? AND s.section_id = ? AND s.status = 'active'`,
    [homework.class_id, homework.section_id]
  );

  if (!targetStudents || targetStudents.length === 0) {
    return {
      success: false,
      error: `No active students found in Class ${homework.class_name} Section ${homework.section_name}.`
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  const deliveryResults = [];

  // 4. Iterate and dispatch WhatsApp / Notification to each student's parent
  for (const student of targetStudents) {
    const studentFullName = `${student.first_name} ${student.last_name}`.trim();
    const studentClassFormatted = `${homework.class_name} Section ${homework.section_name}`;

    const targetMobile =
      student.parent_mobile ||
      student.parent_mobile_db ||
      student.parent_alternate_phone;

    const messageText = formatWhatsAppHomeworkMessage({
      studentName: studentFullName,
      className: studentClassFormatted,
      subjectName: homework.subject_name,
      title: homework.title,
      description: homework.description,
      dueDate: homework.due_date
    });

    if (!targetMobile) {
      // Record failed delivery due to missing contact
      db.run(
        `INSERT INTO homework_deliveries (homework_id, student_id, parent_id, phone_number, delivery_status, channel, error_message, sent_at)
         VALUES (?, ?, ?, 'MISSING', 'FAILED', 'WHATSAPP', 'No valid parent contact number configured', CURRENT_TIMESTAMP)`,
        [homework.id, student.student_id, student.linked_parent_id || null]
      );
      failedCount++;
      deliveryResults.push({ studentId: student.student_id, status: 'FAILED', error: 'No phone number' });
      continue;
    }

    // Dispatch WhatsApp
    const dispatchResult = await sendWhatsAppNotification({
      recipient: targetMobile,
      message: messageText,
      forceFail: forceFailWhatsApp
    });

    if (dispatchResult.success) {
      db.run(
        `INSERT INTO homework_deliveries (homework_id, student_id, parent_id, phone_number, delivery_status, channel, provider_message_id, sent_at)
         VALUES (?, ?, ?, ?, 'SENT', 'WHATSAPP', ?, CURRENT_TIMESTAMP)`,
        [homework.id, student.student_id, student.linked_parent_id || null, targetMobile, dispatchResult.providerMessageId || null]
      );
      sentCount++;
      deliveryResults.push({ studentId: student.student_id, status: 'SENT', messageId: dispatchResult.providerMessageId });

      // Audit individual delivery success
      auditService.log({
        userId: sentBy,
        userRole: sentBy ? 'SUPER_ADMIN' : 'SYSTEM',
        action: 'WHATSAPP_DELIVERY_SUCCEEDED',
        module: 'HOMEWORK',
        recordId: homework.id,
        details: `WhatsApp delivered to ${targetMobile} for student ${studentFullName}`
      });
    } else {
      db.run(
        `INSERT INTO homework_deliveries (homework_id, student_id, parent_id, phone_number, delivery_status, channel, error_message, sent_at)
         VALUES (?, ?, ?, ?, 'FAILED', 'WHATSAPP', ?, CURRENT_TIMESTAMP)`,
        [homework.id, student.student_id, student.linked_parent_id || null, targetMobile, dispatchResult.error || 'Delivery failed']
      );
      failedCount++;
      deliveryResults.push({ studentId: student.student_id, status: 'FAILED', error: dispatchResult.error });

      // Audit individual delivery failure
      auditService.log({
        userId: sentBy,
        userRole: sentBy ? 'SUPER_ADMIN' : 'SYSTEM',
        action: 'WHATSAPP_DELIVERY_FAILED',
        module: 'HOMEWORK',
        recordId: homework.id,
        details: `WhatsApp delivery failed to ${targetMobile}: ${dispatchResult.error}`
      });
    }
  }

  // 5. Update homework status
  if (sentCount === 0 && failedCount > 0) {
    // If every single message failed (e.g. provider downtime), mark as FAILED
    db.run(
      `UPDATE homework SET
        status = 'FAILED',
        send_mode = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sendMode, homework.id]
    );

    auditService.log({
      userId: sentBy,
      userRole: sentBy ? 'SUPER_ADMIN' : 'SYSTEM',
      action: sendMode === 'AUTO_5PM' ? 'SYSTEM_AUTO_SEND_FAILED' : 'ADMIN_SEND_FAILED',
      module: 'HOMEWORK',
      recordId: homework.id,
      details: `Homework sending failed: 0 sent, ${failedCount} failed.`
    });

    return {
      success: false,
      error: 'WhatsApp delivery failed for all parent recipients.',
      sentCount: 0,
      failedCount,
      homeworkId: homework.id
    };
  }

  // At least some sent successfully -> Mark as SENT
  db.run(
    `UPDATE homework SET
      status = 'SENT',
      send_mode = ?,
      sent_at = CURRENT_TIMESTAMP,
      sent_by = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [sendMode, sentBy || null, homework.id]
  );

  // In-app notification creation for parents
  try {
    const notifRes = db.run(
      `INSERT INTO notifications (title, message, type, priority, target_audience, target_class_id, target_section_id, created_by)
       VALUES (?, ?, 'academic', 'medium', 'parents', ?, ?, ?)`,
      [
        `New Homework: ${homework.subject_name}`,
        `Homework assigned: "${homework.title}". Due date: ${homework.due_date}.`,
        homework.class_id,
        homework.section_id,
        sentBy || null
      ]
    );
    const notifId = notifRes.lastInsertRowid;
    for (const st of targetStudents) {
      if (st.parent_user_id) {
        db.run(
          `INSERT OR IGNORE INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`,
          [notifId, st.parent_user_id]
        );
      }
    }
  } catch (err) {
    console.warn('In-app notification creation notice:', err.message);
  }

  // Audit overall send action
  auditService.log({
    userId: sentBy,
    userRole: sentBy ? 'SUPER_ADMIN' : 'SYSTEM',
    action: sendMode === 'AUTO_5PM' ? 'SYSTEM_AUTO_SENT_HOMEWORK' : 'ADMIN_MANUALLY_SENT_HOMEWORK',
    module: 'HOMEWORK',
    recordId: homework.id,
    details: `${sendMode === 'AUTO_5PM' ? 'System automatically sent' : 'Admin manually sent'} homework "${homework.title}" to ${sentCount} parents (${failedCount} failed).`
  });

  return {
    success: true,
    message: `Homework successfully sent to ${sentCount} parents (${failedCount} failed).`,
    sentCount,
    failedCount,
    homeworkId: homework.id
  };
}

/**
 * Scheduler function: finds eligible scheduled homework and auto-sends it at configured time
 * @param {{ simulatedTime?: string|Date|null }} param0
 */
async function processAutoSendHomework({ simulatedTime = null } = {}) {
  const settings = getAutomationSettings();

  // Test A & Requirement 20: If Auto Send is disabled globally, do not process
  if (!settings.auto_send_enabled) {
    return { processedCount: 0, reason: 'Automatic sending is disabled' };
  }

  // Query homework with auto_send_enabled = 1, not already SENT, and not FAILED
  const eligibleHomework = db.query(
    `SELECT * FROM homework
     WHERE auto_send_enabled = 1
       AND status != 'SENT'
       AND status != 'FAILED'
     ORDER BY id ASC`
  );

  let processedCount = 0;
  for (const hw of eligibleHomework) {
    if (isDeadlinePassed(hw.assigned_date, simulatedTime)) {
      // Duplicate send check: re-query current state
      const currentHw = db.get(`SELECT status FROM homework WHERE id = ?`, [hw.id]);
      if (currentHw && currentHw.status === 'SENT') {
        continue;
      }

      await sendHomeworkToParents(hw.id, {
        sendMode: 'AUTO_5PM',
        sentBy: null,
        simulatedTime
      });
      processedCount++;
    }
  }

  return { processedCount };
}

/**
 * Cancel a scheduled homework send (Requirement 12)
 * Reverts status to READY_FOR_REVIEW and marks auto_send_enabled = 0
 * @param {number|string} homeworkId
 * @param {Object} options
 */
function cancelScheduledSend(homeworkId, { userId = null, role = 'SUPER_ADMIN' } = {}) {
  const homework = db.get(`SELECT * FROM homework WHERE id = ?`, [homeworkId]);
  if (!homework) {
    return { success: false, error: 'Homework not found.' };
  }

  if (homework.status === 'SENT') {
    return { success: false, error: 'Homework has already been sent to parents.' };
  }

  db.run(
    `UPDATE homework SET
       auto_send_enabled = 0,
       send_mode = 'MANUAL',
       status = 'READY_FOR_REVIEW',
       scheduled_send_at = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [homeworkId]
  );

  auditService.log({
    userId,
    userRole: role,
    action: 'ADMIN_CANCELLED_SCHEDULED_SEND',
    module: 'HOMEWORK',
    recordId: parseInt(homeworkId, 10),
    details: `Admin cancelled scheduled auto-send for homework "${homework.title}". Manual send is now required.`
  });

  return {
    success: true,
    message: 'Scheduled send cancelled successfully. Manual send is now required.',
    status: 'READY_FOR_REVIEW',
    sendMode: 'MANUAL',
    autoSendEnabled: false
  };
}

/**
 * Dispatches a test message using the configured messaging provider (Requirement 15)
 * @param {{ mobile: string, message?: string, simulatedTime?: string|Date|null }} param0
 */
async function testMessaging({ mobile, message = null, simulatedTime = null }) {
  if (!mobile || !String(mobile).trim()) {
    return { success: false, error: 'Mobile number is required for test message.' };
  }

  const cleanMobile = String(mobile).replace(/[^0-9]/g, '');
  if (cleanMobile.length < 10) {
    return { success: false, error: 'Invalid mobile number. Please enter a valid 10-digit number.' };
  }

  const settings = getAutomationSettings();
  const testContent = message && message.trim()
    ? message.trim()
    : 'School Management App test message from Christus Rex Senior Secondary School.';

  const result = await sendWhatsAppNotification({
    recipient: mobile,
    message: testContent
  });

  return {
    success: result.success,
    provider: result.provider || settings.send_method,
    message: result.success ? 'Test message sent successfully.' : undefined,
    error: result.success ? undefined : (result.error || 'Test message failed.'),
    details: result
  };
}

/**
 * Query automation execution history / send logs (Requirement 16)
 * @param {{ limit?: number }} param0
 */
function getAutomationLogs({ limit = 50 } = {}) {
  const logs = db.query(
    `SELECT h.id as homework_id, h.title, h.assigned_date, h.due_date,
            h.status, h.send_mode, h.auto_send_enabled,
            h.scheduled_send_at, h.sent_at, h.sent_by,
            sub.name as subject_name, c.name as class_name, sec.name as section_name,
            t.name as teacher_name,
            (SELECT COUNT(*) FROM students s WHERE s.class_id = h.class_id AND s.section_id = h.section_id AND s.status = 'active') as target_students_count,
            (SELECT COUNT(*) FROM homework_deliveries hd WHERE hd.homework_id = h.id AND hd.delivery_status = 'SENT') as sent_count,
            (SELECT COUNT(*) FROM homework_deliveries hd WHERE hd.homework_id = h.id AND hd.delivery_status = 'FAILED') as failed_count,
            (SELECT COUNT(*) FROM homework_deliveries hd WHERE hd.homework_id = h.id AND hd.delivery_status = 'PENDING') as pending_count
     FROM homework h
     JOIN subjects sub ON h.subject_id = sub.id
     JOIN teachers t ON h.teacher_id = t.id
     JOIN classes c ON h.class_id = c.id
     JOIN sections sec ON h.section_id = sec.id
     WHERE h.status IN ('SENT', 'SCHEDULED', 'FAILED') OR h.sent_at IS NOT NULL
     ORDER BY COALESCE(h.sent_at, h.scheduled_send_at, h.created_at) DESC
     LIMIT ?`,
    [limit]
  );
  return logs;
}

/**
 * Background scheduler timer interval
 */
let schedulerInterval = null;
function startScheduler() {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(async () => {
    try {
      await processAutoSendHomework();
    } catch (e) {
      console.error('Homework auto-send scheduler error:', e.message);
    }
  }, 60 * 1000); // Check every minute
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

module.exports = {
  getKolkataTime,
  parseTimeString,
  getAutomationSettings,
  updateAutomationSettings,
  isDeadlinePassed,
  isEditLocked,
  validateAutoSendEnable,
  formatWhatsAppHomeworkMessage,
  sendWhatsAppNotification,
  sendHomeworkToParents,
  cancelScheduledSend,
  testMessaging,
  getAutomationLogs,
  processAutoSendHomework,
  startScheduler,
  stopScheduler
};

