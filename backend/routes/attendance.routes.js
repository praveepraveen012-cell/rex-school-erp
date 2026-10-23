const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');
const smsService = require('../services/smsService');

router.use(authenticate);

// Role guard: Platform Admin does not manage individual school attendance
router.use((req, res, next) => {
  if (req.user && req.user.role === 'PLATFORM_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Platform administrators do not manage individual school daily attendance.'
    });
  }
  next();
});

// Role guard: Parents can only view attendance; reject any mutation attempts
router.use((req, res, next) => {
  if (req.user && req.user.role === 'PARENT') {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Parents cannot modify attendance records.'
      });
    }
  }
  next();
});

// ----------------------------------------------------------------------------
// GET /api/attendance/summary - Attendance summary statistics
// ----------------------------------------------------------------------------
router.get(['/summary', '/stats'], (req, res) => {
  const schoolId = req.schoolId || (req.user && req.user.school_id) || 1;
  const totalStudents = db.get(`SELECT COUNT(*) as count FROM students WHERE school_id = ? AND status = 'active'`, [schoolId])?.count || 0;
  const today = new Date().toISOString().slice(0, 10);
  const presentToday = db.get(
    `SELECT COUNT(*) as count FROM attendance a JOIN students s ON a.student_id = s.id WHERE s.school_id = ? AND a.date = ? AND a.status = 'present'`,
    [schoolId, today]
  )?.count || 0;

  return res.json({
    success: true,
    totalStudents,
    presentToday,
    attendanceRate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 100
  });
});

// ----------------------------------------------------------------------------
// GET /api/attendance - Query attendance by class, section, date or student
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { classId, sectionId, date, studentId, month } = req.query;
  const schoolId = req.schoolId || (req.user && req.user.school_id) || 1;

  // 1. Parent Access: Can ONLY view attendance of linked child
  if (req.user.role === 'PARENT') {
    const parentRecord = db.get(`SELECT id FROM parents WHERE user_id = ?`, [req.user.id]);
    const parentId = parentRecord ? parentRecord.id : (req.parent ? req.parent.id : null);

    const linkedStudents = parentId
      ? db.query(
          `SELECT s.id, s.first_name, s.last_name, s.class_id, s.section_id, c.name as class_name, sec.name as section_name
           FROM student_parents sp
           JOIN students s ON sp.student_id = s.id
           LEFT JOIN classes c ON s.class_id = c.id
           LEFT JOIN sections sec ON s.section_id = sec.id
           WHERE sp.parent_id = ?`,
          [parentId]
        )
      : (req.parent?.students || []);

    if (linkedStudents.length === 0) {
      return res.status(403).json({ success: false, error: 'No parent profile or linked children found.' });
    }

    let targetStudentId = studentId ? parseInt(studentId, 10) : linkedStudents[0].id;
    const isLinked = linkedStudents.find(s => s.id === targetStudentId);

    if (!isLinked) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You cannot view attendance for a student not linked to your account.'
      });
    }

    let sql = `
      SELECT a.*, s.first_name, s.last_name, s.roll_no, c.name as class_name, sec.name as section_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      JOIN sections sec ON a.section_id = sec.id
      WHERE a.student_id = ?
    `;
    const params = [targetStudentId];

    if (date) {
      sql += ` AND a.date = ?`;
      params.push(date);
    } else if (month) {
      sql += ` AND a.date LIKE ?`;
      params.push(`${month}%`);
    }

    sql += ` ORDER BY a.date DESC`;
    const records = db.query(sql, params);

    // Summary calculation
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

    return res.json({
      success: true,
      studentId: targetStudentId,
      studentName: `${isLinked.first_name} ${isLinked.last_name}`,
      className: `${isLinked.class_name || ''}-${isLinked.section_name || ''}`,
      summary: { total, present, absent, late, percentage },
      records
    });
  }

  // 2. Teacher Access: Check class/section assignment
  if (req.user.role === 'TEACHER') {
    if (!req.teacher) {
      return res.status(403).json({ success: false, error: 'Teacher profile not found.' });
    }
    const assignments = req.teacher.assignments || [];
    if (classId && sectionId) {
      const isAssigned = assignments.some(
        a => a.class_id === parseInt(classId, 10) && a.section_id === parseInt(sectionId, 10)
      );
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You are not assigned to this class and section.'
        });
      }
    } else if (classId) {
      const isAssignedClass = assignments.some(a => a.class_id === parseInt(classId, 10));
      if (!isAssignedClass) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You are not assigned to this class.'
        });
      }
    }
  }

  // 3. Teacher / Super Admin query (Tenant isolated)
  let sql = `
    SELECT a.*, s.first_name, s.last_name, s.roll_no, s.admission_no,
           c.name as class_name, sec.name as section_name, t.name as marked_by_teacher_name
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON a.class_id = c.id
    JOIN sections sec ON a.section_id = sec.id
    LEFT JOIN teachers t ON a.marked_by_teacher_id = t.id
    WHERE c.school_id = ?
  `;
  const params = [schoolId];

  // If teacher and no class/section filter, restrict to assigned sections
  if (req.user.role === 'TEACHER' && !classId && !sectionId) {
    const assignments = req.teacher?.assignments || [];
    const secIds = assignments.map(a => a.section_id);
    if (secIds.length > 0) {
      sql += ` AND a.section_id IN (${secIds.map(() => '?').join(',')})`;
      params.push(...secIds);
    }
  }

  if (classId) {
    sql += ` AND a.class_id = ?`;
    params.push(classId);
  }
  if (sectionId) {
    sql += ` AND a.section_id = ?`;
    params.push(sectionId);
  }
  if (date) {
    sql += ` AND a.date = ?`;
    params.push(date);
  }
  if (studentId) {
    sql += ` AND a.student_id = ?`;
    params.push(studentId);
  }

  sql += ` ORDER BY a.date DESC, s.roll_no ASC`;
  const records = db.query(sql, params);

  return res.json({
    success: true,
    count: records.length,
    records
  });
});

