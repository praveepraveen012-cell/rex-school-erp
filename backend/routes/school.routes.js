const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/school/profile - Fetch authenticated user's school profile
// ----------------------------------------------------------------------------
router.get('/profile', (req, res) => {
  const schoolId = req.user.school_id || 1;

  const school = db.get(`SELECT * FROM schools WHERE id = ?`, [schoolId]);
  if (!school) {
    return res.status(404).json({ success: false, error: 'School profile not found.' });
  }

  const settings = db.get(`SELECT * FROM school_settings WHERE school_id = ?`, [schoolId]) || {};

  res.json({
    success: true,
    school: {
      ...school,
      settings
    }
  });
});

// ----------------------------------------------------------------------------
// PUT /api/school/profile - Update school profile (Super Admin only)
// ----------------------------------------------------------------------------
router.put('/profile', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SCHOOL_ADMIN' && req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only School Super Admin can update school profile.' });
  }

  const schoolId = req.user.school_id || 1;
  const { name, displayName, phone, email, address, city, state, postalCode, website, affiliationBoard, affiliationNumber } = req.body;

  db.run(
    `UPDATE schools SET
      name = COALESCE(?, name),
      display_name = COALESCE(?, display_name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      postal_code = COALESCE(?, postal_code),
      website = COALESCE(?, website),
      affiliation_board = COALESCE(?, affiliation_board),
      affiliation_number = COALESCE(?, affiliation_number),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, displayName, phone, email, address, city, state, postalCode, website, affiliationBoard, affiliationNumber, schoolId]
  );

  // Also update school_settings if exists
  db.run(
    `UPDATE school_settings SET
      school_name = COALESCE(?, school_name),
      affiliation_no = COALESCE(?, affiliation_no),
      address = COALESCE(?, address),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      website = COALESCE(?, website)
     WHERE school_id = ?`,
    [name, affiliationNumber, address, phone, email, website, schoolId]
  );

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'SCHOOL_PROFILE_UPDATED',
    module: 'SCHOOL',
    recordId: schoolId,
    details: `School profile updated by ${req.user.username}`,
    ipAddress: req.ip
  });

  const updatedSchool = db.get(`SELECT * FROM schools WHERE id = ?`, [schoolId]);
  res.json({
    success: true,
    message: 'School profile updated successfully.',
    school: updatedSchool
  });
});

module.exports = router;
