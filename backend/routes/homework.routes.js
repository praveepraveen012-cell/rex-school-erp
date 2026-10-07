const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');
const homeworkService = require('../services/homeworkService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/homework - Query homework scoped strictly by role
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const role = req.user.role;
  const { classId, sectionId, studentId, status } = req.query;
  const simulatedTime = req.headers['x-simulated-time'] || req.query.simulatedTime || null;

  // 1. Parent Access: strictly scoped to linked child's class & section
  // Parents must NEVER see unpublished / review / scheduled homework (Only SENT or published)
  if (role === 'PARENT') {
    if (!req.parent) {
      return res.status(403).json({ success: false, error: 'Parent profile missing.' });
    }
    let targetStudentId = studentId ? parseInt(studentId, 10) : (req.parent.students[0] ? req.parent.students[0].id : null);
    const child = req.parent.students.find(s => s.id === targetStudentId);

    if (studentId && !child) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to view homework for this student.'
      });
    }

    if (!child) {
      return res.json({ success: true, count: 0, homework: [] });
    }

    const homeworkList = db.query(
      `SELECT h.*, sub.name as subject_name, sub.code as subject_code,
              t.name as teacher_name, c.name as class_name, sec.name as section_name,
              hs.status as submission_status, hs.grade, hs.feedback
       FROM homework h
       JOIN subjects sub ON h.subject_id = sub.id
       JOIN teachers t ON h.teacher_id = t.id
       JOIN classes c ON h.class_id = c.id
       JOIN sections sec ON h.section_id = sec.id
       LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND hs.student_id = ?
       WHERE h.class_id = ? AND h.section_id = ? AND (h.status = 'SENT' OR h.status = 'published')
       ORDER BY h.due_date ASC`,
      [child.id, child.class_id, child.section_id]
    );

    return res.json({
      success: true,
      studentId: child.id,
      studentName: `${child.first_name} ${child.last_name}`,
      count: homeworkList.length,
      homework: homeworkList
    });
  }

  // 2. Teacher Access: scoped to teacher's assignments or created homework
  if (role === 'TEACHER') {
    if (!req.teacher) {
      return res.status(403).json({ success: false, error: 'Teacher profile missing.' });
    }

    const homeworkList = db.query(
      `SELECT h.*, sub.name as subject_name, sub.code as subject_code,
              c.name as class_name, sec.name as section_name,
              (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.status = 'completed') as completed_submissions_count,
              (SELECT COUNT(*) FROM students s WHERE s.class_id = h.class_id AND s.section_id = h.section_id AND s.status = 'active') as total_students_count,
              (SELECT COUNT(*) FROM homework_deliveries hd WHERE hd.homework_id = h.id AND hd.delivery_status = 'SENT') as sent_deliveries_count,
              (SELECT COUNT(*) FROM homework_deliveries hd WHERE hd.homework_id = h.id AND hd.delivery_status = 'FAILED') as failed_deliveries_count
       FROM homework h
       JOIN subjects sub ON h.subject_id = sub.id
       JOIN classes c ON h.class_id = c.id
       JOIN sections sec ON h.section_id = sec.id
       WHERE h.teacher_id = ?
       ORDER BY h.created_at DESC`,
      [req.teacher.id]
    );

    // Compute backend server 5 PM lock flag for each homework
    const formattedList = homeworkList.map(hw => {
      const lockCheck = homeworkService.isEditLocked(hw, simulatedTime);
      return {
        ...hw,
        is_edit_locked: lockCheck.locked,
        lock_reason: lockCheck.locked ? lockCheck.reason : null
      };
    });

    return res.json({
      success: true,
      count: formattedList.length,
      homework: formattedList
    });
  }

  // 3. Super Admin Access: full school-wide visibility with status and delivery counts
  let sql = `
    SELECT h.*, sub.name as subject_name, sub.code as subject_code,
           t.name as teacher_name, c.name as class_name, sec.name as section_name,
           (SELECT COUNT(*) FROM students s WHERE s.class_id = h.class_id AND s.section_id = h.section_id AND s.status = 'active') as target_students_count,
           (SELECT COUNT(*) FROM homework_deliveries hd WHERE hd.homework_id = h.id AND hd.delivery_status = 'SENT') as sent_count,
           (SELECT COUNT(*) FROM homework_deliveries hd WHERE hd.homework_id = h.id AND hd.delivery_status = 'FAILED') as failed_count
    FROM homework h
    JOIN subjects sub ON h.subject_id = sub.id
    JOIN teachers t ON h.teacher_id = t.id
    JOIN classes c ON h.class_id = c.id
    JOIN sections sec ON h.section_id = sec.id
    WHERE 1=1
  `;
  const params = [];

  if (classId) {
    sql += ` AND h.class_id = ?`;
    params.push(classId);
  }
  if (sectionId) {
    sql += ` AND h.section_id = ?`;
    params.push(sectionId);
  }
  if (status) {
    sql += ` AND h.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY h.created_at DESC`;
  const list = db.query(sql, params);

  const formattedList = list.map(hw => {
    const lockCheck = homeworkService.isEditLocked(hw, simulatedTime);
    return {
      ...hw,
      is_edit_locked: lockCheck.locked,
      lock_reason: lockCheck.locked ? lockCheck.reason : null
    };
  });

  return res.json({
    success: true,
    count: formattedList.length,
    homework: formattedList
  });
});

