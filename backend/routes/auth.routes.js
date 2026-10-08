const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const config = require('../config/env');
const otpService = require('../services/otpService');
const auditService = require('../services/auditService');
const authenticate = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

/**
 * Helper to generate JWT token
 */
function createToken(userId, role) {
  return jwt.sign({ userId, role }, config.jwtSecret, {
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
  const identifier = req.body.email || req.body.username || req.body.emailOrUsername || req.body.mobile || req.body.mobile_number || req.body.parentMobile || req.body.phone;
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

  // 2. Query user from users table by username, email, or mobile
  const user = db.get(
    `SELECT * FROM users WHERE username = ? OR email = ? OR mobile = ?`,
    [cleanIdent, cleanIdent, cleanIdent.replace(/\D/g, '').slice(-10) || cleanIdent]
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
      permissions: getRolePermissions(user.role),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: teacher ? teacher.name : (parent ? parent.name : (user.username === 'admin' ? 'Rev. Fr. Principal' : user.username)),
        role: user.role,
        status: user.status
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

  const user = db.get(
    `SELECT * FROM users WHERE (username = ? OR email = ?)`,
    [emailOrUsername.trim(), emailOrUsername.trim()]
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. User not found.'
    });
  }

  // Strict role check: Must be SUPER_ADMIN
  if (user.role !== 'SUPER_ADMIN') {
    auditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN_REJECTED_ROLE_MISMATCH',
      module: 'AUTH',
      details: `User with role ${user.role} attempted Super Admin login`,
      ipAddress: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied. Account does not have Super Admin privileges.'
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

  // Update last login
  db.run(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

  const token = createToken(user.id, user.role);

  auditService.log({
    userId: user.id,
    userRole: user.role,
    action: 'ADMIN_LOGIN_SUCCESS',
    module: 'AUTH',
    details: 'Super Admin logged in successfully',
    ipAddress: req.ip
  });

  return res.json({
    success: true,
    message: 'Super Admin authenticated successfully.',
    token,
    role: 'SUPER_ADMIN',
    permissions: getRolePermissions('SUPER_ADMIN'),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: 'Rev. Fr. Principal',
      role: user.role,
      status: user.status
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
    `SELECT t.*, u.id as user_id, u.role, u.status as user_status
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
  const rawMobile = req.body.mobile || req.body.mobile_number || req.body.parentMobile || req.body.phone;
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

  // If admissionNo was optionally provided, verify it belongs to this parent's children
  if (admissionNo) {
    const cleanAdm = String(admissionNo).trim().toUpperCase();
    const matched = linkedStudents.find(s => s.admission_no.toUpperCase() === cleanAdm);
    if (!matched) {
      return res.status(403).json({
        success: false,
        error: 'Authentication failed. This student is not registered under the provided parent mobile number.'
      });
    }
    activeStudent = matched;
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

module.exports = router;
