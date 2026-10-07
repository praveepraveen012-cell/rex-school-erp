const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');

// Public or Authenticated: Submit admission application
router.post('/apply', (req, res) => {
  const {
    studentFirstName,
    studentLastName,
    dob,
    gender,
    targetGradeLevel,
    parentName,
    parentMobile,
    parentEmail,
    address,
    notes
  } = req.body;

  if (!studentFirstName || !studentLastName || !dob || !targetGradeLevel || !parentName || !parentMobile) {
    return res.status(400).json({
      success: false,
      error: 'Please fill all required fields: first name, last name, DOB, target grade, parent name, and mobile.'
    });
  }

  const appCount = db.get(`SELECT COUNT(*) as count FROM admissions`);
  const applicationNo = `ADM-2026-${String((appCount?.count || 0) + 101).padStart(4, '0')}`;

  const result = db.run(
    `INSERT INTO admissions (
      application_no, student_first_name, student_last_name, dob, gender, target_grade_level,
      parent_name, parent_mobile, parent_email, address, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    [
      applicationNo,
      studentFirstName.trim(),
      studentLastName.trim(),
      dob,
      gender || 'male',
      parseInt(targetGradeLevel, 10),
      parentName.trim(),
      parentMobile.trim(),
      parentEmail?.trim() || null,
      address?.trim() || null,
      notes?.trim() || null
    ]
  );

  return res.status(201).json({
    success: true,
    message: 'Admission application submitted successfully.',
    application: {
      id: result.lastInsertRowid,
      applicationNo,
      status: 'PENDING'
    }
  });
});

// Authenticated Routes (Super Admin)
router.use(authenticate);

// GET /api/admissions - List all applications
router.get('/', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Super Admin access required.' });
  }

  const { status, grade } = req.query;
  let sql = `SELECT * FROM admissions WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ` AND status = ?`;
    params.push(status.toUpperCase());
  }
  if (grade) {
    sql += ` AND target_grade_level = ?`;
    params.push(parseInt(grade, 10));
  }

  sql += ` ORDER BY id DESC`;
  const applications = db.query(sql, params);

  return res.json({
    success: true,
    total: applications.length,
    applications
  });
});

// PUT /api/admissions/:id/status - Update application review status
router.put('/:id/status', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Super Admin access required.' });
  }

  const { status, notes } = req.body;
  const validStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
  if (!validStatuses.includes(status?.toUpperCase())) {
    return res.status(400).json({ success: false, error: `Invalid status. Expected one of: ${validStatuses.join(', ')}` });
  }

  const app = db.get(`SELECT * FROM admissions WHERE id = ?`, [req.params.id]);
  if (!app) {
    return res.status(404).json({ success: false, error: 'Application record not found.' });
  }

  db.run(
    `UPDATE admissions SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status.toUpperCase(), notes || null, req.params.id]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE_ADMISSION_STATUS',
    module: 'ADMISSIONS',
    recordId: req.params.id,
    details: `Updated application ${app.application_no} status to ${status}`
  });

  return res.json({
    success: true,
    message: `Application status updated to ${status}.`
  });
});

// POST /api/admissions/:id/enroll - Convert approved applicant into active enrolled student
router.post('/:id/enroll', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Super Admin access required.' });
  }

  const app = db.get(`SELECT * FROM admissions WHERE id = ?`, [req.params.id]);
  if (!app) {
    return res.status(404).json({ success: false, error: 'Application record not found.' });
  }

  if (app.status === 'ENROLLED') {
    return res.status(400).json({ success: false, error: 'Applicant is already enrolled as an active student.' });
  }

  const { classId, sectionId } = req.body;
  const targetClassId = classId || app.allocated_class_id || 1;
  const targetSectionId = sectionId || app.allocated_section_id || 1;

  // Determine next roll number in section
  const maxRoll = db.get(
    `SELECT MAX(roll_no) as max_roll FROM students WHERE class_id = ? AND section_id = ?`,
    [targetClassId, targetSectionId]
  );
  const nextRoll = (maxRoll?.max_roll || 0) + 1;

  // Generate official admission number
  const stuCount = db.get(`SELECT COUNT(*) as count FROM students`);
  const admissionNo = `REX-2026-${String((stuCount?.count || 0) + 1).padStart(3, '0')}`;

  // Enroll student
  const studentRes = db.run(
    `INSERT INTO students (
      admission_no, first_name, last_name, dob, gender, class_id, section_id,
      roll_no, parent_mobile, parent_email, address, admission_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), 'active')`,
    [
      admissionNo,
      app.student_first_name,
      app.student_last_name,
      app.dob,
      app.gender,
      targetClassId,
      targetSectionId,
      nextRoll,
      app.parent_mobile,
      app.parent_email,
      app.address
    ]
  );

  const studentId = studentRes.lastInsertRowid;

  // Ensure parent record exists
  let parent = db.get(`SELECT id FROM parents WHERE mobile = ?`, [app.parent_mobile]);
  if (!parent) {
    const parentRes = db.run(
      `INSERT INTO parents (name, mobile, email, address) VALUES (?, ?, ?, ?)`,
      [app.parent_name, app.parent_mobile, app.parent_email, app.address]
    );
    parent = { id: parentRes.lastInsertRowid };
  }

  // Link student to parent
  db.run(
    `INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, 'Parent', 1)`,
    [studentId, parent.id]
  );

  // Update admission record
  db.run(
    `UPDATE admissions SET status = 'ENROLLED', enrolled_student_id = ?, allocated_class_id = ?, allocated_section_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [studentId, targetClassId, targetSectionId, req.params.id]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'ENROLL_STUDENT',
    module: 'ADMISSIONS',
    recordId: studentId.toString(),
    details: `Enrolled applicant ${app.student_first_name} ${app.student_last_name} as ${admissionNo}`
  });

  return res.status(201).json({
    success: true,
    message: `Student enrolled successfully with Admission No: ${admissionNo}`,
    student: {
      id: studentId,
      admissionNo,
      name: `${app.student_first_name} ${app.student_last_name}`,
      rollNo: nextRoll,
      classId: targetClassId,
      sectionId: targetSectionId
    }
  });
});

module.exports = router;
