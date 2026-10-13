const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');

/**
 * Middleware: Verify caller is Grexotix Platform Administrator
 */
function requirePlatformAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Requires Grexotix Platform Administrator privileges.'
    });
  }
  next();
}

// ============================================================================
// 1. PUBLIC PLATFORM INFO
// ============================================================================
router.get('/info', (req, res) => {
  res.json({
    success: true,
    platform: 'Grexotix School Management Platform',
    tagline: 'Empowering Schools with Smart Management',
    brand: 'Product of Grexotix',
    company: 'Grexotix Technologies',
    version: '2.5.0-multitenant',
    logoUrl: 'assets/grexotix_logo.png',
    features: [
      'Multi-School SaaS Architecture & Tenant Isolation',
      'Unified Student Information & Attendance System',
      'Daily Digital Diary & Automated Homework Dispatch',
      'Flexible Fee Ledgers & Split-Payment Enforcement (30% Min)',
      'Digital Student ID Cards with Scannable Gate Pass QR',
      'Live Fleet GPS Tracking & Proximity Alerts',
      'Automated Staff Payroll & HR Operations'
    ],
    contact: {
      email: 'support@grexotix.com',
      phone: '+91 99999 00001',
      salesEmail: 'onboarding@grexotix.com',
      address: 'Grexotix Innovation Hub, Tech City, India'
    }
  });
});

// ============================================================================
// 2. PUBLIC SCHOOL REGISTRATION SUBMISSION
// ============================================================================
router.post('/register', (req, res) => {
  const {
    schoolName,
    displayName,
    schoolEmail,
    schoolPhone,
    address,
    city,
    state,
    postalCode,
    country,
    website,
    affiliationBoard,
    affiliationNumber,
    schoolType,
    approxStudents,
    campusesCount,
    desiredModules,
    preferredLanguage,
    repName,
    repDesignation,
    repEmail,
    repPhone,
    password
  } = req.body;

  // Validation: Mandatory Fields
  if (!schoolName || !displayName || !schoolEmail || !schoolPhone || !address || !city || !state || !postalCode) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in all mandatory school information fields (Name, Email, Phone, Address, City, State, Postal Code).'
    });
  }

  if (!repName || !repDesignation || !repEmail || !repPhone || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide complete authorized representative details including a secure password.'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters in length.'
    });
  }

  const cleanSchoolEmail = String(schoolEmail).trim().toLowerCase();
  const cleanRepEmail = String(repEmail).trim().toLowerCase();
  const cleanRepPhone = String(repPhone).replace(/\D/g, '').slice(-10);

  // Check for duplicate pending or approved registration
  const existingReg = db.get(
    `SELECT id, status FROM school_registrations WHERE LOWER(school_email) = ? OR LOWER(rep_email) = ?`,
    [cleanSchoolEmail, cleanRepEmail]
  );
  if (existingReg && (existingReg.status === 'PENDING_APPROVAL' || existingReg.status === 'APPROVED' || existingReg.status === 'ACTIVE')) {
    return res.status(409).json({
      success: false,
      error: `A registration for this school or representative email is already registered (Status: ${existingReg.status}).`
    });
  }

  // Check if representative email or mobile already exists in users
  const existingUser = db.get(
    `SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? OR mobile = ?`,
    [cleanRepEmail, cleanRepEmail, cleanRepPhone]
  );
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'A user account with this representative email or mobile number already exists on the platform.'
    });
  }

  // Generate Unique Registration Reference
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const registrationRef = `GRX-REG-${year}-${randomSuffix}`;

  // Hash password securely
  const passwordHash = bcrypt.hashSync(password, 10);
  const modulesJson = Array.isArray(desiredModules) ? JSON.stringify(desiredModules) : (desiredModules || '["attendance","homework","fees","id_cards"]');

  try {
    const insertResult = db.run(
      `INSERT INTO school_registrations (
        registration_ref, school_name, display_name, school_email, school_phone,
        address, city, state, postal_code, country, website,
        affiliation_board, affiliation_number, school_type, approx_students,
        campuses_count, desired_modules, preferred_language,
        rep_name, rep_designation, rep_email, rep_phone, rep_password_hash,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL')`,
      [
        registrationRef,
        schoolName.trim(),
        displayName.trim(),
        cleanSchoolEmail,
        schoolPhone.trim(),
        address.trim(),
        city.trim(),
        state.trim(),
        postalCode.trim(),
        country || 'India',
        website ? website.trim() : null,
        affiliationBoard || 'CBSE',
        affiliationNumber ? affiliationNumber.trim() : null,
        schoolType || 'K-12',
        approxStudents || '500-1000',
        parseInt(campusesCount, 10) || 1,
        modulesJson,
        preferredLanguage || 'English',
        repName.trim(),
        repDesignation.trim(),
        cleanRepEmail,
        cleanRepPhone,
        passwordHash
      ]
    );

    auditService.log({
      userId: 0,
      userRole: 'PUBLIC',
      action: 'SCHOOL_REGISTRATION_SUBMITTED',
      module: 'PLATFORM',
      recordId: insertResult.lastInsertRowid,
      details: `New school registration submitted for "${schoolName}" (Ref: ${registrationRef}) by ${repName} (${repDesignation})`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'School registration submitted successfully! Your application is pending review by Grexotix Platform Administrators.',
      registrationRef,
      status: 'PENDING_APPROVAL',
      schoolName: schoolName.trim(),
      repEmail: cleanRepEmail
    });
  } catch (err) {
    console.error('Registration insertion error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while saving school registration. Please try again.'
    });
  }
});