// ----------------------------------------------------------------------------
// GET /api/attendance/student/:id - Direct student attendance lookup
// ----------------------------------------------------------------------------
router.get('/student/:id', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (req.user.role === 'PARENT') {
    const parentRecord = db.get(`SELECT id FROM parents WHERE user_id = ?`, [req.user.id]);
    const parentId = parentRecord ? parentRecord.id : (req.parent ? req.parent.id : null);
    const linked = db.get(`SELECT student_id FROM student_parents WHERE parent_id = ? AND student_id = ?`, [parentId, targetId]);
    if (!linked) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view attendance for your linked children.' });
    }
  }

  const records = db.query(
    `SELECT a.*, s.first_name, s.last_name, s.roll_no
     FROM attendance a
     JOIN students s ON a.student_id = s.id
     WHERE a.student_id = ?
     ORDER BY a.date DESC`,
    [targetId]
  );

  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  return res.json({
    success: true,
    studentId: targetId,
    summary: { totalDays: total, presentDays: present, absentDays: absent, attendanceRate: rate },
    records
  });
});

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// GET /api/attendance/sheet - Get student roster with attendance state for date
// ----------------------------------------------------------------------------
router.get('/sheet', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Parents are not permitted to access class attendance registers.'
    });
  }

  const { classId, sectionId, date } = req.query;

  if (!classId || !sectionId || !date) {
    return res.status(400).json({
      success: false,
      error: 'classId, sectionId, and date parameters are required.'
    });
  }

  // Check teacher permission
  if (req.user.role === 'TEACHER') {
    const isAssigned = db.get(
      `SELECT id FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND section_id = ?`,
      [req.teacher.id, classId, sectionId]
    );
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not assigned to take attendance for this class/section.'
      });
    }
  }

  // Fetch all active students in this class/section
  const students = db.query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.roll_no, s.gender,
            a.id as attendance_id, a.status as attendance_status, a.remarks
     FROM students s
     LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
     WHERE s.class_id = ? AND s.section_id = ? AND s.status = 'active'
     ORDER BY s.roll_no ASC`,
    [date, classId, sectionId]
  );

  return res.json({
    success: true,
    date,
    classId: parseInt(classId, 10),
    sectionId: parseInt(sectionId, 10),
    students
  });
});

// ----------------------------------------------------------------------------
// POST /api/attendance - Submit/Record Class Attendance
// ----------------------------------------------------------------------------
router.post('/', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Parents cannot mark or submit class attendance.'
    });
  }

  const { classId, sectionId, date, records } = req.body;

  if (!classId || !sectionId || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide classId, sectionId, date, and attendance records list.'
    });
  }

  // Verify teacher permission
  if (req.user.role === 'TEACHER') {
    const isAssigned = db.get(
      `SELECT id FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND section_id = ?`,
      [req.teacher.id, classId, sectionId]
    );
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied. You are not authorized to mark attendance for this class.'
      });
    }
  }

  const teacherId = req.teacher ? req.teacher.id : null;

  // Validate student existence to prevent SQLite foreign key constraint failure
  for (const r of records) {
    const sId = typeof r.studentId === 'number' 
      ? r.studentId 
      : (parseInt(r.studentId.toString().replace(/[^0-9]/g, ''), 10) || r.studentId);
    const validStudent = db.get(`SELECT id FROM students WHERE id = ?`, [sId]);
    if (!validStudent) {
      return res.status(400).json({
        success: false,
        error: `Cannot mark attendance: Student ID ${sId} does not exist.`
      });
    }
  }

  // Execute batch upsert in transaction
  const absentStudentIds = [];
  db.transaction(() => {
    for (const r of records) {
      let raw = (r.status || 'present').toString().toLowerCase().trim();
      if (raw === 'p') raw = 'present';
      if (raw === 'a') raw = 'absent';
      if (raw === 'l') raw = 'late';
      if (raw === 'e') raw = 'excused';

      const status = ['present', 'absent', 'late', 'excused'].includes(raw) ? raw : 'present';
      const studentId = typeof r.studentId === 'number' 
        ? r.studentId 
        : (parseInt(r.studentId.toString().replace(/[^0-9]/g, ''), 10) || r.studentId);

      if (status === 'absent') {
        absentStudentIds.push(studentId);
      }
      db.run(
        `INSERT INTO attendance (
          student_id, class_id, section_id, date, status, marked_by_teacher_id, remarks, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(student_id, date) DO UPDATE SET
          status = excluded.status,
          marked_by_teacher_id = excluded.marked_by_teacher_id,
          remarks = excluded.remarks,
          updated_at = CURRENT_TIMESTAMP`,
        [studentId, classId, sectionId, date, status, teacherId, r.remarks || '']
      );
    }
  });

  // Automated SMS Feature: Send Absentee Alerts to Parents
  let smsDispatchedCount = 0;
  if (absentStudentIds.length > 0) {
    for (const sid of absentStudentIds) {
      const student = db.get(
        `SELECT s.id, s.first_name, s.last_name, s.roll_no, c.name as class_name, sec.name as section_name,
                COALESCE(p.mobile, s.parent_mobile) as parent_mobile
         FROM students s
         JOIN classes c ON s.class_id = c.id
         JOIN sections sec ON s.section_id = sec.id
         LEFT JOIN parents p ON s.parent_id = p.id
         WHERE s.id = ?`,
        [sid]
      );
      if (student && student.parent_mobile) {
        smsService.sendAbsenteeAlert({
          mobile: student.parent_mobile,
          studentName: `${student.first_name} ${student.last_name}`.trim(),
          rollNo: student.roll_no,
          className: student.class_name,
          sectionName: student.section_name,
          date
        });
        smsDispatchedCount++;
      }
    }
  }

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'ATTENDANCE_SUBMITTED',
    module: 'ATTENDANCE',
    recordId: `${classId}-${sectionId}-${date}`,
    details: `Marked attendance for ${records.length} students on ${date}. Automated SMS sent: ${smsDispatchedCount}`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: `Attendance for ${records.length} students recorded successfully.`,
    absentCount: absentStudentIds.length,
    smsDispatchedCount
  });
});

// ----------------------------------------------------------------------------
// POST /api/attendance/mark-all-present - Mark entire class present
// ----------------------------------------------------------------------------
router.post('/mark-all-present', (req, res) => {
  if (req.user.role === 'PARENT' || req.user.role === 'PLATFORM_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Parents and platform administrators cannot mark attendance.'
    });
  }

  const { classId, sectionId, date } = req.body;
  if (!classId || !sectionId || !date) {
    return res.status(400).json({ success: false, error: 'classId, sectionId, and date are required.' });
  }

  if (req.user.role === 'TEACHER') {
    const isAssigned = (req.teacher?.assignments || []).some(
      a => a.class_id === parseInt(classId, 10) && a.section_id === parseInt(sectionId, 10)
    );
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied. You are not authorized to mark attendance for this class.'
      });
    }
  }

  const students = db.query(
    `SELECT id FROM students WHERE class_id = ? AND section_id = ? AND status = 'active'`,
    [classId, sectionId]
  );

  const teacherId = req.teacher ? req.teacher.id : null;
  db.transaction(() => {
    for (const s of students) {
      db.run(
        `INSERT INTO attendance (student_id, class_id, section_id, date, status, marked_by_teacher_id, updated_at)
         VALUES (?, ?, ?, ?, 'present', ?, CURRENT_TIMESTAMP)
         ON CONFLICT(student_id, date) DO UPDATE SET
           status = 'present',
           marked_by_teacher_id = excluded.marked_by_teacher_id,
           updated_at = CURRENT_TIMESTAMP`,
        [s.id, classId, sectionId, date, teacherId]
      );
    }
  });

  return res.json({
    success: true,
    message: `All ${students.length} students marked present.`,
    count: students.length
  });
});

// ----------------------------------------------------------------------------
// POST /api/attendance/dispatch-alerts - Dispatch Absent alerts via WhatsApp/SMS
// ----------------------------------------------------------------------------
router.post(['/dispatch-alerts', '/dispatch-absent-alerts'], (req, res) => {
  if (req.user.role === 'PARENT' || req.user.role === 'PLATFORM_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Parents and platform administrators cannot dispatch attendance alerts.'
    });
  }

  const { classId, sectionId, date } = req.body;
  if (!classId || !sectionId || !date) {
    return res.status(400).json({ success: false, error: 'classId, sectionId, and date are required.' });
  }

  if (req.user.role === 'TEACHER') {
    const isAssigned = (req.teacher?.assignments || []).some(
      a => a.class_id === parseInt(classId, 10) && a.section_id === parseInt(sectionId, 10)
    );
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied. You are not authorized to dispatch alerts for this class.'
      });
    }
  }

  const absentStudents = db.query(
    `SELECT s.id, s.first_name, s.last_name, s.roll_no, c.name as class_name, sec.name as section_name,
            COALESCE(p.mobile, s.parent_mobile) as parent_mobile
     FROM attendance a
     JOIN students s ON a.student_id = s.id
     JOIN classes c ON a.class_id = c.id
     JOIN sections sec ON a.section_id = sec.id
     LEFT JOIN parents p ON s.parent_id = p.id
     WHERE a.class_id = ? AND a.section_id = ? AND a.date = ? AND a.status = 'absent'`,
    [classId, sectionId, date]
  );

  let sent = 0;
  for (const st of absentStudents) {
    if (st.parent_mobile) {
      smsService.sendAbsenteeAlert({
        mobile: st.parent_mobile,
        studentName: `${st.first_name} ${st.last_name}`.trim(),
        rollNo: st.roll_no,
        className: st.class_name,
        sectionName: st.section_name,
        date
      });
      sent++;
    }
  }

  return res.json({
    success: true,
    message: `Dispatched absent alerts to ${sent} parents.`,
    sentCount: sent,
    absentCount: absentStudents.length
  });
});

module.exports = router;
