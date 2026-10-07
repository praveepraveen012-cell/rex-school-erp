const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const auditService = require('../services/auditService');

// All student routes require authentication
router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/students - List students according to role permissions
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { classId, sectionId, search } = req.query;

  // 1. Parent Isolation: Can ONLY view linked students
  if (req.user.role === 'PARENT') {
    if (!req.parent) {
      return res.status(403).json({ success: false, error: 'No parent profile associated with account.' });
    }
    const students = db.query(
      `SELECT s.*, c.name as class_name, sec.name as section_name,
              p.name as parent_name, p.mobile as parent_mobile_contact
       FROM students s
       JOIN student_parents sp ON s.id = sp.student_id
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN parents p ON s.parent_id = p.id
       WHERE sp.parent_id = ?
       ORDER BY s.roll_no ASC`,
      [req.parent.id]
    );
    return res.json({ success: true, count: students.length, students });
  }

  // 2. Teacher Isolation: Can ONLY view students from assigned classes/sections
  if (req.user.role === 'TEACHER') {
    if (!req.teacher) {
      return res.status(403).json({ success: false, error: 'No teacher profile associated with account.' });
    }

    // Get list of assigned (class_id, section_id) pairs
    const assignedPairs = req.teacher.assignments || [];
    if (assignedPairs.length === 0) {
      return res.json({ success: true, count: 0, students: [] });
    }

    let sql = `
      SELECT DISTINCT s.*, c.name as class_name, sec.name as section_name,
             p.name as parent_name
      FROM students s
      JOIN classes c ON s.class_id = c.id
      JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN parents p ON s.parent_id = p.id
      JOIN teacher_assignments ta ON s.class_id = ta.class_id AND s.section_id = ta.section_id
      WHERE ta.teacher_id = ?
    `;
    const params = [req.teacher.id];

    if (classId) {
      sql += ` AND s.class_id = ?`;
      params.push(classId);
    }
    if (sectionId) {
      sql += ` AND s.section_id = ?`;
      params.push(sectionId);
    }
    if (search) {
      sql += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY s.class_id, s.section_id, s.roll_no ASC`;
    const students = db.query(sql, params);
    return res.json({ success: true, count: students.length, students });
  }

  // 3. Super Admin: Can view all students with optional filters
  let sql = `
    SELECT s.*, c.name as class_name, sec.name as section_name,
           p.name as parent_name, p.mobile as parent_mobile_contact
    FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (classId) {
    sql += ` AND s.class_id = ?`;
    params.push(classId);
  }
  if (sectionId) {
    sql += ` AND s.section_id = ?`;
    params.push(sectionId);
  }
  if (search) {
    sql += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY s.class_id, s.section_id, s.roll_no ASC`;
  const students = db.query(sql, params);
  return res.json({ success: true, count: students.length, students });
});

// ----------------------------------------------------------------------------
// GET /api/students/:id - Get detailed student profile
// ----------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const student = db.get(
    `SELECT s.*, c.name as class_name, sec.name as section_name,
            p.name as parent_name, p.mobile as parent_mobile_contact, p.email as parent_email_contact,
            p.address as parent_home_address
     FROM students s
     JOIN classes c ON s.class_id = c.id
     JOIN sections sec ON s.section_id = sec.id
     LEFT JOIN parents p ON s.parent_id = p.id
     WHERE s.id = ?`,
    [req.params.id]
  );

  if (!student) {
    return res.status(404).json({ success: false, error: 'Student record not found.' });
  }

  // Parent isolation verification
  if (req.user.role === 'PARENT') {
    const isLinked = db.get(
      `SELECT * FROM student_parents WHERE student_id = ? AND parent_id = ?`,
      [student.id, req.parent.id]
    );
    if (!isLinked && student.parent_id !== req.parent.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to view this student profile.'
      });
    }
  }

  // Teacher isolation verification
  if (req.user.role === 'TEACHER') {
    const isAssigned = db.get(
      `SELECT id FROM teacher_assignments
       WHERE teacher_id = ? AND class_id = ? AND section_id = ?`,
      [req.teacher.id, student.class_id, student.section_id]
    );
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not assigned to this student\'s class or section.'
      });
    }
  }

  // Fetch recent attendance summary
  const attendanceStats = db.get(
    `SELECT
       COUNT(*) as total_days,
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
       SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
       SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days
     FROM attendance
     WHERE student_id = ?`,
    [student.id]
  );

  return res.json({
    success: true,
    student,
    attendanceStats: {
      totalDays: attendanceStats.total_days || 0,
      presentDays: attendanceStats.present_days || 0,
      absentDays: attendanceStats.absent_days || 0,
      lateDays: attendanceStats.late_days || 0,
      attendancePercentage: attendanceStats.total_days > 0
        ? Math.round((attendanceStats.present_days / attendanceStats.total_days) * 100)
        : 100
    }
  });
});

// ----------------------------------------------------------------------------
// POST /api/students - Add a new student (Super Admin only)
// ----------------------------------------------------------------------------
router.post('/', requireSuperAdmin, (req, res) => {
  const {
    admissionNo, firstName, lastName, dob, gender,
    classId, sectionId, rollNo, parentName, parentMobile, parentEmail,
    address, bloodGroup, emergencyContact, medicalNotes
  } = req.body;

  // Validation
  if (!admissionNo || !firstName || !lastName || !dob || !classId || !sectionId || !rollNo) {
    return res.status(400).json({
      success: false,
      error: 'Missing required student fields: Admission No, Name, DOB, Class, Section, and Roll No are mandatory.'
    });
  }

  const cleanAdm = String(admissionNo).trim().toUpperCase();

  // Check unique admission number
  const existingAdm = db.get(`SELECT id FROM students WHERE admission_no = ?`, [cleanAdm]);
  if (existingAdm) {
    return res.status(400).json({
      success: false,
      error: `A student with Admission Number ${cleanAdm} already exists.`
    });
  }

  // Check unique roll number in same class/section
  const existingRoll = db.get(
    `SELECT id FROM students WHERE class_id = ? AND section_id = ? AND roll_no = ?`,
    [classId, sectionId, rollNo]
  );
  if (existingRoll) {
    return res.status(400).json({
      success: false,
      error: `Roll Number ${rollNo} is already assigned to another student in this class and section.`
    });
  }

  // Handle Parent record
  let parentId = null;
  if (parentMobile) {
    const cleanMobile = String(parentMobile).trim();
    let parent = db.get(`SELECT id FROM parents WHERE mobile = ?`, [cleanMobile]);
    if (!parent && parentName) {
      const pRes = db.run(
        `INSERT INTO parents (name, mobile, email, address) VALUES (?, ?, ?, ?)`,
        [parentName.trim(), cleanMobile, parentEmail || '', address || '']
      );
      parentId = pRes.lastInsertRowid;
    } else if (parent) {
      parentId = parent.id;
    }
  }

  // Insert student
  const resStudent = db.run(
    `INSERT INTO students (
      admission_no, first_name, last_name, dob, gender, class_id, section_id,
      roll_no, parent_id, parent_mobile, parent_email, address, blood_group,
      emergency_contact, medical_notes, status, admission_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', DATE('now'))`,
    [
      cleanAdm, firstName.trim(), lastName.trim(), dob, gender || 'male',
      classId, sectionId, rollNo, parentId, parentMobile || '', parentEmail || '',
      address || '', bloodGroup || 'O+', emergencyContact || parentMobile || '',
      medicalNotes || ''
    ]
  );

  const newStudentId = resStudent.lastInsertRowid;

  // Link to student_parents
  if (parentId) {
    db.run(
      `INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, 'Parent', 1)`,
      [newStudentId, parentId]
    );
  }

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'STUDENT_CREATED',
    module: 'STUDENTS',
    recordId: newStudentId,
    details: `Added student ${cleanAdm}: ${firstName} ${lastName}`,
    ipAddress: req.ip
  });

  return res.status(201).json({
    success: true,
    message: 'Student record created successfully.',
    studentId: newStudentId
  });
});