// ----------------------------------------------------------------------------
// POST /api/homework - Create new homework (Teacher or Super Admin only)
// ----------------------------------------------------------------------------
router.post('/', (req, res) => {
  const role = req.user.role;
  if (role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Parents cannot assign homework.' });
  }

  const { classId, sectionId, subjectId, title, description, assignedDate, dueDate, attachmentUrl } = req.body;
  const simulatedTime = req.headers['x-simulated-time'] || req.body.simulatedTime || null;

  if (!classId || !sectionId || !subjectId || !title || !description || !dueDate) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in class, section, subject, title, description, and due date.'
    });
  }

  // Determine teacher
  let teacherId = null;
  if (role === 'TEACHER') {
    teacherId = req.teacher.id;
    const isAssigned = db.get(
      `SELECT id FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?`,
      [teacherId, classId, sectionId, subjectId]
    );
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to teach this subject in this class/section.'
      });
    }
  } else {
    // Admin assigning
    const defaultTeacher = db.get(`SELECT id FROM teachers WHERE status = 'active' LIMIT 1`);
    teacherId = defaultTeacher ? defaultTeacher.id : 1;
  }

  const kolkataNow = homeworkService.getKolkataTime(simulatedTime);
  const assigned = assignedDate || kolkataNow.ymd;

  // New homework starts in READY_FOR_REVIEW status, parents cannot see it until sent
  const result = db.run(
    `INSERT INTO homework (class_id, section_id, subject_id, teacher_id, title, description, attachment_url, assigned_date, due_date, status, send_mode, auto_send_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY_FOR_REVIEW', 'MANUAL', 0)`,
    [classId, sectionId, subjectId, teacherId, title, description, attachmentUrl || null, assigned, dueDate]
  );

  const newHomeworkId = result.lastInsertRowid;

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: role === 'TEACHER' ? 'TEACHER_CREATED_HOMEWORK' : 'ADMIN_CREATED_HOMEWORK',
    module: 'HOMEWORK',
    recordId: newHomeworkId,
    details: `${role === 'TEACHER' ? 'Teacher' : 'Admin'} created homework: "${title}" for Class ${classId}-${sectionId} (Assigned: ${assigned})`,
    ipAddress: req.ip
  });

  return res.status(201).json({
    success: true,
    message: 'Homework created successfully and queued for Super Admin review.',
    homeworkId: newHomeworkId,
    status: 'READY_FOR_REVIEW'
  });
});

