const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const config = require('../config/env');
const otpService = require('../services/otpService');
const auditService = require('../services/auditService');
const emailService = require('../services/emailService');
const authenticate = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

/**
 * Helper to generate JWT token
 */
function createToken(userId, role, schoolId = null) {
  return jwt.sign({ userId, role, schoolId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

function getRolePermissions(role) {
  try {
    const rows = db.query(
      `SELECT permission_code FROM role_permissions WHERE role = ?`,
      [role]
    );
    return rows.map(r => r.permission_code);
  } catch (e) {
    return [];
  }
}

// ----------------------------------------------------------------------------
// 0. UNIFIED LOGIN ENDPOINT (Supports Super Admin, Teacher, and Parent)
// ----------------------------------------------------------------------------
router.post(['/', '/login'], authLimiter, (req, res) => {
  const identifier = req.body.identifier || req.body.email || req.body.username || req.body.emailOrUsername || req.body.mobile || req.body.mobile_number || req.body.parentMobile || req.body.phone;
  const password = req.body.password;
  const requestedRole = req.body.role;
  const otp = req.body.otp;
  const admissionNo = req.body.admissionNo;

  if (!identifier) {
    return res.status(400).json({
      success: false,
      error: 'Please provide email, username, or mobile number.'
    });
  }

  const cleanIdent = String(identifier || '').trim();

  // 1. If mobile number and OTP are provided -> Teacher OTP verification
  if (otp && /^\d{10}$/.test(cleanIdent.replace(/\D/g, ''))) {
    const cleanMobile = cleanIdent.replace(/\D/g, '').slice(-10);
    const verification = otpService.verifyOtp(cleanMobile, otp);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.message || 'Invalid or expired OTP.'
      });
    }
    const teacher = db.get(
      `SELECT t.*, u.id as user_id, u.role, u.status as user_status
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.mobile = ?`,
      [cleanMobile]
    );
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher account not found for this mobile number.' });
    }
    const token = createToken(teacher.user_id, 'TEACHER');
    return res.json({
      success: true,
      message: 'Teacher authenticated successfully.',
      token,
      role: 'TEACHER',
      permissions: getRolePermissions('TEACHER'),
      user: { id: teacher.user_id, name: teacher.name, mobile: teacher.mobile, email: teacher.email, role: 'TEACHER' },
      teacher
    });
  }

  // 2. Query user from users table by username, email, or mobile (with domain aliases)
  const altIdent = cleanIdent.includes('@grexotix.edu')
    ? cleanIdent.replace('@grexotix.edu', '@rex.edu')
    : (cleanIdent.includes('@rex.edu') ? cleanIdent.replace('@rex.edu', '@grexotix.edu') : cleanIdent);

  const user = db.get(
    `SELECT * FROM users WHERE username = ? OR email = ? OR username = ? OR email = ? OR mobile = ?`,
    [cleanIdent, cleanIdent, altIdent, altIdent, cleanIdent.replace(/\D/g, '').slice(-10) || cleanIdent]
  );

  // If password provided and user exists in users table
  if (user && password) {
    if (requestedRole && user.role !== requestedRole) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Account does not have ${requestedRole} privileges.`
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been disabled. Please contact system support.'
      });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Incorrect password.'
      });
    }

    db.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
    const token = createToken(user.id, user.role);

    let teacher = null;
    if (user.role === 'TEACHER') {
      teacher = db.get(`SELECT * FROM teachers WHERE user_id = ?`, [user.id]);
    }

    let parent = null;
    let linkedStudents = [];
    if (user.role === 'PARENT') {
      parent = db.get(`SELECT * FROM parents WHERE user_id = ?`, [user.id]);
      if (parent) {
        linkedStudents = db.query(
          `SELECT s.*, c.name as class_name, sec.name as section_name
           FROM students s
           JOIN classes c ON s.class_id = c.id
           JOIN sections sec ON s.section_id = sec.id
           WHERE s.id IN (
             SELECT student_id FROM student_parents WHERE parent_id = ?
             UNION
             SELECT id FROM students WHERE parent_id = ?
           ) AND s.status = 'active'`,
          [parent.id, parent.id]
        );
      }
    }

    let school = null;
    if (user.school_id) {
      school = db.get(`SELECT id, code, name, display_name, status, logo_url, address, city, phone, email, website FROM schools WHERE id = ?`, [user.school_id]);
      if (school && school.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          error: 'This school workspace has been suspended. Please contact Grexotix Platform Support.'
        });
      }
    }

    auditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      details: `User ${user.username} (${user.role}) logged in successfully`,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Authenticated successfully.',
      token,
      role: user.role,
      isPlatformAdmin: user.role === 'PLATFORM_ADMIN',
      school,
      schoolId: user.school_id,
      permissions: getRolePermissions(user.role),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.role === 'PLATFORM_ADMIN' ? 'Grexotix Platform Admin' : (teacher ? teacher.name : (parent ? parent.name : (school ? `${school.display_name} Administrator` : 'School Administrator'))),
        role: user.role,
        status: user.status,
        school_id: user.school_id
      },
      ...(teacher ? { teacher } : {}),
      ...(parent ? { parent, students: linkedStudents, children: linkedStudents, activeStudent: linkedStudents[0] } : {})
    });
  }

  // 3. Parent mobile authentication without password or with student admission number
  const cleanMobile = cleanIdent.replace(/\D/g, '').slice(-10);
  if (cleanMobile.length === 10) {
    const parentRec = db.get(
      `SELECT p.*, u.id as user_id, u.password_hash, u.status as user_status
       FROM parents p
       JOIN users u ON p.user_id = u.id
       WHERE REPLACE(REPLACE(REPLACE(p.mobile, '+91', ''), ' ', ''), '-', '') LIKE '%' || ?
          OR p.mobile = ?
          OR p.mobile = ?`,
      [cleanMobile, cleanMobile, `+91${cleanMobile}`]
    );

    if (parentRec) {
      if (password && parentRec.password_hash) {
        const passwordMatch = bcrypt.compareSync(password, parentRec.password_hash);
        if (!passwordMatch) {
          return res.status(401).json({ success: false, error: 'Invalid credentials. Incorrect password.' });
        }
      }

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
         ) AND s.status = 'active'`,
        [parentRec.id, parentRec.id, cleanMobile]
      );

      if (linkedStudents.length > 0) {
        let activeStudent = linkedStudents[0];
        if (admissionNo) {
          const matched = linkedStudents.find(s => s.admission_no.toUpperCase() === String(admissionNo).trim().toUpperCase());
          if (matched) activeStudent = matched;
        }

        db.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [parentRec.user_id]);
        const token = createToken(parentRec.user_id, 'PARENT');

        return res.json({
          success: true,
          message: 'Parent authenticated successfully.',
          token,
          role: 'PARENT',
          permissions: getRolePermissions('PARENT'),
          user: {
            id: parentRec.user_id,
            name: parentRec.name,
            mobile: `+91${cleanMobile}`,
            email: parentRec.email,
            role: 'PARENT'
          },
          parent: { id: parentRec.id, name: parentRec.name, mobile: `+91${cleanMobile}`, email: parentRec.email },
          activeStudent,
          children: linkedStudents,
          students: linkedStudents
        });
      }
    }
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. User not found.'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both email/username and password.'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid credentials. Incorrect password.'
  });
});

