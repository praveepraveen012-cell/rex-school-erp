const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/teachers - List all teachers (Admin) or self (Teacher)
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  // If teacher, return only own record
  if (req.user.role === 'TEACHER') {
    if (!req.teacher) {
      return res.status(404).json({ success: false, error: 'Teacher profile not found.' });
    }
    return res.json({ success: true, count: 1, teachers: [req.teacher] });
  }

  // Super Admin view
  const teachers = db.query(
    `SELECT t.*, u.status as user_status, u.last_login_at
     FROM teachers t
     LEFT JOIN users u ON t.user_id = u.id
     ORDER BY t.name ASC`
  );

  // Attach assignments to each teacher
  for (const t of teachers) {
    t.assignments = db.query(
      `SELECT ta.*, c.name as class_name, s.name as section_name, sub.name as subject_name, sub.code as subject_code
       FROM teacher_assignments ta
       JOIN classes c ON ta.class_id = c.id
       JOIN sections s ON ta.section_id = s.id
       JOIN subjects sub ON ta.subject_id = sub.id
       WHERE ta.teacher_id = ?`,
      [t.id]
    );
  }

  return res.json({ success: true, count: teachers.length, teachers });
});

// ----------------------------------------------------------------------------
// GET /api/teachers/:id - Get teacher by ID
// ----------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const teacherId = parseInt(req.params.id, 10);

  // Teacher isolation: can only view own profile
  if (req.user.role === 'TEACHER' && req.teacher.id !== teacherId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. You can only view your own teacher profile.'
    });
  }

  const teacher = db.get(
    `SELECT t.*, u.status as user_status, u.last_login_at
     FROM teachers t
     LEFT JOIN users u ON t.user_id = u.id
     WHERE t.id = ?`,
    [teacherId]
  );

  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Teacher not found.' });
  }

  teacher.assignments = db.query(
    `SELECT ta.*, c.name as class_name, s.name as section_name, sub.name as subject_name, sub.code as subject_code
     FROM teacher_assignments ta
     JOIN classes c ON ta.class_id = c.id
     JOIN sections s ON ta.section_id = s.id
     JOIN subjects sub ON ta.subject_id = sub.id
     WHERE ta.teacher_id = ?`,
    [teacher.id]
  );

  return res.json({ success: true, teacher });
});

