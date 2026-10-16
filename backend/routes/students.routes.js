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

  // 3. Super Admin: Can view all students for authorized school
  const schoolId = req.schoolId || (req.user && req.user.school_id) || 1;
  let sql = `
    SELECT s.*, c.name as class_name, sec.name as section_name,
           p.name as parent_name, p.mobile as parent_mobile_contact
    FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE (s.school_id = ? OR ? = 1)
  `;
  const params = [schoolId, schoolId];

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
// GET /api/students/form-options - Dynamic dropdown options for registration form
// ----------------------------------------------------------------------------
router.get('/form-options', (req, res) => {
  const schoolId = req.schoolId || (req.user && req.user.school_id) || 1;

  const classes = db.query(
    `SELECT id, name, grade_level FROM classes WHERE (school_id = ? OR ? = 1) ORDER BY grade_level ASC`,
    [schoolId, schoolId]
  );

  const sections = db.query(
    `SELECT s.id, s.class_id, s.name, s.room_number, s.max_capacity, c.name as class_name
     FROM sections s
     JOIN classes c ON s.class_id = c.id
     WHERE (s.school_id = ? OR ? = 1)
     ORDER BY c.grade_level ASC, s.name ASC`,
    [schoolId, schoolId]
  );

  const academicYears = db.query(
    `SELECT id, name, is_current FROM academic_years ORDER BY id DESC`
  );

  const buses = db.query(
    `SELECT b.id, b.bus_number, b.vehicle_no, b.model, b.capacity, b.status,
            r.id as route_id, r.name as route_name
     FROM buses b
     LEFT JOIN bus_routes r ON r.assigned_bus_id = b.id
     WHERE (b.school_id = ? OR ? = 1) AND b.status = 'ACTIVE'
     ORDER BY b.bus_number ASC`,
    [schoolId, schoolId]
  );

  const routes = db.query(
    `SELECT id, route_code, name, start_point, end_point, eta_minutes FROM bus_routes WHERE (school_id = ? OR ? = 1) ORDER BY route_code ASC`,
    [schoolId, schoolId]
  );

  const stops = db.query(
    `SELECT id, route_id, stop_name, stop_order, latitude, longitude, pickup_time, drop_time
     FROM bus_stops
     ORDER BY route_id ASC, stop_order ASC`
  );

  // Group stops by route_id
  const stopsByRoute = {};
  stops.forEach(st => {
    if (!stopsByRoute[st.route_id]) stopsByRoute[st.route_id] = [];
    stopsByRoute[st.route_id].push(st);
  });

  const routesWithStops = routes.map(r => ({
    ...r,
    stops: stopsByRoute[r.id] || []
  }));

  const feeStructures = db.query(
    `SELECT fs.*, c.name as class_name
     FROM fee_structures fs
     JOIN classes c ON fs.class_id = c.id
     WHERE (fs.school_id = ? OR ? = 1)
     ORDER BY c.grade_level ASC`,
    [schoolId, schoolId]
  );

  return res.json({
    success: true,
    schoolId,
    classes,
    sections,
    academicYears,
    buses,
    routes: routesWithStops,
    stops,
    feeStructures,
    houses: ['Red', 'Yellow', 'Blue', 'Green'],
    bloodGroups: ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'],
    genders: ['male', 'female', 'other'],
    annualIncomes: [
      'Below ₹1,00,000',
      '₹1,00,000 – ₹2,50,000',
      '₹2,50,001 – ₹5,00,000',
      '₹5,00,001 – ₹10,00,000',
      '₹10,00,001 – ₹25,00,000',
      'Above ₹25,00,000'
    ]
  });
});

