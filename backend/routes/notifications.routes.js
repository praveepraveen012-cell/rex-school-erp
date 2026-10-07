const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/notifications - List notifications for current user with read status
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  let audienceFilter = `n.target_audience IN ('all')`;
  const params = [userId];

  if (role === 'SUPER_ADMIN') {
    // Admin sees all notifications
    audienceFilter = `1=1`;
  } else if (role === 'TEACHER') {
    audienceFilter = `n.target_audience IN ('all', 'teachers')`;
    if (req.teacher && req.teacher.assignments && req.teacher.assignments.length > 0) {
      const classIds = [...new Set(req.teacher.assignments.map(a => a.class_id))];
      audienceFilter += ` OR (n.target_audience = 'class' AND n.target_class_id IN (${classIds.map(() => '?').join(',')}))`;
      params.push(...classIds);
    }
  } else if (role === 'PARENT') {
    audienceFilter = `n.target_audience IN ('all', 'parents')`;
    if (req.parent && req.parent.students && req.parent.students.length > 0) {
      const classIds = req.parent.students.map(s => s.class_id);
      audienceFilter += ` OR (n.target_audience = 'class' AND n.target_class_id IN (${classIds.map(() => '?').join(',')}))`;
      params.push(...classIds);
    }
  }

  const notifications = db.query(
    `SELECT n.*,
            COALESCE(nr.is_read, 0) as is_read,
            nr.read_at,
            c.name as class_name,
            sec.name as section_name
     FROM notifications n
     LEFT JOIN notification_recipients nr ON n.id = nr.notification_id AND nr.user_id = ?
     LEFT JOIN classes c ON n.target_class_id = c.id
     LEFT JOIN sections sec ON n.target_section_id = sec.id
     WHERE n.status = 'active' AND (${audienceFilter})
     ORDER BY nr.is_read ASC, n.publish_date DESC`,
    params
  );

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return res.json({
    success: true,
    count: notifications.length,
    unreadCount,
    notifications
  });
});

// ----------------------------------------------------------------------------
// GET /api/notifications/unread-count - Fast badge counter
// ----------------------------------------------------------------------------
router.get('/unread-count', (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  let audienceFilter = `n.target_audience IN ('all')`;
  const params = [userId];

  if (role === 'SUPER_ADMIN') {
    audienceFilter = `1=1`;
  } else if (role === 'TEACHER') {
    audienceFilter = `n.target_audience IN ('all', 'teachers')`;
  } else if (role === 'PARENT') {
    audienceFilter = `n.target_audience IN ('all', 'parents')`;
  }

  const result = db.get(
    `SELECT COUNT(*) as unread
     FROM notifications n
     LEFT JOIN notification_recipients nr ON n.id = nr.notification_id AND nr.user_id = ?
     WHERE n.status = 'active' AND (${audienceFilter}) AND COALESCE(nr.is_read, 0) = 0`,
    params
  );

  return res.json({
    success: true,
    unreadCount: result ? result.unread : 0
  });
});

// ----------------------------------------------------------------------------
// PUT /api/notifications/:id/read - Mark notification as read
// ----------------------------------------------------------------------------
router.put('/:id/read', (req, res) => {
  const notifId = req.params.id;
  const userId = req.user.id;

  db.run(
    `INSERT INTO notification_recipients (notification_id, user_id, is_read, read_at)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(notification_id, user_id) DO UPDATE SET
       is_read = 1,
       read_at = CURRENT_TIMESTAMP`,
    [notifId, userId]
  );

  return res.json({ success: true, message: 'Notification marked as read.' });
});

// ----------------------------------------------------------------------------
// PUT /api/notifications/read-all - Mark all notifications as read for current user
// ----------------------------------------------------------------------------
router.put('/read-all', (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  let audienceFilter = `target_audience IN ('all')`;
  if (role === 'SUPER_ADMIN') audienceFilter = `1=1`;
  else if (role === 'TEACHER') audienceFilter = `target_audience IN ('all', 'teachers')`;
  else if (role === 'PARENT') audienceFilter = `target_audience IN ('all', 'parents')`;

  const activeNotifs = db.query(
    `SELECT id FROM notifications WHERE status = 'active' AND (${audienceFilter})`
  );

  db.transaction(() => {
    for (const n of activeNotifs) {
      db.run(
        `INSERT INTO notification_recipients (notification_id, user_id, is_read, read_at)
         VALUES (?, ?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(notification_id, user_id) DO UPDATE SET
           is_read = 1,
           read_at = CURRENT_TIMESTAMP`,
        [n.id, userId]
      );
    }
  });

  return res.json({ success: true, message: 'All notifications marked as read.' });
});

// ----------------------------------------------------------------------------
// POST /api/notifications - Create notification (Super Admin only)
// ----------------------------------------------------------------------------
router.post('/', requireSuperAdmin, (req, res) => {
  const {
    title, message, type, priority, targetAudience,
    targetClassId, targetSectionId, expiryDate
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({
      success: false,
      error: 'Notification title and message are required.'
    });
  }

  const resNotif = db.run(
    `INSERT INTO notifications (
      title, message, type, priority, target_audience,
      target_class_id, target_section_id, expiry_date, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [
      title.trim(), message.trim(), type || 'general', priority || 'medium',
      targetAudience || 'all', targetClassId || null, targetSectionId || null,
      expiryDate || null, req.user.id
    ]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'NOTIFICATION_CREATED',
    module: 'NOTIFICATIONS',
    recordId: resNotif.lastInsertRowid,
    details: `Created ${priority || 'medium'} priority notification: ${title}`,
    ipAddress: req.ip
  });

  return res.status(201).json({
    success: true,
    message: 'Notification published successfully.',
    notificationId: resNotif.lastInsertRowid
  });
});

module.exports = router;