// ----------------------------------------------------------------------------
// 1. SUPER ADMIN LOGIN
// ----------------------------------------------------------------------------
router.post('/admin/login', authLimiter, (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both email/username and password.'
    });
  }

  const cleanIdent = emailOrUsername.trim();
  const altIdent = cleanIdent.includes('@grexotix.com')
    ? cleanIdent.replace('@grexotix.com', '@rex.edu')
    : (cleanIdent.includes('@rex.edu') ? cleanIdent.replace('@rex.edu', '@grexotix.com') : cleanIdent);

  const user = db.get(
    `SELECT * FROM users WHERE (username = ? OR email = ? OR username = ? OR email = ?)`,
    [cleanIdent, cleanIdent, altIdent, altIdent]
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. User not found.'
    });
  }

  // Role check: Must be SUPER_ADMIN or PLATFORM_ADMIN
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
    auditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN_REJECTED_ROLE_MISMATCH',
      module: 'AUTH',
      details: `User with role ${user.role} attempted Admin login`,
      ipAddress: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied. Account does not have administrative privileges.'
    });
  }

  if (user.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Your account has been disabled. Please contact system support.'
    });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. Incorrect password.'
    });
  }

  let school = null;
  if (user.school_id) {
    school = db.get(`SELECT id, code, name, display_name, status, logo_url, address, city, phone, email, website FROM schools WHERE id = ?`, [user.school_id]);
    if (school && school.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'This school workspace has been suspended. Please contact Grexotix Platform Support.'
      });
    }
  }

  // Update last login
  db.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

  const token = createToken(user.id, user.role);

  auditService.log({
    userId: user.id,
    userRole: user.role,
    action: 'ADMIN_LOGIN_SUCCESS',
    module: 'AUTH',
    details: `${user.role} (${user.username}) logged in successfully`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: `${user.role === 'PLATFORM_ADMIN' ? 'Platform Administrator' : 'School Administrator'} authenticated successfully.`,
    token,
    role: user.role,
    isPlatformAdmin: user.role === 'PLATFORM_ADMIN',
    school,
    schoolId: user.school_id,
    permissions: getRolePermissions(user.role),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.role === 'PLATFORM_ADMIN' ? 'Grexotix Platform Admin' : (school ? `${school.display_name} Administrator` : 'School Administrator'),
      role: user.role,
      status: user.status,
      school_id: user.school_id
    }
  });
});