// ----------------------------------------------------------------------------
// GET /api/students/:id - Get detailed student profile
// ----------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const student = db.get(
    `SELECT s.*, c.name as class_name, sec.name as section_name,
            p.name as parent_name, p.mobile as parent_mobile_contact, p.email as parent_email_contact,
            p.address as parent_home_address, p.occupation as parent_occupation
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

  // Cross-school tenant isolation check
  const schoolId = req.schoolId || (req.user && req.user.school_id) || 1;
  if (req.user.role !== 'PLATFORM_ADMIN' && student.school_id && schoolId && student.school_id !== schoolId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Cross-school access is prohibited.'
    });
  }

  // Parent isolation verification
  if (req.user.role === 'PARENT') {
    const isLinked = (req.parent?.students || []).some(s => s.id === student.id);
    if (!isLinked) {
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

  // Fetch transport assignment if exists
  const transport = db.get(
    `SELECT sta.*, b.bus_number, b.vehicle_no, b.model as bus_model,
            r.name as route_name, r.route_code, bs.stop_name as pickup_stop_name, bs.pickup_time,
            d.name as driver_name, d.mobile as driver_mobile
     FROM student_transport_assignments sta
     JOIN buses b ON sta.bus_id = b.id
     JOIN bus_routes r ON sta.route_id = r.id
     LEFT JOIN bus_stops bs ON sta.pickup_stop_id = bs.id
     LEFT JOIN drivers d ON d.assigned_bus_id = b.id
     WHERE sta.student_id = ?`,
    [student.id]
  );
  student.transport = transport || null;

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
// POST /api/students - Add a new student (Super Admin & Authorized Staff)
// Complete EMIS Registration with Parent Linkage & Transport Assignment
// ----------------------------------------------------------------------------
router.post('/', requireSuperAdmin, (req, res) => {
  const {
    // Basic Info
    admissionNo, admissionNumber, rollNo, firstName, lastName, middleName,
    dob, gender, bloodGroup, aadhaarNo, aadhaarNumber, motherTongue, nationality,
    house, identificationMarks, mark1, mark2,
    // Social Info
    religion, community,
    // Parent Info
    parentName, fatherName, motherName, guardianName, guardianRelationship,
    parentMobile, alternateMobile, alternatePhone, parentEmail,
    fatherQualification, motherQualification, fatherOccupation, motherOccupation,
    annualIncome,
    // Address Info
    doorNo, street, villageTown, district, state, pinCode,
    permanentAddress, communicationAddress, address,
    // Admission / Academic Info
    classId, sectionId, academicYearId, admissionDate, classAdmitted, previousSchool, status,
    // Bank Info
    bankName, accountHolderName, accountNo, ifscCode, branchName,
    // Transport & Fee
    transportRequired, busId, routeId, pickupStopId,
    feeStructureId,
    // Notes
    emergencyContact, medicalNotes
  } = req.body;

  const schoolId = req.schoolId || (req.user && req.user.school_id) || 1;

  // Clean / normalize fields
  const cleanAdm = String(admissionNo || admissionNumber || '').trim().toUpperCase();
  const cleanFirst = String(firstName || '').trim();
  const cleanLast = String(lastName || '').trim();
  const cleanMiddle = String(middleName || '').trim();
  const cleanFather = String(fatherName || parentName || '').trim();
  const cleanMother = String(motherName || '').trim();
  const cleanGuardian = String(guardianName || '').trim();
  const cleanGuardianRel = String(guardianRelationship || '').trim();
  const cleanMobile = String(parentMobile || '').replace(/\D/g, '').slice(-10);
  const cleanAltMobile = String(alternateMobile || alternatePhone || '').replace(/\D/g, '').slice(-10);
  const cleanEmail = String(parentEmail || '').trim().toLowerCase();

  const cleanDoor = String(doorNo || '').trim();
  const cleanStreet = String(street || '').trim();
  const cleanVillage = String(villageTown || '').trim();
  const cleanDistrict = String(district || '').trim();
  const cleanState = String(state || '').trim();
  const cleanPin = String(pinCode || '').trim();
  const cleanPermAddress = String(permanentAddress || address || '').trim();
  const cleanCommAddress = String(communicationAddress || permanentAddress || address || '').trim();
  const cleanMarks = identificationMarks || [mark1, mark2].filter(Boolean).join('; ');

  const rawGender = String(gender || 'male').trim().toLowerCase();
  const cleanGender = ['male', 'female', 'other'].includes(rawGender) ? rawGender : 'male';
  const rawStatus = String(status || 'active').trim().toLowerCase();
  const cleanStatus = ['active', 'inactive', 'alumni', 'suspended'].includes(rawStatus) ? rawStatus : 'active';

  // Validation
  if (!cleanAdm) {
    return res.status(400).json({ success: false, error: 'Admission Number is mandatory.' });
  }
  if (!cleanFirst || !cleanLast) {
    return res.status(400).json({ success: false, error: 'Student First Name and Last Name are mandatory.' });
  }
  if (!dob) {
    return res.status(400).json({ success: false, error: 'Date of Birth is mandatory.' });
  }
  if (!classId || !sectionId) {
    return res.status(400).json({ success: false, error: 'Class and Section assignment are mandatory.' });
  }
  if (rollNo === undefined || rollNo === null || String(rollNo).trim() === '') {
    return res.status(400).json({ success: false, error: 'Roll Number is mandatory.' });
  }
  if (!cleanMobile || cleanMobile.length !== 10) {
    return res.status(400).json({ success: false, error: 'A valid 10-digit Parent Mobile Number is mandatory for communication and portal login.' });
  }
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid Parent Email address format.' });
  }

  // Check unique admission number within school
  const existingAdm = db.get(
    `SELECT id, first_name, last_name FROM students WHERE admission_no = ? AND (school_id = ? OR ? = 1)`,
    [cleanAdm, schoolId, schoolId]
  );
  if (existingAdm) {
    return res.status(400).json({
      success: false,
      error: `A student with Admission Number ${cleanAdm} already exists (${existingAdm.first_name} ${existingAdm.last_name}).`
    });
  }

  // Check unique roll number in same class/section
  const existingRoll = db.get(
    `SELECT id, first_name, last_name FROM students WHERE class_id = ? AND section_id = ? AND roll_no = ? AND (school_id = ? OR ? = 1)`,
    [classId, sectionId, rollNo, schoolId, schoolId]
  );
  if (existingRoll) {
    return res.status(400).json({
      success: false,
      error: `Roll Number ${rollNo} is already assigned to ${existingRoll.first_name} ${existingRoll.last_name} in this class and section.`
    });
  }

  // --------------------------------------------------------------------------
  // Parent Record & User Account Linkage
  // --------------------------------------------------------------------------
  let parent = db.get(
    `SELECT * FROM parents WHERE REPLACE(REPLACE(REPLACE(mobile, '+91', ''), ' ', ''), '-', '') LIKE '%' || ? OR mobile = ?`,
    [cleanMobile, cleanMobile]
  );

  let parentId = null;

  if (parent) {
    parentId = parent.id;
    // Update existing parent record if new fields were provided
    db.run(
      `UPDATE parents SET
         address = COALESCE(NULLIF(?, ''), address),
         email = COALESCE(NULLIF(?, ''), email),
         alternate_phone = COALESCE(NULLIF(?, ''), alternate_phone),
         pin_code = COALESCE(NULLIF(?, ''), pin_code),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cleanPermAddress, cleanEmail, cleanAltMobile, cleanPin, parent.id]
    );
  } else {
    // Create User login account for parent
    const bcrypt = require('bcryptjs');
    const defaultHash = bcrypt.hashSync('ParentPassword123!', 10);
    let user = db.get(`SELECT id FROM users WHERE mobile = ? OR username = ?`, [cleanMobile, `parent_${cleanMobile}`]);
    let userId = user ? user.id : null;

    if (!userId) {
      const uRes = db.run(
        `INSERT INTO users (username, mobile, email, password_hash, role, status, school_id) VALUES (?, ?, ?, ?, 'PARENT', 'active', ?)`,
        [`parent_${cleanMobile}`, cleanMobile, cleanEmail || `${cleanMobile}@parent.grexotix.edu`, defaultHash, schoolId]
      );
      userId = uRes.lastInsertRowid;
    }

    const pRes = db.run(
      `INSERT INTO parents (user_id, name, mobile, email, address, occupation, alternate_phone, pin_code, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        cleanFather || cleanGuardian || `${cleanFirst}'s Guardian`,
        cleanMobile,
        cleanEmail,
        cleanPermAddress,
        fatherOccupation || motherOccupation || '',
        cleanAltMobile,
        cleanPin,
        schoolId
      ]
    );
    parentId = pRes.lastInsertRowid;
  }

  // --------------------------------------------------------------------------
  // Insert Student Record with Full EMIS Schema
  // --------------------------------------------------------------------------
  let cleanBusId = busId ? parseInt(busId, 10) : null;
  if (cleanBusId) {
    const validBus = db.get(`SELECT id FROM buses WHERE id = ?`, [cleanBusId]);
    if (!validBus) cleanBusId = null;
  }
  let cleanRouteId = routeId ? parseInt(routeId, 10) : null;
  if (cleanRouteId) {
    const validRoute = db.get(`SELECT id FROM bus_routes WHERE id = ?`, [cleanRouteId]);
    if (!validRoute) cleanRouteId = null;
  }
  let cleanStopId = pickupStopId ? parseInt(pickupStopId, 10) : null;
  if (cleanStopId) {
    const validStop = db.get(`SELECT id FROM bus_stops WHERE id = ?`, [cleanStopId]);
    if (!validStop) cleanStopId = null;
  }

  const resStudent = db.run(
    `INSERT INTO students (
       admission_no, first_name, last_name, middle_name, dob, gender, blood_group, aadhaar_no,
       mother_tongue, nationality, house, identification_marks, religion, community,
       door_no, street, village_town, district, state, pin_code,
       permanent_address, communication_address, address,
       father_name, mother_name, guardian_name, guardian_relationship,
       parent_id, parent_mobile, alternate_mobile, parent_email,
       father_qualification, mother_qualification, father_occupation, mother_occupation,
       annual_income, class_id, section_id, roll_no, academic_year_id,
       admission_date, class_admitted, previous_school,
       bank_name, account_holder_name, account_no, ifsc_code, branch_name,
       transport_required, bus_id, route_id, pickup_stop_id,
       emergency_contact, medical_notes, status, school_id
     ) VALUES (
       ?, ?, ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?, ?,
       ?, ?, ?,
       ?, ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?
     )`,
    [
      cleanAdm, cleanFirst, cleanLast, cleanMiddle, dob, cleanGender, bloodGroup || 'O+', aadhaarNo || aadhaarNumber || '',
      motherTongue || 'Tamil', nationality || 'Indian', house || 'Red', cleanMarks, religion || 'Christianity', community || 'BC',
      cleanDoor, cleanStreet, cleanVillage, cleanDistrict, cleanState || 'Tamil Nadu', cleanPin,
      cleanPermAddress, cleanCommAddress, cleanPermAddress,
      cleanFather, cleanMother, cleanGuardian, cleanGuardianRel || 'Guardian',
      parentId, cleanMobile, cleanAltMobile, cleanEmail,
      fatherQualification || '', motherQualification || '', fatherOccupation || '', motherOccupation || '',
      annualIncome || '₹2,50,001 – ₹5,00,000',
      classId, sectionId, rollNo, academicYearId || 1,
      admissionDate || new Date().toISOString().split('T')[0], classAdmitted || '', previousSchool || '',
      bankName || '', accountHolderName || '', accountNo || '', ifscCode || '', branchName || '',
      (transportRequired === 1 || transportRequired === '1' || transportRequired === true || transportRequired === 'yes') ? 1 : 0,
      cleanBusId, cleanRouteId, cleanStopId,
      emergencyContact || cleanMobile, medicalNotes || '', cleanStatus, schoolId
    ]
  );

  const newStudentId = resStudent.lastInsertRowid;

  // Link in student_parents table
  if (parentId) {
    db.run(
      `INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, 1)`,
      [newStudentId, parentId, cleanGuardian ? (cleanGuardianRel || 'Guardian') : 'Father']
    );
  }

  // Transport Assignment
  const isTransport = (transportRequired === 1 || transportRequired === '1' || transportRequired === true || transportRequired === 'yes');
  if (isTransport && busId) {
    try {
      db.run(
        `INSERT OR REPLACE INTO student_transport_assignments (student_id, bus_id, route_id, pickup_stop_id)
         VALUES (?, ?, ?, ?)`,
        [newStudentId, parseInt(busId, 10), routeId ? parseInt(routeId, 10) : 1, pickupStopId ? parseInt(pickupStopId, 10) : null]
      );
    } catch (_) {}
  }

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'STUDENT_ENROLLED',
    module: 'STUDENTS',
    recordId: newStudentId,
    details: `Enrolled student ${cleanAdm}: ${cleanFirst} ${cleanLast} (Class ID: ${classId}, Section: ${sectionId})`,
    ipAddress: req.ip
  });

  return res.status(201).json({
    success: true,
    message: `Student ${cleanFirst} ${cleanLast} (Admission No: ${cleanAdm}) enrolled successfully.`,
    studentId: newStudentId,
    admissionNo: cleanAdm
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

  const schoolId = req.schoolId || (req.user && req.user.school_id) || 1;

  const {
    admissionNo, rollNo, firstName, lastName, middleName,
    dob, gender, bloodGroup, aadhaarNo, motherTongue, nationality, house,
    identificationMarks, religion, community, doorNo, street, villageTown,
    district, state, pinCode, permanentAddress, communicationAddress, address,
    fatherName, motherName, guardianName, guardianRelationship,
    parentMobile, alternateMobile, parentEmail,
    fatherQualification, motherQualification, fatherOccupation, motherOccupation,
    annualIncome, classId, sectionId, academicYearId, admissionDate,
    classAdmitted, previousSchool, status,
    bankName, accountHolderName, accountNo, ifscCode, branchName,
    transportRequired, busId, routeId, pickupStopId,
    emergencyContact, medicalNotes
  } = req.body;

  // If admission number is changing, verify uniqueness
  if (admissionNo && admissionNo.trim().toUpperCase() !== student.admission_no) {
    const cleanAdm = admissionNo.trim().toUpperCase();
    const existing = db.get(`SELECT id FROM students WHERE admission_no = ? AND id != ? AND (school_id = ? OR ? = 1)`, [cleanAdm, student.id, schoolId, schoolId]);
    if (existing) {
      return res.status(400).json({ success: false, error: `Admission Number ${cleanAdm} is already assigned to another student.` });
    }
  }

  // If roll number or class/section is changing, verify uniqueness
  const targetClassId = classId !== undefined ? classId : student.class_id;
  const targetSectionId = sectionId !== undefined ? sectionId : student.section_id;
  const targetRoll = rollNo !== undefined ? rollNo : student.roll_no;

  if (targetClassId !== student.class_id || targetSectionId !== student.section_id || targetRoll !== student.roll_no) {
    const existingRoll = db.get(
      `SELECT id FROM students WHERE class_id = ? AND section_id = ? AND roll_no = ? AND id != ? AND (school_id = ? OR ? = 1)`,
      [targetClassId, targetSectionId, targetRoll, student.id, schoolId, schoolId]
    );
    if (existingRoll) {
      return res.status(400).json({ success: false, error: `Roll Number ${targetRoll} is already taken in this class and section.` });
    }
  }

  db.run(
    `UPDATE students SET
      admission_no = COALESCE(?, admission_no),
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      middle_name = COALESCE(?, middle_name),
      dob = COALESCE(?, dob),
      gender = COALESCE(?, gender),
      blood_group = COALESCE(?, blood_group),
      aadhaar_no = COALESCE(?, aadhaar_no),
      mother_tongue = COALESCE(?, mother_tongue),
      nationality = COALESCE(?, nationality),
      house = COALESCE(?, house),
      identification_marks = COALESCE(?, identification_marks),
      religion = COALESCE(?, religion),
      community = COALESCE(?, community),
      door_no = COALESCE(?, door_no),
      street = COALESCE(?, street),
      village_town = COALESCE(?, village_town),
      district = COALESCE(?, district),
      state = COALESCE(?, state),
      pin_code = COALESCE(?, pin_code),
      permanent_address = COALESCE(?, permanent_address),
      communication_address = COALESCE(?, communication_address),
      address = COALESCE(?, address),
      father_name = COALESCE(?, father_name),
      mother_name = COALESCE(?, mother_name),
      guardian_name = COALESCE(?, guardian_name),
      guardian_relationship = COALESCE(?, guardian_relationship),
      parent_mobile = COALESCE(?, parent_mobile),
      alternate_mobile = COALESCE(?, alternate_mobile),
      parent_email = COALESCE(?, parent_email),
      father_qualification = COALESCE(?, father_qualification),
      mother_qualification = COALESCE(?, mother_qualification),
      father_occupation = COALESCE(?, father_occupation),
      mother_occupation = COALESCE(?, mother_occupation),
      annual_income = COALESCE(?, annual_income),
      class_id = COALESCE(?, class_id),
      section_id = COALESCE(?, section_id),
      roll_no = COALESCE(?, roll_no),
      academic_year_id = COALESCE(?, academic_year_id),
      admission_date = COALESCE(?, admission_date),
      class_admitted = COALESCE(?, class_admitted),
      previous_school = COALESCE(?, previous_school),
      bank_name = COALESCE(?, bank_name),
      account_holder_name = COALESCE(?, account_holder_name),
      account_no = COALESCE(?, account_no),
      ifsc_code = COALESCE(?, ifsc_code),
      branch_name = COALESCE(?, branch_name),
      transport_required = COALESCE(?, transport_required),
      bus_id = COALESCE(?, bus_id),
      route_id = COALESCE(?, route_id),
      pickup_stop_id = COALESCE(?, pickup_stop_id),
      emergency_contact = COALESCE(?, emergency_contact),
      medical_notes = COALESCE(?, medical_notes),
      status = COALESCE(?, status),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      admissionNo ? admissionNo.trim().toUpperCase() : null,
      firstName, lastName, middleName, dob,
      gender ? (['male', 'female', 'other'].includes(gender.toString().trim().toLowerCase()) ? gender.toString().trim().toLowerCase() : 'male') : null,
      bloodGroup, aadhaarNo,
      motherTongue, nationality, house, identificationMarks, religion, community,
      doorNo, street, villageTown, district, state, pinCode,
      permanentAddress, communicationAddress, address,
      fatherName, motherName, guardianName, guardianRelationship,
      parentMobile, alternateMobile, parentEmail,
      fatherQualification, motherQualification, fatherOccupation, motherOccupation,
      annualIncome, classId, sectionId, rollNo, academicYearId,
      admissionDate, classAdmitted, previousSchool,
      bankName, accountHolderName, accountNo, ifscCode, branchName,
      transportRequired !== undefined ? (transportRequired ? 1 : 0) : null,
      busId, routeId, pickupStopId,
      emergencyContact, medicalNotes,
      status ? (['active', 'inactive', 'alumni', 'suspended'].includes(status.toString().trim().toLowerCase()) ? status.toString().trim().toLowerCase() : 'active') : null,
      student.id
    ]
  );

  // Update transport assignment if transport info provided
  if (busId) {
    db.run(
      `INSERT OR REPLACE INTO student_transport_assignments (student_id, bus_id, route_id, pickup_stop_id)
       VALUES (?, ?, ?, ?)`,
      [student.id, parseInt(busId, 10), routeId ? parseInt(routeId, 10) : 1, pickupStopId ? parseInt(pickupStopId, 10) : null]
    );
  }

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'STUDENT_UPDATED',
    module: 'STUDENTS',
    recordId: student.id,
    details: `Updated details for student ID ${student.id} (${student.admission_no})`,
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