// ----------------------------------------------------------------------------
// POST /api/teachers - Create new teacher (Super Admin only)
// ----------------------------------------------------------------------------
router.post('/', requireSuperAdmin, (req, res) => {
  const {
    employeeId, name, mobile, email, gender, dob, qualification,
    experience, department, joiningDate, initialPassword, assignments
  } = req.body;

  if (!employeeId || !name || !mobile || !email) {
    return res.status(400).json({
      success: false,
      error: 'Employee ID, Name, Mobile Number, and Email are required.'
    });
  }

  const cleanMobile = String(mobile).trim();
  const cleanEmpId = String(employeeId).trim().toUpperCase();
  const cleanEmail = String(email).trim().toLowerCase();

  // Unique checks
  const existingMobile = db.get(`SELECT id FROM teachers WHERE mobile = ?`, [cleanMobile]);
  if (existingMobile) {
    return res.status(400).json({
      success: false,
      error: `A teacher with mobile number ${cleanMobile} already exists.`
    });
  }

  const existingEmp = db.get(`SELECT id FROM teachers WHERE employee_id = ?`, [cleanEmpId]);
  if (existingEmp) {
    return res.status(400).json({
      success: false,
      error: `A teacher with Employee ID ${cleanEmpId} already exists.`
    });
  }

  // Create User account for Teacher
  const passwordHash = bcrypt.hashSync(initialPassword || 'Teacher123!', 10);
  const userRes = db.run(
    `INSERT INTO users (username, email, mobile, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'TEACHER', 'active')`,
    [cleanEmail, cleanEmail, cleanMobile, passwordHash]
  );

  const userId = userRes.lastInsertRowid;

  // Insert Teacher profile
  const teacherRes = db.run(
    `INSERT INTO teachers (
      user_id, employee_id, name, mobile, email, gender, dob,
      qualification, experience, department, status, joining_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [
      userId, cleanEmpId, name.trim(), cleanMobile, cleanEmail, gender || 'other', dob || null,
      qualification || '', experience || '', department || 'Academics', joiningDate || DATE('now')
    ]
  );

  const teacherId = teacherRes.lastInsertRowid;

  // Create assignments if provided
  if (Array.isArray(assignments)) {
    for (const a of assignments) {
      if (a.subjectId && a.classId && a.sectionId) {
        db.run(
          `INSERT OR IGNORE INTO teacher_assignments (teacher_id, subject_id, class_id, section_id)
           VALUES (?, ?, ?, ?)`,
          [teacherId, a.subjectId, a.classId, a.sectionId]
        );
      }
    }
  }

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'TEACHER_CREATED',
    module: 'TEACHERS',
    recordId: teacherId,
    details: `Created teacher ${name} (ID: ${cleanEmpId})`,
    ipAddress: req.ip
  });

  return res.status(201).json({
    success: true,
    message: 'Teacher profile created successfully.',
    teacherId
  });
});

// ----------------------------------------------------------------------------
// PUT /api/teachers/:id - Update teacher details (Super Admin only)
// ----------------------------------------------------------------------------
router.put('/:id', requireSuperAdmin, (req, res) => {
  const teacher = db.get(`SELECT * FROM teachers WHERE id = ?`, [req.params.id]);
  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Teacher not found.' });
  }

  const {
    name, mobile, email, gender, dob, qualification,
    experience, department, status, joiningDate
  } = req.body;

  db.run(
    `UPDATE teachers SET
      name = COALESCE(?, name),
      mobile = COALESCE(?, mobile),
      email = COALESCE(?, email),
      gender = COALESCE(?, gender),
      dob = COALESCE(?, dob),
      qualification = COALESCE(?, qualification),
      experience = COALESCE(?, experience),
      department = COALESCE(?, department),
      status = COALESCE(?, status),
      joining_date = COALESCE(?, joining_date),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      name, mobile, email, gender, dob, qualification,
      experience, department, status, joiningDate, teacher.id
    ]
  );

  // Sync user status and mobile if updated
  if (status || mobile || email) {
    db.run(
      `UPDATE users SET
        status = COALESCE(?, status),
        mobile = COALESCE(?, mobile),
        email = COALESCE(?, email),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, mobile, email, teacher.user_id]
    );
  }

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'TEACHER_UPDATED',
    module: 'TEACHERS',
    recordId: teacher.id,
    details: `Updated teacher ${teacher.name} (status: ${status || teacher.status})`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Teacher details updated successfully.'
  });
});

// ----------------------------------------------------------------------------
// POST /api/teachers/:id/assignments - Assign classes/sections/subjects (Admin)
// ----------------------------------------------------------------------------
router.post('/:id/assignments', requireSuperAdmin, (req, res) => {
  const teacher = db.get(`SELECT * FROM teachers WHERE id = ?`, [req.params.id]);
  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Teacher not found.' });
  }

  const { subjectId, classId, sectionId } = req.body;
  if (!subjectId || !classId || !sectionId) {
    return res.status(400).json({
      success: false,
      error: 'Subject ID, Class ID, and Section ID are all required for assignment.'
    });
  }

  const resAssign = db.run(
    `INSERT OR IGNORE INTO teacher_assignments (teacher_id, subject_id, class_id, section_id)
     VALUES (?, ?, ?, ?)`,
    [teacher.id, subjectId, classId, sectionId]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'TEACHER_ASSIGNMENT_CREATED',
    module: 'TEACHERS',
    recordId: teacher.id,
    details: `Assigned Subject ${subjectId} in Class ${classId}, Sec ${sectionId} to ${teacher.name}`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Class and subject assigned to teacher successfully.',
    assignmentId: resAssign.lastInsertRowid
  });
});

// ----------------------------------------------------------------------------
// DELETE /api/teachers/:id/assignments/:assignmentId - Remove assignment
// ----------------------------------------------------------------------------
router.delete('/:id/assignments/:assignmentId', requireSuperAdmin, (req, res) => {
  db.run(`DELETE FROM teacher_assignments WHERE id = ? AND teacher_id = ?`, [req.params.assignmentId, req.params.id]);
  return res.json({ success: true, message: 'Assignment removed.' });
});

// ----------------------------------------------------------------------------
// DELETE /api/teachers/:id - Deactivate teacher (Super Admin only)
// ----------------------------------------------------------------------------
router.delete('/:id', requireSuperAdmin, (req, res) => {
  const teacher = db.get(`SELECT * FROM teachers WHERE id = ?`, [req.params.id]);
  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Teacher not found.' });
  }

  db.run(`UPDATE teachers SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [teacher.id]);
  db.run(`UPDATE users SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [teacher.user_id]);

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'TEACHER_DISABLED',
    module: 'TEACHERS',
    recordId: teacher.id,
    details: `Disabled teacher ${teacher.name}`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: `Teacher ${teacher.name} has been disabled.`
  });
});

module.exports = router;