// ----------------------------------------------------------------------------
// 2. TEACHER AUTHENTICATION (Mobile Number + OTP)
// ----------------------------------------------------------------------------
router.post(['/teacher/send-otp', '/teacher/request-otp'], otpLimiter, (req, res) => {
  const mobile = req.body.mobile || req.body.mobile_number;

  if (!mobile || !/^\d{10}$/.test(String(mobile).trim())) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid 10-digit mobile number.'
    });
  }

  const cleanMobile = String(mobile).trim();

  // Check if teacher exists with this mobile
  const teacher = db.get(
    `SELECT t.*, u.status as user_status
     FROM teachers t
     LEFT JOIN users u ON t.user_id = u.id
     WHERE t.mobile = ?`,
    [cleanMobile]
  );

  if (!teacher) {
    return res.status(404).json({
      success: false,
      error: 'Teacher account not found for this mobile number. Please contact the administrator.'
    });
  }

  if (teacher.status === 'disabled' || teacher.user_status === 'disabled') {
    return res.status(403).json({
      success: false,
      error: 'Your teacher account has been disabled. Please contact the school administrator.'
    });
  }

  const otpData = otpService.generateOtp(cleanMobile, 'TEACHER');

  return res.json({
    success: true,
    message: `OTP sent successfully to +91 ${cleanMobile}.`,
    expiresAt: otpData.expiresAt,
    ...(otpData.isDev ? { devOtp: otpData.otp, note: 'Development mode: Use this OTP to test' } : {})
  });
});

