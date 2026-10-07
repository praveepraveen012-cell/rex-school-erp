const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/classes - List all classes with sections
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const classes = db.query(`SELECT * FROM classes ORDER BY grade_level ASC, name ASC`);

  for (const c of classes) {
    c.sections = db.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM students st WHERE st.class_id = s.class_id AND st.section_id = s.id AND st.status = 'active') as student_count
       FROM sections s
       WHERE s.class_id = ?
       ORDER BY s.name ASC`,
      [c.id]
    );
  }

  return res.json({ success: true, count: classes.length, classes });
});

// ----------------------------------------------------------------------------
// POST /api/classes - Create new class (Admin)
// ----------------------------------------------------------------------------
router.post('/', requireSuperAdmin, (req, res) => {
  const { name, gradeLevel, sections } = req.body;

  if (!name || gradeLevel === undefined) {
    return res.status(400).json({ success: false, error: 'Class name and grade level are required.' });
  }

  const resCls = db.run(`INSERT INTO classes (name, grade_level) VALUES (?, ?)`, [name.trim(), gradeLevel]);
  const classId = resCls.lastInsertRowid;

  if (Array.isArray(sections)) {
    for (const sec of sections) {
      if (sec) {
        db.run(`INSERT INTO sections (class_id, name) VALUES (?, ?)`, [classId, String(sec).trim()]);
      }
    }
  }

  return res.status(201).json({ success: true, message: 'Class created successfully.', classId });
});

// ----------------------------------------------------------------------------
// GET /api/classes/:id/sections - Get sections for a class
// ----------------------------------------------------------------------------
router.get('/:id/sections', (req, res) => {
  const sections = db.query(
    `SELECT s.*,
            (SELECT COUNT(*) FROM students st WHERE st.class_id = s.class_id AND st.section_id = s.id AND st.status = 'active') as student_count
     FROM sections s
     WHERE s.class_id = ?
     ORDER BY s.name ASC`,
    [req.params.id]
  );

  return res.json({ success: true, count: sections.length, sections });
});

// ----------------------------------------------------------------------------
// POST /api/classes/:id/sections - Add section to class (Admin)
// ----------------------------------------------------------------------------
router.post('/:id/sections', requireSuperAdmin, (req, res) => {
  const { name, roomNumber, maxCapacity } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Section name is required.' });
  }

  const resSec = db.run(
    `INSERT INTO sections (class_id, name, room_number, max_capacity) VALUES (?, ?, ?, ?)`,
    [req.params.id, name.trim(), roomNumber || '', maxCapacity || 40]
  );

  return res.status(201).json({ success: true, message: 'Section added successfully.', sectionId: resSec.lastInsertRowid });
});

module.exports = router;
