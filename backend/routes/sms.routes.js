const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const smsService = require('../services/smsService');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/sms/logs - View SMS dispatch logs (Admin only)
// ----------------------------------------------------------------------------
router.get('/logs', requireRole('SUPER_ADMIN'), (req, res) => {
  const { limit = 50, offset = 0, type, recipient } = req.query;
  const logs = smsService.getLogs({
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    type,
    recipient
  });

  return res.json({
    success: true,
    count: logs.length,
    logs
  });
});

// ----------------------------------------------------------------------------
// GET /api/sms/stats - View SMS summary metrics (Admin only)
// ----------------------------------------------------------------------------
router.get('/stats', requireRole('SUPER_ADMIN'), (req, res) => {
  const stats = smsService.getStats();
  return res.json({
    success: true,
    stats
  });
});

// ----------------------------------------------------------------------------
// POST /api/sms/test - Test dispatch an SMS (Admin only)
// ----------------------------------------------------------------------------
router.post('/test', requireRole('SUPER_ADMIN'), async (req, res) => {
  const { recipient, message, type } = req.body;

  if (!recipient || !message) {
    return res.status(400).json({
      success: false,
      error: 'Recipient mobile number and message text are required.'
    });
  }

  const result = await smsService.sendDirectSms({
    recipient,
    message,
    type: type || 'GENERAL'
  });

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'SMS_TEST_SENT',
    module: 'SMS',
    details: `Test SMS to ${recipient} (Type: ${type || 'GENERAL'})`,
    ipAddress: req.ip
  });

  return res.json({
    success: result.success,
    message: result.success ? 'Automated test SMS dispatched successfully.' : 'Failed to dispatch SMS.',
    result
  });
});

module.exports = router;