router.post(['/teacher/verify-otp', '/teacher/verify'], authLimiter, (req, res) => {
  const mobile = req.body.mobile || req.body.mobile_number;
  const otp = req.body.otp;

  if (!mobile || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Mobile number and OTP are required.'
    });
  }

  const cleanMobile = String(mobile).trim();
  const verification = otpService.verifyOtp(cleanMobile, otp);

  if (!verification.valid) {
    return res.status(400).json({
      success: false,
      error: verification.message || 'Invalid or expired OTP.'
    });
  }

  // Load teacher & user account
  const teacher = db.get(
    `SELECT t.*, u.id as user_id, u.role, u.status as user_status, u.school_id
     FROM teachers t
     JOIN users u ON t.user_id = u.id
     WHERE t.mobile = ?`,
    [cleanMobile]
  );

  if (!teacher || teacher.role !== 'TEACHER') {
    return res.status(403).json({
      success: false,
      error: 'Teacher account verification failed. Account does not match role.'
    });
  }

  if (teacher.school_id) {
    const school = db.get(`SELECT status FROM schools WHERE id = ?`, [teacher.school_id]);
    if (school && school.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'This school workspace has been suspended. Please contact Grexotix Platform Support.'
      });
    }
  }

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

  // Update last login
  db.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [teacher.user_id]);

  const token = createToken(teacher.user_id, 'TEACHER');

  auditService.log({
    userId: teacher.user_id,
    userRole: 'TEACHER',
    action: 'TEACHER_OTP_LOGIN_SUCCESS',
    module: 'AUTH',
    recordId: teacher.id,
    details: `Teacher ${teacher.name} logged in via OTP`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Teacher authenticated successfully.',
    token,
    role: 'TEACHER',
    permissions: getRolePermissions('TEACHER'),
    user: {
      id: teacher.user_id,
      name: teacher.name,
      mobile: teacher.mobile,
      email: teacher.email,
      role: 'TEACHER'
    },
    teacher
  });
});