// ============================================================================
// 3. PUBLIC REGISTRATION STATUS CHECK
// ============================================================================
router.get('/registration-status/:ref', (req, res) => {
  const ref = req.params.ref.trim();
  const reg = db.get(
    `SELECT registration_ref, school_name, display_name, school_email, rep_name,
            rep_designation, rep_email, status, review_notes, created_at, reviewed_at
     FROM school_registrations WHERE registration_ref = ?`,
    [ref]
  );

  if (!reg) {
    return res.status(404).json({
      success: false,
      error: `No registration found with reference code "${ref}". Please verify the reference number.`
    });
  }

  res.json({
    success: true,
    registration: reg
  });
});

// ============================================================================
// 4. PLATFORM ADMIN: LIST & SEARCH REGISTRATIONS
// ============================================================================
router.get('/registrations', authenticate, requirePlatformAdmin, (req, res) => {
  const { status, search } = req.query;
  let sql = `SELECT * FROM school_registrations WHERE 1=1`;
  const params = [];

  if (status && status !== 'ALL') {
    sql += ` AND status = ?`;
    params.push(status);
  }

  if (search) {
    sql += ` AND (school_name LIKE ? OR rep_name LIKE ? OR registration_ref LIKE ? OR city LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  sql += ` ORDER BY created_at DESC`;

  const rows = db.query(sql, params);
  res.json({
    success: true,
    count: rows.length,
    registrations: rows.map(r => {
      // Do not expose password hash in listing
      const { rep_password_hash, ...safe } = r;
      return safe;
    })
  });
});

// ============================================================================
// 5. PLATFORM ADMIN: GET REGISTRATION DETAILS
// ============================================================================
router.get('/registrations/:id', authenticate, requirePlatformAdmin, (req, res) => {
  const reg = db.get(`SELECT * FROM school_registrations WHERE id = ?`, [req.params.id]);
  if (!reg) {
    return res.status(404).json({ success: false, error: 'Registration request not found.' });
  }
  const { rep_password_hash, ...safe } = reg;
  res.json({ success: true, registration: safe });
});

// ============================================================================
// 6. PLATFORM ADMIN: APPROVE REGISTRATION & PROVISION WORKSPACE
// ============================================================================
router.post('/registrations/:id/approve', authenticate, requirePlatformAdmin, (req, res) => {
  const regId = req.params.id;
  const reg = db.get(`SELECT * FROM school_registrations WHERE id = ?`, [regId]);

  if (!reg) {
    return res.status(404).json({ success: false, error: 'Registration request not found.' });
  }

  if (reg.status === 'APPROVED' || reg.status === 'ACTIVE') {
    return res.status(400).json({
      success: false,
      error: `Registration is already approved and active (School ID: ${reg.school_id}).`
    });
  }

  const reviewNotes = req.body.notes || 'Approved by Grexotix Platform Administrator.';

  try {
    // Generate unique school code
    const cityCode = (reg.city || 'SCH').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'SCH';
    const nextNum = (db.get(`SELECT COUNT(*) as cnt FROM schools`)?.cnt || 0) + 1;
    const schoolCode = `GRX-${cityCode}-${String(nextNum).padStart(3, '0')}`;

    // 1. Insert into schools table
    const schoolResult = db.run(
      `INSERT INTO schools (
        code, name, display_name, email, phone, address, city, state, postal_code, country,
        website, logo_url, affiliation_board, affiliation_number, school_type, approx_students,
        campuses_count, status, subscription_plan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ENTERPRISE')`,
      [
        schoolCode,
        reg.school_name,
        reg.display_name,
        reg.school_email,
        reg.school_phone,
        reg.address,
        reg.city,
        reg.state,
        reg.postal_code,
        reg.country,
        reg.website,
        'assets/logo.png',
        reg.affiliation_board,
        reg.affiliation_number,
        reg.school_type,
        parseInt(reg.approx_students, 10) || 500,
        reg.campuses_count || 1
      ]
    );

    const newSchoolId = schoolResult.lastInsertRowid;

    // 2. Provision Representative as School Super Admin user
    const username = reg.rep_email.split('@')[0] + '.' + String(newSchoolId);
    let userMobile = reg.rep_phone;
    if (userMobile) {
      const mobileInUse = db.get(`SELECT id FROM users WHERE mobile = ?`, [userMobile]);
      if (mobileInUse) userMobile = null;
    }
    const userResult = db.run(
      `INSERT INTO users (
        username, email, mobile, password_hash, role, status, school_id
      ) VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 'active', ?)`,
      [
        username,
        reg.rep_email,
        userMobile,
        reg.rep_password_hash,
        newSchoolId
      ]
    );

    // 3. Initialize default school settings record
    db.run(
      `INSERT INTO school_settings (
        school_id, school_name, affiliation_no, school_code, address, phone, email,
        website, logo_url, academic_year, timings, config_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newSchoolId,
        reg.school_name,
        reg.affiliation_number || 'Affiliation Pending',
        schoolCode,
        `${reg.address}, ${reg.city}, ${reg.state} - ${reg.postal_code}`,
        reg.school_phone,
        reg.school_email,
        reg.website || 'https://grexotix.com',
        'assets/logo.png',
        '2026-2027',
        '08:30 AM - 03:45 PM',
        JSON.stringify({
          attendanceCutoff: '09:30 AM',
          enableSmsAlerts: true,
          proximityRadiusMeters: 500,
          desiredModules: reg.desired_modules ? JSON.parse(reg.desired_modules) : []
        })
      ]
    );

    // 4. Update registration record
    db.run(
      `UPDATE school_registrations SET
        status = 'APPROVED',
        school_id = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = ?
       WHERE id = ?`,
      [newSchoolId, req.user.id, reviewNotes, regId]
    );

    // 5. Log audit trail
    auditService.log({
      userId: req.user.id,
      userRole: 'PLATFORM_ADMIN',
      action: 'SCHOOL_WORKSPACE_PROVISIONED',
      module: 'PLATFORM',
      recordId: newSchoolId,
      details: `Platform Admin ${req.user.username} approved "${reg.school_name}" (School Code: ${schoolCode}, Super Admin: ${reg.rep_email})`,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `School "${reg.school_name}" approved successfully! Workspace initialized.`,
      schoolId: newSchoolId,
      schoolCode,
      superAdminUser: {
        id: userResult.lastInsertRowid,
        username,
        email: reg.rep_email,
        role: 'SUPER_ADMIN'
      }
    });
  } catch (err) {
    console.error('School approval error:', err);
    return res.status(500).json({
      success: false,
      error: `Failed to provision school workspace: ${err.message}`
    });
  }
});

// ============================================================================
// 7. PLATFORM ADMIN: REJECT REGISTRATION
// ============================================================================
router.post('/registrations/:id/reject', authenticate, requirePlatformAdmin, (req, res) => {
  const regId = req.params.id;
  const reason = req.body.reason || 'Verification criteria not met. Please contact Grexotix Platform Support.';

  const reg = db.get(`SELECT * FROM school_registrations WHERE id = ?`, [regId]);
  if (!reg) {
    return res.status(404).json({ success: false, error: 'Registration request not found.' });
  }

  db.run(
    `UPDATE school_registrations SET
      status = 'REJECTED',
      reviewed_by = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      review_notes = ?
     WHERE id = ?`,
    [req.user.id, reason, regId]
  );

  auditService.log({
    userId: req.user.id,
    userRole: 'PLATFORM_ADMIN',
    action: 'SCHOOL_REGISTRATION_REJECTED',
    module: 'PLATFORM',
    recordId: parseInt(regId, 10),
    details: `Registration for "${reg.school_name}" rejected by ${req.user.username}. Reason: ${reason}`,
    ipAddress: req.ip
  });

  res.json({
    success: true,
    message: `Registration for "${reg.school_name}" has been rejected.`,
    status: 'REJECTED'
  });
});

// ============================================================================
// 8. PLATFORM ADMIN: LIST ALL SCHOOLS ON PLATFORM
// ============================================================================
router.get('/schools', authenticate, requirePlatformAdmin, (req, res) => {
  const schools = db.query(`SELECT * FROM schools ORDER BY id ASC`);

  const enriched = schools.map(sch => {
    const studentCount = db.get(`SELECT COUNT(*) as count FROM students WHERE school_id = ?`, [sch.id])?.count || 0;
    const teacherCount = db.get(`SELECT COUNT(*) as count FROM teachers WHERE school_id = ?`, [sch.id])?.count || 0;
    const classCount = db.get(`SELECT COUNT(*) as count FROM classes WHERE school_id = ?`, [sch.id])?.count || 0;

    return {
      ...sch,
      activeStudents: studentCount,
      activeTeachers: teacherCount,
      activeClasses: classCount
    };
  });

  res.json({
    success: true,
    count: enriched.length,
    schools: enriched
  });
});

// ============================================================================
// 9. PLATFORM ADMIN: SUSPEND / REACTIVATE SCHOOL
// ============================================================================
router.post('/schools/:id/suspend', authenticate, requirePlatformAdmin, (req, res) => {
  const schoolId = req.params.id;
  const reason = req.body.reason || 'Administrative hold';

  const school = db.get(`SELECT * FROM schools WHERE id = ?`, [schoolId]);
  if (!school) {
    return res.status(404).json({ success: false, error: 'School not found.' });
  }

  db.run(`UPDATE schools SET status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [schoolId]);

  auditService.log({
    userId: req.user.id,
    userRole: 'PLATFORM_ADMIN',
    action: 'SCHOOL_SUSPENDED',
    module: 'PLATFORM',
    recordId: parseInt(schoolId, 10),
    details: `School "${school.name}" suspended by ${req.user.username}. Reason: ${reason}`,
    ipAddress: req.ip
  });

  res.json({ success: true, message: `School "${school.name}" has been suspended.` });
});

router.post('/schools/:id/reactivate', authenticate, requirePlatformAdmin, (req, res) => {
  const schoolId = req.params.id;
  const school = db.get(`SELECT * FROM schools WHERE id = ?`, [schoolId]);
  if (!school) {
    return res.status(404).json({ success: false, error: 'School not found.' });
  }

  db.run(`UPDATE schools SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [schoolId]);

  auditService.log({
    userId: req.user.id,
    userRole: 'PLATFORM_ADMIN',
    action: 'SCHOOL_REACTIVATED',
    module: 'PLATFORM',
    recordId: parseInt(schoolId, 10),
    details: `School "${school.name}" reactivated by ${req.user.username}.`,
    ipAddress: req.ip
  });

  res.json({ success: true, message: `School "${school.name}" is now active.` });
});

// ============================================================================
// 10. PLATFORM ADMIN: PLATFORM OVERVIEW ANALYTICS
// ============================================================================
router.get('/analytics', authenticate, requirePlatformAdmin, (req, res) => {
  const totalSchools = db.get(`SELECT COUNT(*) as count FROM schools`)?.count || 0;
  const activeSchools = db.get(`SELECT COUNT(*) as count FROM schools WHERE status = 'ACTIVE'`)?.count || 0;
  const pendingRegistrations = db.get(`SELECT COUNT(*) as count FROM school_registrations WHERE status = 'PENDING_APPROVAL'`)?.count || 0;
  const totalStudents = db.get(`SELECT COUNT(*) as count FROM students`)?.count || 0;
  const totalTeachers = db.get(`SELECT COUNT(*) as count FROM teachers`)?.count || 0;

  res.json({
    success: true,
    analytics: {
      totalSchools,
      activeSchools,
      pendingRegistrations,
      totalStudents,
      totalTeachers,
      platformStatus: 'Operational',
      platformVersion: '2.5.0-multitenant',
      brand: 'Product of Grexotix'
    }
  });
});

module.exports = router;