// ----------------------------------------------------------------------------
// PUT /api/homework/:id - Update homework (Enforces 5:00 PM Lock for Teachers)
// ----------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  const role = req.user.role;
  if (role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Parents cannot modify or edit homework assignments.' });
  }

  const { id } = req.params;
  const simulatedTime = req.headers['x-simulated-time'] || req.body.simulatedTime || req.query.simulatedTime || null;

  const homework = db.get(`SELECT * FROM homework WHERE id = ?`, [id]);
  if (!homework) {
    return res.status(404).json({ success: false, error: 'Homework not found.' });
  }

  // Teacher role-based check & 5 PM lock enforcement
  if (role === 'TEACHER') {
    if (!req.teacher || homework.teacher_id !== req.teacher.id) {
      return res.status(403).json({ success: false, error: 'You are only authorized to edit your own assigned homework.' });
    }

    // Check if edit is locked (deadline passed or already sent)
    const lockCheck = homeworkService.isEditLocked(homework, simulatedTime);
    if (lockCheck.locked) {
      auditService.log({
        userId: req.user.id,
        userRole: 'TEACHER',
        action: 'TEACHER_ATTEMPTED_EDIT_AFTER_DEADLINE',
        module: 'HOMEWORK',
        recordId: homework.id,
        details: `Teacher attempted edit after deadline on homework #${homework.id}: ${lockCheck.reason}`,
        ipAddress: req.ip
      });

      return res.status(403).json({
        success: false,
        error: lockCheck.reason
      });
    }
  }

  const { title, description, dueDate, status, attachmentUrl } = req.body;

  db.run(
    `UPDATE homework SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      due_date = COALESCE(?, due_date),
      status = COALESCE(?, status),
      attachment_url = COALESCE(?, attachment_url),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title !== undefined ? title : null,
      description !== undefined ? description : null,
      dueDate !== undefined ? dueDate : null,
      status !== undefined ? status : null,
      attachmentUrl !== undefined ? attachmentUrl : null,
      id
    ]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: role === 'TEACHER' ? 'TEACHER_EDITED_HOMEWORK' : 'ADMIN_EDITED_HOMEWORK',
    module: 'HOMEWORK',
    recordId: parseInt(id, 10),
    details: `${role === 'TEACHER' ? 'Teacher' : 'Admin'} updated homework: "${title || homework.title}"`,
    ipAddress: req.ip
  });

  return res.json({ success: true, message: 'Homework updated successfully.' });
});

// ----------------------------------------------------------------------------
// DELETE /api/homework/:id - Delete homework (Enforces 5:00 PM Lock for Teachers)
// ----------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const role = req.user.role;
  if (role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Parents cannot delete homework assignments.' });
  }

  const { id } = req.params;
  const simulatedTime = req.headers['x-simulated-time'] || req.query.simulatedTime || null;

  const homework = db.get(`SELECT * FROM homework WHERE id = ?`, [id]);
  if (!homework) {
    return res.status(404).json({ success: false, error: 'Homework not found.' });
  }

  // Teacher ownership and lock check
  if (role === 'TEACHER') {
    if (!req.teacher || homework.teacher_id !== req.teacher.id) {
      return res.status(403).json({ success: false, error: 'You are only authorized to delete your own assigned homework.' });
    }

    const lockCheck = homeworkService.isEditLocked(homework, simulatedTime);
    if (lockCheck.locked) {
      return res.status(403).json({
        success: false,
        error: lockCheck.reason
      });
    }
  }

  db.run(`DELETE FROM homework_deliveries WHERE homework_id = ?`, [id]);
  db.run(`DELETE FROM homework_submissions WHERE homework_id = ?`, [id]);
  db.run(`DELETE FROM homework WHERE id = ?`, [id]);

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'HOMEWORK_DELETED',
    module: 'HOMEWORK',
    recordId: parseInt(id, 10),
    details: `Deleted homework: "${homework.title}"`,
    ipAddress: req.ip
  });

  return res.json({ success: true, message: 'Homework deleted successfully.' });
});

// ----------------------------------------------------------------------------
// POST /api/homework/:id/send-now - Super Admin manually sends homework immediately
// ----------------------------------------------------------------------------
router.post('/:id/send-now', async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can execute Send Now.' });
  }

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
// POST /api/homework/:id/auto-send - Super Admin toggles 5 PM Auto Send
// ----------------------------------------------------------------------------
router.post('/:id/auto-send', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can configure Auto Send.' });
  }

  const { id } = req.params;
  const { autoSend, enabled } = req.body;
  const simulatedTime = req.headers['x-simulated-time'] || req.body.simulatedTime || null;

  const isEnable = autoSend !== undefined ? Boolean(autoSend) : Boolean(enabled);

  const homework = db.get(`SELECT * FROM homework WHERE id = ?`, [id]);
  if (!homework) {
    return res.status(404).json({ success: false, error: 'Homework not found.' });
  }

  if (homework.status === 'SENT') {
    return res.status(400).json({
      success: false,
      error: 'Homework has already been sent to parents.'
    });
  }

  if (isEnable) {
    // If enabling, check if 5 PM has already passed
    const validation = homeworkService.validateAutoSendEnable(homework.assigned_date, simulatedTime);
    if (!validation.allowed) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    db.run(
      `UPDATE homework SET
        auto_send_enabled = 1,
        send_mode = 'AUTO_5PM',
        status = 'SCHEDULED',
        scheduled_send_at = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [`${homework.assigned_date} 17:00:00`, id]
    );

    auditService.log({
      userId: req.user.id,
      userRole: 'SUPER_ADMIN',
      action: 'ADMIN_ENABLED_AUTO_SEND',
      module: 'HOMEWORK',
      recordId: homework.id,
      details: `Admin enabled Auto Send at 5:00 PM for homework "${homework.title}"`,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Auto Send at 5:00 PM enabled.',
      autoSendEnabled: true,
      sendMode: 'AUTO_5PM',
      status: 'SCHEDULED'
    });
  } else {
    // Disabling auto-send
    const revertStatus = homework.status === 'SCHEDULED' ? 'READY_FOR_REVIEW' : homework.status;
    db.run(
      `UPDATE homework SET
        auto_send_enabled = 0,
        send_mode = 'MANUAL',
        status = ?,
        scheduled_send_at = NULL,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [revertStatus, id]
    );

    auditService.log({
      userId: req.user.id,
      userRole: 'SUPER_ADMIN',
      action: 'ADMIN_DISABLED_AUTO_SEND',
      module: 'HOMEWORK',
      recordId: homework.id,
      details: `Admin disabled Auto Send for homework "${homework.title}"`,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Auto Send disabled.',
      autoSendEnabled: false,
      sendMode: 'MANUAL',
      status: revertStatus
    });
  }
});

// ----------------------------------------------------------------------------
// GET /api/homework/:id/deliveries - Super Admin delivery logs & failure review
// ----------------------------------------------------------------------------
router.get('/:id/deliveries', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can view homework delivery logs.' });
  }

  const { id } = req.params;
  const homework = db.get(
    `SELECT h.*, sub.name as subject_name, c.name as class_name, sec.name as section_name
     FROM homework h
     JOIN subjects sub ON h.subject_id = sub.id
     JOIN classes c ON h.class_id = c.id
     JOIN sections sec ON h.section_id = sec.id
     WHERE h.id = ?`,
    [id]
  );

  if (!homework) {
    return res.status(404).json({ success: false, error: 'Homework not found.' });
  }

  const deliveries = db.query(
    `SELECT hd.*,
            s.first_name as student_first_name,
            s.last_name as student_last_name,
            s.roll_no as student_roll_no,
            p.name as parent_name
     FROM homework_deliveries hd
     JOIN students s ON hd.student_id = s.id
     LEFT JOIN parents p ON hd.parent_id = p.id
     WHERE hd.homework_id = ?
     ORDER BY hd.sent_at DESC, hd.id DESC`,
    [id]
  );

  const stats = {
    total: deliveries.length,
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
// POST /api/homework/scheduler/run - Trigger scheduler check
// ----------------------------------------------------------------------------
router.post('/scheduler/run', async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Unauthorized.' });
  }

  const simulatedTime = req.headers['x-simulated-time'] || req.body.simulatedTime || null;
  const result = await homeworkService.processAutoSendHomework({ simulatedTime });

  return res.json({
    success: true,
    processedCount: result.processedCount
  });
});

// ----------------------------------------------------------------------------
// POST /api/homework/:id/toggle-submit - Mark homework completed (Parent/Student)
// ----------------------------------------------------------------------------
router.post('/:id/toggle-submit', (req, res) => {
  const { id } = req.params;
  const { studentId, status } = req.body;

  let targetStudentId = studentId;
  if (req.user.role === 'PARENT') {
    const child = req.parent.students.find(s => s.id === parseInt(studentId, 10)) || req.parent.students[0];
    if (!child) {
      return res.status(403).json({ success: false, error: 'Unauthorized child record.' });
    }
    targetStudentId = child.id;
  }

  if (!targetStudentId) {
    return res.status(400).json({ success: false, error: 'Student ID required.' });
  }

  const newStatus = status || 'completed';

  db.run(
    `INSERT INTO homework_submissions (homework_id, student_id, status, submitted_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(homework_id, student_id) DO UPDATE SET
       status = excluded.status,
       submitted_at = CURRENT_TIMESTAMP`,
    [id, targetStudentId, newStatus]
  );

  return res.json({
    success: true,
    message: `Homework marked as ${newStatus}.`,
    homeworkId: parseInt(id, 10),
    status: newStatus
  });
});

// ----------------------------------------------------------------------------
// POST /api/homework/:id/send - Alias for Super Admin send
// ----------------------------------------------------------------------------
router.post('/:id/send', async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can execute Send.' });
  }

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
// POST /api/homework/:id/cancel-scheduled-send - Cancel scheduled send (Req 12)
// ----------------------------------------------------------------------------
router.post('/:id/cancel-scheduled-send', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can cancel scheduled sends.' });
  }

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
// GET /api/homework/:id/delivery-status - Delivery status details (Req 13)
// ----------------------------------------------------------------------------
router.get('/:id/delivery-status', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can view delivery status.' });
  }

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
// Automation settings & logs endpoints on /api/homework
// ----------------------------------------------------------------------------
router.get('/automation/settings', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Unauthorized.' });
  }
  return res.json({
    success: true,
    settings: homeworkService.getAutomationSettings()
  });
});

router.put('/automation/settings', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Unauthorized.' });
  }
  const updated = homeworkService.updateAutomationSettings(req.body);
  return res.json({
    success: true,
    message: 'Settings updated successfully.',
    settings: updated
  });
});

router.post('/messaging/test', async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Unauthorized.' });
  }
  const result = await homeworkService.testMessaging(req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

router.get('/automation/logs', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Unauthorized.' });
  }
  const limit = parseInt(req.query.limit, 10) || 50;
  return res.json({
    success: true,
    logs: homeworkService.getAutomationLogs({ limit })
  });
});

module.exports = router;