// ----------------------------------------------------------------------------
// 3. PARENT LOGIN (Mobile Number Based Multi-Child Authentication)
// ----------------------------------------------------------------------------
function normalizeMobile(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

router.post('/parent/login', authLimiter, (req, res) => {
  const rawMobile = req.body.mobile || req.body.mobile_number || req.body.parentMobile || req.body.phone ||
    (/^\d{10}$/.test(String(req.body.admissionNo || '').trim()) ? req.body.admissionNo : null);
  const { admissionNo, password } = req.body;

  if (!rawMobile) {
    return res.status(400).json({
      success: false,
      error: 'Please enter Parent Registered Mobile Number.'
    });
  }

  const cleanMobile = normalizeMobile(rawMobile);
  if (cleanMobile.length !== 10) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid 10-digit registered mobile number.'
    });
  }

  // Find Parent by mobile (checking normalized, +91, and plain)
  let parent = db.get(
    `SELECT p.*, u.id as user_id, u.password_hash, u.status as user_status
     FROM parents p
     JOIN users u ON p.user_id = u.id
     WHERE REPLACE(REPLACE(REPLACE(p.mobile, '+91', ''), ' ', ''), '-', '') LIKE '%' || ?
        OR p.mobile = ?
        OR p.mobile = ?`,
    [cleanMobile, cleanMobile, `+91${cleanMobile}`]
  );

  // Fallback: If parent record not yet created, find via student.parent_mobile
  if (!parent) {
    const studentWithMobile = db.get(
      `SELECT parent_id, parent_mobile FROM students
       WHERE REPLACE(REPLACE(REPLACE(parent_mobile, '+91', ''), ' ', ''), '-', '') LIKE '%' || ?
       LIMIT 1`,
      [cleanMobile]
    );

    if (studentWithMobile && studentWithMobile.parent_id) {
      parent = db.get(
        `SELECT p.*, u.id as user_id, u.password_hash, u.status as user_status
         FROM parents p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [studentWithMobile.parent_id]
      );
    }
  }

  if (!parent) {
    return res.status(404).json({
      success: false,
      error: 'Parent mobile number is not registered. Please contact the school office.'
    });
  }

  if (parent.user_status === 'disabled') {
    return res.status(403).json({
      success: false,
      error: 'Your parent account has been disabled. Please contact the school administration.'
    });
  }

  // Check if school is suspended
  const parentUser = db.get(`SELECT school_id FROM users WHERE id = ?`, [parent.user_id]);
  if (parentUser && parentUser.school_id) {
    const school = db.get(`SELECT status FROM schools WHERE id = ?`, [parentUser.school_id]);
    if (school && school.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'This school workspace has been suspended. Please contact Grexotix Platform Support.'
      });
    }
  }

  // If password was provided, verify it (otherwise allow direct mobile authentication)
  if (password && parent.password_hash) {
    const passwordMatch = bcrypt.compareSync(password, parent.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Please check your credentials.'
      });
    }
  }

  // Fetch ALL linked students for this parent (Multi-Child support across relationships and parent mobile)
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
    [parent.id, parent.id, cleanMobile]
  );

  if (linkedStudents.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No active student records linked to this parent mobile number.'
    });
  }

  let activeStudent = linkedStudents[0];

  // If admissionNo was optionally provided, match it against linked children
  if (admissionNo) {
    const cleanAdm = String(admissionNo).trim().toUpperCase();
    const matched = linkedStudents.find(s => {
      const sAdm = s.admission_no.toUpperCase();
      return sAdm === cleanAdm ||
             sAdm.replace(/^(REX|GRX)-/, '') === cleanAdm.replace(/^(REX|GRX)-/, '') ||
             sAdm.includes(cleanAdm);
    });
    if (matched) {
      activeStudent = matched;
    }
  }

  // Update last login
  db.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [parent.user_id]);

  const token = createToken(parent.user_id, 'PARENT');

  auditService.log({
    userId: parent.user_id,
    userRole: 'PARENT',
    action: 'PARENT_LOGIN_SUCCESS',
    module: 'AUTH',
    recordId: parent.id,
    details: `Parent ${parent.name} logged in via mobile +91 ${cleanMobile} (${linkedStudents.length} children linked)`,
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Parent authenticated successfully.',
    token,
    role: 'PARENT',
    permissions: getRolePermissions('PARENT'),
    user: {
      id: parent.user_id,
      name: parent.name,
      mobile: `+91${cleanMobile}`,
      email: parent.email,
      role: 'PARENT'
    },
    parent: {
      id: parent.id,
      name: parent.name,
      mobile: `+91${cleanMobile}`,
      email: parent.email,
      address: parent.address
    },
    activeStudent,
    children: linkedStudents,
    students: linkedStudents
  });
});

// ----------------------------------------------------------------------------
// 4. GET CURRENT AUTHENTICATED USER PROFILE
// ----------------------------------------------------------------------------
router.get('/me', authenticate, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
    role: req.user.role,
    permissions: getRolePermissions(req.user.role),
    teacher: req.teacher || null,
    parent: req.parent || null
  });
});

// ----------------------------------------------------------------------------
// 5. LOGOUT
// ----------------------------------------------------------------------------
router.post('/logout', authenticate, (req, res) => {
  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'LOGOUT',
    module: 'AUTH',
    details: 'User logged out',
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

// ============================================================================
// 6. SaaS SCHOOL SELF-SERVICE REGISTRATION (Phase 2 & Phase 3)
// ============================================================================
router.post('/register-school', authLimiter, async (req, res) => {
  const {
    schoolName,
    displayName,
    address,
    city,
    state,
    postalCode,
    country,
    schoolEmail,
    schoolPhone,
    adminName,
    adminEmail,
    adminMobile,
    password,
    confirmPassword,
    website,
    affiliationBoard,
    affiliationNumber
  } = req.body;

  // 1. Mandatory Input Validation
  if (!schoolName || !address || !city || !state || !postalCode || !schoolEmail || !schoolPhone) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in all mandatory school fields (Name, Address, City, State, Postal Code, School Email, School Phone).'
    });
  }

  if (!adminName || !adminEmail || !adminMobile || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide complete administrator details (Full Name, Email, Mobile, and Password).'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters in length.'
    });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'Password and password confirmation do not match.'
    });
  }

  const cleanSchoolEmail = String(schoolEmail).trim().toLowerCase();
  const cleanSchoolPhone = String(schoolPhone).trim();
  const cleanAdminEmail = String(adminEmail).trim().toLowerCase();
  const cleanAdminMobile = String(adminMobile).replace(/\D/g, '').slice(-10);

  // 2. Prevent Duplicate Registrations
  const existingSchool = db.get(
    `SELECT id, code, name FROM schools WHERE LOWER(email) = ? OR phone = ?`,
    [cleanSchoolEmail, cleanSchoolPhone]
  );
  if (existingSchool) {
    return res.status(409).json({
      success: false,
      error: `A school with this email address or phone number is already registered (School ID: ${existingSchool.code}).`
    });
  }

  const existingUser = db.get(
    `SELECT id FROM users WHERE LOWER(email) = ? OR mobile = ?`,
    [cleanAdminEmail, cleanAdminMobile]
  );
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'An administrator account with this email address or mobile number already exists.'
    });
  }

  // 3. Generate Unique, Permanent, Immutable School ID (GRX-SCH-XXXXXX)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let schoolId = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    schoolId = `GRX-SCH-${randomPart}`;
    const check = db.get(`SELECT id FROM schools WHERE code = ?`, [schoolId]);
    if (!check) isUnique = true;
  }

  const now = new Date();
  const trialDays = 7;
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 3600 * 1000);
  const trialStartsStr = now.toISOString().replace('T', ' ').slice(0, 19);
  const trialEndsStr = trialEnds.toISOString().replace('T', ' ').slice(0, 19);

  // 4. Hash Password
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    // 5. Create School Tenant in Database
    const schoolInsert = db.run(
      `INSERT INTO schools (
        code, name, display_name, email, phone, address, city, state, postal_code, country,
        website, affiliation_board, affiliation_number, status, subscription_plan,
        trial_starts_at, trial_ends_at, subscription_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'TRIAL', ?, ?, 'TRIAL_ACTIVE')`,
      [
        schoolId,
        schoolName.trim(),
        (displayName || schoolName).trim(),
        cleanSchoolEmail,
        cleanSchoolPhone,
        address.trim(),
        city.trim(),
        state.trim(),
        postalCode.trim(),
        country || 'India',
        website ? website.trim() : null,
        affiliationBoard || 'CBSE',
        affiliationNumber ? affiliationNumber.trim() : null,
        trialStartsStr,
        trialEndsStr
      ]
    );

    const newSchoolDbId = schoolInsert.lastInsertRowid;

    // 6. Create Initial School Admin Account
    const username = cleanAdminEmail.split('@')[0] + '.' + String(newSchoolDbId);
    const userInsert = db.run(
      `INSERT INTO users (
        username, email, mobile, password_hash, role, status, school_id
      ) VALUES (?, ?, ?, ?, 'SCHOOL_ADMIN', 'active', ?)`,
      [
        username,
        cleanAdminEmail,
        cleanAdminMobile,
        passwordHash,
        newSchoolDbId
      ]
    );

    const newUserId = userInsert.lastInsertRowid;

    // 7. Initialize School Settings
    db.run(
      `INSERT INTO school_settings (
        school_id, school_name, affiliation_no, school_code, address, phone, email,
        website, logo_url, academic_year, timings, config_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newSchoolDbId,
        schoolName.trim(),
        affiliationNumber || 'Affiliation Pending',
        schoolId,
        `${address.trim()}, ${city.trim()}, ${state.trim()} - ${postalCode.trim()}`,
        cleanSchoolPhone,
        cleanSchoolEmail,
        website || 'https://grexotix.com',
        'assets/logo.png',
        '2026-2027',
        '08:30 AM - 03:45 PM',
        JSON.stringify({
          attendanceCutoff: '09:30 AM',
          enableSmsAlerts: true,
          proximityRadiusMeters: 500,
          trialStartsAt: trialStartsStr,
          trialEndsAt: trialEndsStr
        })
      ]
    );

    // 8. Record Initial Subscription History (7-Day Trial)
    db.run(
      `INSERT INTO school_subscriptions (
        school_id, school_id_code, plan_id, plan_name, billing_cycle, amount, currency,
        status, trial_starts_at, trial_ends_at, payment_gateway,
        transaction_ref, payment_status, invoice_number, created_at
      ) VALUES (?, ?, 'TRIAL', '7-Day Free Trial', 'MONTHLY', 0, 'INR', 'TRIAL_ACTIVE', ?, ?, 'FREE_TRIAL', 'TRIAL_INITIAL', 'PAID', ?, CURRENT_TIMESTAMP)`,
      [
        newSchoolDbId,
        schoolId,
        trialStartsStr,
        trialEndsStr,
        `INV-TRIAL-${newSchoolDbId}`
      ]
    );

    // 9. Dispatch Automated Registration Email
    await emailService.sendRegistrationConfirmation({
      schoolId,
      schoolDbId: newSchoolDbId,
      schoolName: schoolName.trim(),
      adminName: adminName.trim(),
      adminEmail: cleanAdminEmail,
      trialEndsAt: trialEndsStr
    });

    // 10. Audit Log
    auditService.log({
      userId: newUserId,
      userRole: 'SCHOOL_ADMIN',
      action: 'SCHOOL_REGISTERED',
      module: 'SaaS',
      recordId: newSchoolDbId,
      details: `New school registered: "${schoolName}" (ID: ${schoolId}) with 7-Day Free Trial`,
      ipAddress: req.ip
    });

    // 11. Generate JWT Token
    const token = createToken(newUserId, 'SCHOOL_ADMIN', newSchoolDbId);

    return res.status(201).json({
      success: true,
      message: 'School registered successfully! Your 7-day free trial has been activated.',
      schoolId,
      school: {
        id: newSchoolDbId,
        code: schoolId,
        name: schoolName.trim(),
        displayName: (displayName || schoolName).trim(),
        email: cleanSchoolEmail,
        phone: cleanSchoolPhone,
        address: address.trim(),
        city: city.trim(),
        status: 'ACTIVE'
      },
      trial: {
        startsAt: trialStartsStr,
        endsAt: trialEndsStr,
        daysRemaining: trialDays,
        status: 'TRIAL_ACTIVE'
      },
      token,
      user: {
        id: newUserId,
        username,
        name: adminName.trim(),
        email: cleanAdminEmail,
        mobile: cleanAdminMobile,
        role: 'SCHOOL_ADMIN',
        school_id: newSchoolDbId
      }
    });
  } catch (err) {
    console.error('Error during school registration:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while registering the school. Please try again.'
    });
  }
});

