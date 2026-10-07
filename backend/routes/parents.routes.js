const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/parents - List parents (Admin) or self (Parent)
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  if (req.user.role === 'PARENT') {
    if (!req.parent) {
      return res.status(404).json({ success: false, error: 'Parent profile not found.' });
    }
    return res.json({ success: true, count: 1, parents: [req.parent] });
  }

  // Super Admin view
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Access denied: Super Admin authorization required.' });
  }

  const parents = db.query(
    `SELECT p.*, u.status as user_status, u.last_login_at
     FROM parents p
     LEFT JOIN users u ON p.user_id = u.id
     ORDER BY p.name ASC`
  );

  // Attach linked children to each parent
  for (const p of parents) {
    p.students = db.query(
      `SELECT s.*, c.name as class_name, sec.name as section_name
       FROM students s
       JOIN student_parents sp ON s.id = sp.student_id
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       WHERE sp.parent_id = ?
       ORDER BY s.roll_no ASC`,
      [p.id]
    );
  }

  return res.json({ success: true, count: parents.length, parents });
});

// ----------------------------------------------------------------------------
// POST /api/parents - Add new parent record (Admin)
// ----------------------------------------------------------------------------
router.post('/', requireSuperAdmin, (req, res) => {
  const { name, mobile, email, address, occupation, alternatePhone, initialPassword, studentIds } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ success: false, error: 'Parent name and mobile number are required.' });
  }

  const cleanMobile = String(mobile).trim();
  const existing = db.get(`SELECT id FROM parents WHERE mobile = ?`, [cleanMobile]);
  if (existing) {
    return res.status(400).json({ success: false, error: `Parent with mobile ${cleanMobile} already exists.` });
  }

  // Create user
  const passwordHash = bcrypt.hashSync(initialPassword || 'ParentPassword123!', 10);
  const userRes = db.run(
    `INSERT INTO users (username, email, mobile, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'PARENT', 'active')`,
    [email || `parent_${cleanMobile}`, email || null, cleanMobile, passwordHash]
  );

  const pRes = db.run(
    `INSERT INTO parents (user_id, name, mobile, email, address, occupation, alternate_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userRes.lastInsertRowid, name.trim(), cleanMobile, email || '', address || '', occupation || '', alternatePhone || '']
  );

  const parentId = pRes.lastInsertRowid;

  // Link students if provided
  if (Array.isArray(studentIds)) {
    for (const sid of studentIds) {
      db.run(
        `INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, 'Parent', 1)`,
        [sid, parentId]
      );
      db.run(`UPDATE students SET parent_id = ? WHERE id = ?`, [parentId, sid]);
    }
  }

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'PARENT_CREATED',
    module: 'PARENTS',
    recordId: parentId,
    details: `Created parent: ${name}`,
    ipAddress: req.ip
  });

  return res.status(201).json({ success: true, message: 'Parent record created.', parentId });
});

module.exports = router;
