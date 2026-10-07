const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/events - List events filtered by role and audience permissions
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  // 1. Parent: view 'all', 'parents', or events for linked child's class
  if (req.user.role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      const events = db.query(
        `SELECT * FROM events WHERE is_published = 1 AND target_audience IN ('all', 'parents') ORDER BY event_date ASC`
      );
      return res.json({ success: true, count: events.length, events });
    }

    const childClassIds = req.parent.students.map(s => s.class_id);
    const placeholders = childClassIds.map(() => '?').join(',');

    const events = db.query(
      `SELECT e.*, c.name as class_name, s.name as section_name
       FROM events e
       LEFT JOIN classes c ON e.target_class_id = c.id
       LEFT JOIN sections s ON e.target_section_id = s.id
       WHERE e.is_published = 1 AND (
         e.target_audience IN ('all', 'parents')
         OR (e.target_audience = 'class' AND e.target_class_id IN (${placeholders}))
       )
       ORDER BY e.event_date ASC`,
      [...childClassIds]
    );

    return res.json({ success: true, count: events.length, events });
  }

  // 2. Teacher: view 'all', 'teachers', or events for assigned classes
  if (req.user.role === 'TEACHER') {
    const assignedClassIds = (req.teacher && req.teacher.assignments)
      ? [...new Set(req.teacher.assignments.map(a => a.class_id))]
      : [];

    let events;
    if (assignedClassIds.length > 0) {
      const placeholders = assignedClassIds.map(() => '?').join(',');
      events = db.query(
        `SELECT e.*, c.name as class_name, s.name as section_name
         FROM events e
         LEFT JOIN classes c ON e.target_class_id = c.id
         LEFT JOIN sections s ON e.target_section_id = s.id
         WHERE e.is_published = 1 AND (
           e.target_audience IN ('all', 'teachers')
           OR (e.target_audience = 'class' AND e.target_class_id IN (${placeholders}))
         )
         ORDER BY e.event_date ASC`,
        [...assignedClassIds]
      );
    } else {
      events = db.query(
        `SELECT * FROM events WHERE is_published = 1 AND target_audience IN ('all', 'teachers') ORDER BY event_date ASC`
      );
    }

    return res.json({ success: true, count: events.length, events });
  }

  // 3. Super Admin: view all events
  const events = db.query(
    `SELECT e.*, c.name as class_name, s.name as section_name, u.username as creator_name
     FROM events e
     LEFT JOIN classes c ON e.target_class_id = c.id
     LEFT JOIN sections s ON e.target_section_id = s.id
     LEFT JOIN users u ON e.created_by = u.id
     ORDER BY e.event_date ASC`
  );

  return res.json({ success: true, count: events.length, events });
});

// ----------------------------------------------------------------------------
// POST /api/events - Create new event (Super Admin only)
// ----------------------------------------------------------------------------
router.post('/', requireSuperAdmin, (req, res) => {
  const {
    title, description, eventDate, eventTime, location,
    bannerImage, targetAudience, targetClassId, targetSectionId, isPublished
  } = req.body;

  if (!title || !eventDate) {
    return res.status(400).json({
      success: false,
      error: 'Event title and date are required.'
    });
  }

  const resEvent = db.run(
    `INSERT INTO events (
      title, description, event_date, event_time, location,
      banner_image, target_audience, target_class_id, target_section_id,
      is_published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title.trim(), description || '', eventDate, eventTime || '', location || '',
      bannerImage || '', targetAudience || 'all', targetClassId || null, targetSectionId || null,
      isPublished !== undefined ? (isPublished ? 1 : 0) : 1, req.user.id
    ]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'EVENT_CREATED',
    module: 'EVENTS',
    recordId: resEvent.lastInsertRowid,
    details: `Created event: ${title}`,
    ipAddress: req.ip
  });

  return res.status(201).json({
    success: true,
    message: 'Event created successfully.',
    eventId: resEvent.lastInsertRowid
  });
});

// ----------------------------------------------------------------------------
// PUT /api/events/:id - Update event (Super Admin only)
// ----------------------------------------------------------------------------
router.put('/:id', requireSuperAdmin, (req, res) => {
  const event = db.get(`SELECT * FROM events WHERE id = ?`, [req.params.id]);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }

  const {
    title, description, eventDate, eventTime, location,
    bannerImage, targetAudience, targetClassId, targetSectionId, isPublished
  } = req.body;

  db.run(
    `UPDATE events SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      event_date = COALESCE(?, event_date),
      event_time = COALESCE(?, event_time),
      location = COALESCE(?, location),
      banner_image = COALESCE(?, banner_image),
      target_audience = COALESCE(?, target_audience),
      target_class_id = ?,
      target_section_id = ?,
      is_published = COALESCE(?, is_published),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title, description, eventDate, eventTime, location,
      bannerImage, targetAudience, targetClassId !== undefined ? targetClassId : event.target_class_id,
      targetSectionId !== undefined ? targetSectionId : event.target_section_id,
      isPublished !== undefined ? (isPublished ? 1 : 0) : event.is_published,
      event.id
    ]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'EVENT_UPDATED',
    module: 'EVENTS',
    recordId: event.id,
    details: `Updated event: ${title || event.title}`,
    ipAddress: req.ip
  });

  return res.json({ success: true, message: 'Event updated successfully.' });
});

// ----------------------------------------------------------------------------
// DELETE /api/events/:id - Delete event (Super Admin only)
// ----------------------------------------------------------------------------
router.delete('/:id', requireSuperAdmin, (req, res) => {
  const event = db.get(`SELECT * FROM events WHERE id = ?`, [req.params.id]);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }

  db.run(`DELETE FROM events WHERE id = ?`, [event.id]);

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'EVENT_DELETED',
    module: 'EVENTS',
    recordId: event.id,
    details: `Deleted event: ${event.title}`,
    ipAddress: req.ip
  });

  return res.json({ success: true, message: 'Event deleted successfully.' });
});

module.exports = router;
