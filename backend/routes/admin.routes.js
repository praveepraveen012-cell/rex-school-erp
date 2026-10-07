const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');
const homeworkService = require('../services/homeworkService');

// All admin routes require authentication and strictly SUPER_ADMIN role (Requirement 19)
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Only Super Admin can access homework automation and messaging controls.'
    });
  }
  next();
});

// ----------------------------------------------------------------------------
// GET /api/admin/homework-automation/settings - Fetch current automation settings
// ----------------------------------------------------------------------------
router.get('/homework-automation/settings', (req, res) => {
  const settings = homeworkService.getAutomationSettings();
  return res.json({
    success: true,
    settings
  });
});

// ----------------------------------------------------------------------------
// PUT /api/admin/homework-automation/settings - Update automation settings
// ----------------------------------------------------------------------------
router.put('/homework-automation/settings', (req, res) => {
  const { auto_send_enabled, auto_send_time, timezone, send_method } = req.body;

  const updatedSettings = homeworkService.updateAutomationSettings({
    auto_send_enabled,
    auto_send_time,
    timezone,
    send_method
  });

  auditService.log({
    userId: req.user.id,
    userRole: 'SUPER_ADMIN',
    action: 'ADMIN_UPDATED_AUTOMATION_SETTINGS',
    module: 'HOMEWORK_AUTOMATION',
    details: `Admin updated homework automation: Auto-Send=${updatedSettings.auto_send_enabled ? 'ON' : 'OFF'}, Time=${updatedSettings.auto_send_time_display}, Timezone=${updatedSettings.timezone}`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Homework automation settings saved successfully.',
    settings: updatedSettings
  });
});

// ----------------------------------------------------------------------------
// POST /api/admin/homework/:id/send - Send homework to parents immediately (Send Now)
// ----------------------------------------------------------------------------
router.post('/homework/:id/send', async (req, res) => {
  const { id } = req.params;
  const simulatedTime = req.headers['x-simulated-time'] || req.body.simulatedTime || null;
  const forceFailWhatsApp = Boolean(req.body.forceFailWhatsApp);

  const result = await homeworkService.sendHomeworkToParents(id, {
    sendMode: 'MANUAL',
    sentBy: req.user.id,
    simulatedTime,
    forceFailWhatsApp
  });

  if (!result.success) {
    return res.status(result.alreadySent ? 409 : 500).json({
      success: false,
      error: result.error,
      alreadySent: result.alreadySent || false,
      sentCount: result.sentCount || 0,
      failedCount: result.failedCount || 0
    });
  }

  return res.json({
    success: true,
    message: result.message,
    sentCount: result.sentCount,
    failedCount: result.failedCount,
    status: 'SENT'
  });
});

// ----------------------------------------------------------------------------
// POST /api/admin/homework/:id/cancel-scheduled-send - Cancel scheduled send (Req 12)
// ----------------------------------------------------------------------------
router.post('/homework/:id/cancel-scheduled-send', (req, res) => {
  const { id } = req.params;
  const result = homeworkService.cancelScheduledSend(id, {
    userId: req.user.id,
    role: 'SUPER_ADMIN'
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// ----------------------------------------------------------------------------
// GET /api/admin/homework/:id/delivery-status - View delivery recipient status (Req 13)
// ----------------------------------------------------------------------------
router.get('/homework/:id/delivery-status', (req, res) => {
  const { id } = req.params;
  const homework = db.get(
    `SELECT h.*, sub.name as subject_name, c.name as class_name, sec.name as section_name,
            t.name as teacher_name
     FROM homework h
     JOIN subjects sub ON h.subject_id = sub.id
     JOIN classes c ON h.class_id = c.id
     JOIN sections sec ON h.section_id = sec.id
     JOIN teachers t ON h.teacher_id = t.id
     WHERE h.id = ?`,
    [id]
  );

  if (!homework) {
    return res.status(404).json({ success: false, error: 'Homework not found.' });
  }

  const deliveries = db.query(
    `SELECT hd.id,
            hd.student_id,
            hd.delivery_status,
            hd.recipient_phone,
            hd.sent_at,
            hd.error_message,
            hd.channel,
            s.first_name || ' ' || s.last_name as student_name,
            s.roll_no as student_roll_no,
            COALESCE(p.name, 'Primary Parent') as parent_name
     FROM homework_deliveries hd
     JOIN students s ON hd.student_id = s.id
     LEFT JOIN parents p ON hd.parent_id = p.id
     WHERE hd.homework_id = ?
     ORDER BY hd.sent_at DESC, hd.id DESC`,
    [id]
  );

  const stats = {
    recipients: deliveries.length,
    sent: deliveries.filter(d => d.delivery_status === 'SENT').length,
    failed: deliveries.filter(d => d.delivery_status === 'FAILED').length,
    pending: deliveries.filter(d => d.delivery_status === 'PENDING').length
  };

  return res.json({
    success: true,
    homework,
    stats,
    deliveries
  });
});

// ----------------------------------------------------------------------------
// POST /api/admin/messaging/test - Send test message to mobile (Req 15)
// ----------------------------------------------------------------------------
router.post('/messaging/test', async (req, res) => {
  const { mobile, message } = req.body;
  const simulatedTime = req.headers['x-simulated-time'] || req.body.simulatedTime || null;

  const result = await homeworkService.testMessaging({
    mobile,
    message,
    simulatedTime
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      provider: result.provider
    });
  }

  auditService.log({
    userId: req.user.id,
    userRole: 'SUPER_ADMIN',
    action: 'ADMIN_SENT_TEST_MESSAGE',
    module: 'MESSAGING',
    details: `Admin sent test message to ${mobile} via ${result.provider}`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: result.message,
    provider: result.provider,
    details: result.details
  });
});

// ----------------------------------------------------------------------------
// GET /api/admin/homework-automation/logs - View automation execution logs (Req 16)
// ----------------------------------------------------------------------------
router.get('/homework-automation/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const logs = homeworkService.getAutomationLogs({ limit });

  return res.json({
    success: true,
    count: logs.length,
    logs
  });
});

module.exports = router;