// ============================================================================
// 7. EXISTING SCHOOL LOGIN WITH SCHOOL ID (Phase 2)
// ============================================================================
router.post('/school-login', authLimiter, (req, res) => {
  const { schoolId, identifier, email, username, password } = req.body;
  const userIdent = identifier || email || username;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your unique School ID (e.g. GRX-SCH-XXXXXX).'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your password.'
    });
  }

  const cleanSchoolId = String(schoolId).trim().toUpperCase();

  // Find school by School ID code
  const school = db.get(
    `SELECT * FROM schools WHERE UPPER(code) = ? OR code = ?`,
    [cleanSchoolId, cleanSchoolId]
  );

  if (!school) {
    return res.status(404).json({
      success: false,
      error: `No school found with School ID "${cleanSchoolId}". Please verify the School ID or register your school.`
    });
  }

  if (school.status === 'SUSPENDED') {
    return res.status(403).json({
      success: false,
      error: 'This school workspace has been suspended by Grexotix Platform Administration. Please contact support@grexotix.com.'
    });
  }

  // Find user belonging to this school
  let user;
  if (userIdent) {
    const cleanUser = String(userIdent).trim().toLowerCase();
    user = db.get(
      `SELECT * FROM users WHERE school_id = ? AND (LOWER(email) = ? OR LOWER(username) = ? OR mobile = ?)`,
      [school.id, cleanUser, cleanUser, cleanUser]
    );
  } else {
    // If only School ID and password are provided, authenticate school administrator directly
    user = db.get(
      `SELECT * FROM users WHERE school_id = ? AND role IN ('SCHOOL_ADMIN', 'SUPER_ADMIN') LIMIT 1`,
      [school.id]
    );
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials or user does not belong to this school.'
    });
  }

  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid School ID or password.'
    });
  }

  // Calculate dynamic trial status
  const now = new Date();
  let daysRemaining = 0;
  let isTrialActive = false;
  let isTrialExpired = false;

  if (school.trial_ends_at) {
    const trialEnd = new Date(school.trial_ends_at);
    const ms = trialEnd.getTime() - now.getTime();
    if (ms > 0) {
      daysRemaining = Math.ceil(ms / (1000 * 60 * 60 * 24));
      isTrialActive = true;
    } else {
      isTrialExpired = true;
    }
  }

  let effectiveStatus = school.subscription_status || 'TRIAL_ACTIVE';
  if (effectiveStatus !== 'ACTIVE_SUBSCRIPTION') {
    effectiveStatus = isTrialExpired ? 'TRIAL_EXPIRED' : (daysRemaining <= 3 ? 'TRIAL_EXPIRING' : 'TRIAL_ACTIVE');
  }

  const token = createToken(user.id, user.role, school.id);

  // Update last login
  db.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

  return res.json({
    success: true,
    message: 'Signed in successfully.',
    token,
    role: user.role,
    permissions: getRolePermissions(user.role),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      school_id: school.id
    },
    school: {
      id: school.id,
      code: school.code,
      name: school.name,
      displayName: school.display_name,
      subscriptionStatus: effectiveStatus,
      trialEndsAt: school.trial_ends_at
    },
    trial: {
      startsAt: school.trial_starts_at,
      endsAt: school.trial_ends_at,
      daysRemaining,
      isActive: isTrialActive && effectiveStatus !== 'ACTIVE_SUBSCRIPTION',
      isExpired: isTrialExpired && effectiveStatus !== 'ACTIVE_SUBSCRIPTION'
    }
  });
});