// ----------------------------------------------------------------------------
// PUT /api/students/:id - Update student record (Super Admin only)
// ----------------------------------------------------------------------------
router.put('/:id', requireSuperAdmin, (req, res) => {
  const student = db.get(`SELECT * FROM students WHERE id = ?`, [req.params.id]);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  const {
    firstName, lastName, dob, gender, classId, sectionId, rollNo,
    status, parentMobile, parentEmail, address, bloodGroup, emergencyContact, medicalNotes
  } = req.body;

  db.run(
    `UPDATE students SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      dob = COALESCE(?, dob),
      gender = COALESCE(?, gender),
      class_id = COALESCE(?, class_id),
      section_id = COALESCE(?, section_id),
      roll_no = COALESCE(?, roll_no),
      status = COALESCE(?, status),
      parent_mobile = COALESCE(?, parent_mobile),
      parent_email = COALESCE(?, parent_email),
      address = COALESCE(?, address),
      blood_group = COALESCE(?, blood_group),
      emergency_contact = COALESCE(?, emergency_contact),
      medical_notes = COALESCE(?, medical_notes),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      firstName, lastName, dob, gender, classId, sectionId, rollNo,
      status, parentMobile, parentEmail, address, bloodGroup, emergencyContact, medicalNotes,
      student.id
    ]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'STUDENT_UPDATED',
    module: 'STUDENTS',
    recordId: student.id,
    details: `Updated details for student ID ${student.id}`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Student record updated successfully.'
  });
});

// ----------------------------------------------------------------------------
// DELETE /api/students/:id - Soft delete / deactivate student (Super Admin only)
// ----------------------------------------------------------------------------
router.delete('/:id', requireSuperAdmin, (req, res) => {
  const student = db.get(`SELECT * FROM students WHERE id = ?`, [req.params.id]);
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  // Soft delete by setting status to inactive
  db.run(`UPDATE students SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [student.id]);

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'STUDENT_DEACTIVATED',
    module: 'STUDENTS',
    recordId: student.id,
    details: `Deactivated student ${student.admission_no}`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: `Student ${student.admission_no} has been deactivated.`
  });
});

module.exports = router;
