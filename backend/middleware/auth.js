const jwt = require('jsonwebtoken');
const db = require('../database/db');
const config = require('../config/env');

/**
 * Authentication Middleware: validates JWT, loads user, checks status & attaches role profiles
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required. Please log in.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.get(
      `SELECT id, username, email, mobile, role, status FROM users WHERE id = ?`,
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been disabled. Please contact the school administrator.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account is inactive. Please contact the school administrator.'
      });
    }

    // Attach basic user
    req.user = user;

    // Load Teacher profile if applicable
    if (user.role === 'TEACHER') {
      const teacher = db.get(`SELECT * FROM teachers WHERE user_id = ?`, [user.id]);
      if (teacher) {
        // Fetch assigned classes
        const assignments = db.query(
          `SELECT ta.*, c.name as class_name, s.name as section_name, sub.name as subject_name, sub.code as subject_code
           FROM teacher_assignments ta
           JOIN classes c ON ta.class_id = c.id
           JOIN sections s ON ta.section_id = s.id
           JOIN subjects sub ON ta.subject_id = sub.id
           WHERE ta.teacher_id = ?`,
          [teacher.id]
        );
        teacher.assignments = assignments;
        req.teacher = teacher;
      }
    }

    // Load Parent profile if applicable
    if (user.role === 'PARENT') {
      const parent = db.get(`SELECT * FROM parents WHERE user_id = ?`, [user.id]);
      if (parent) {
        const cleanDigits = String(parent.mobile || user.mobile || '').replace(/\D/g, '');
        const normMobile = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

        // Fetch ALL linked students across relationships and direct parent mobile
        const linkedStudents = db.query(
          `SELECT s.*, c.name as class_name, sec.name as section_name
           FROM students s
           JOIN classes c ON s.class_id = c.id
           JOIN sections sec ON s.section_id = sec.id
           WHERE s.id IN (
             SELECT student_id FROM student_parents WHERE parent_id = ?
             UNION
             SELECT id FROM students WHERE parent_id = ?
             UNION
             SELECT id FROM students WHERE REPLACE(REPLACE(REPLACE(parent_mobile, '+91', ''), ' ', ''), '-', '') LIKE '%' || ?
           )
           AND s.status = 'active'
           ORDER BY s.roll_no ASC`,
          [parent.id, parent.id, normMobile]
        );
        parent.students = linkedStudents;
        req.parent = parent;
      }
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.'
    });
  }
}

module.exports = authenticate;