// ============================================================================
// 8. PASSWORD RESET & ACCOUNT RECOVERY
// ============================================================================
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email, schoolId } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Please enter your registered email address.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  let user;

  if (schoolId) {
    const cleanSch = String(schoolId).trim().toUpperCase();
    const sch = db.get(`SELECT id FROM schools WHERE UPPER(code) = ?`, [cleanSch]);
    if (sch) {
      user = db.get(`SELECT * FROM users WHERE LOWER(email) = ? AND school_id = ?`, [cleanEmail, sch.id]);
    }
  }

  if (!user) {
    user = db.get(`SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1`, [cleanEmail]);
  }

  // Security best practice: don't reveal if account exists
  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists with this email address, a password reset code has been sent.'
    });
  }

  // Generate 6-digit numeric token
  const resetToken = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  db.run(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
    [user.id, resetToken, expiresAt]
  );

  await emailService.sendPasswordReset({
    recipientEmail: cleanEmail,
    recipientName: user.username,
    resetToken,
    schoolId: schoolId || 'Grexotix'
  });

  return res.json({
    success: true,
    message: 'If an account exists with this email address, a password reset code has been sent.',
    devToken: resetToken,
    expiresInMinutes: 15
  });
});

router.post('/reset-password', authLimiter, (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Please provide reset code and new password.'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters in length.'
    });
  }

  const cleanToken = String(token).trim();
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  let validToken;
  if (email) {
    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.get(`SELECT * FROM users WHERE LOWER(email) = ?`, [cleanEmail]);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid reset code or email address.' });
    }
    validToken = db.get(
      `SELECT * FROM password_reset_tokens
       WHERE user_id = ? AND token = ? AND used = 0 AND expires_at >= ?
       ORDER BY id DESC LIMIT 1`,
      [user.id, cleanToken, nowStr]
    );
  } else {
    validToken = db.get(
      `SELECT * FROM password_reset_tokens
       WHERE token = ? AND used = 0 AND expires_at >= ?
       ORDER BY id DESC LIMIT 1`,
      [cleanToken, nowStr]
    );
  }

  if (!validToken) {
    return res.status(400).json({
      success: false,
      error: 'The reset code is invalid or has expired. Please request a new code.'
    });
  }

  const targetUserId = (typeof user !== 'undefined' && user) ? user.id : validToken.user_id;
  const targetUserRole = (typeof user !== 'undefined' && user) ? user.role : 'SCHOOL_ADMIN';

  // Hash new password and update user
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.run(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [passwordHash, targetUserId]);
  db.run(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`, [validToken.id]);

  auditService.log({
    userId: targetUserId,
    userRole: targetUserRole,
    action: 'PASSWORD_RESET',
    module: 'AUTH',
    details: 'Password was successfully reset using token verification',
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Password has been reset successfully! You can now sign in with your new password.'
  });
});

module.exports = router;

