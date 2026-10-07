const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const auditService = require('../services/auditService');

// ----------------------------------------------------------------------------
// GET /api/settings - Public or authenticated school settings
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const settings = db.get(`SELECT * FROM school_settings LIMIT 1`);
  if (!settings) {
    return res.status(404).json({ success: false, error: 'School settings not configured.' });
  }

  try {
    settings.config = JSON.parse(settings.config_json || '{}');
  } catch (e) {
    settings.config = {};
  }

  return res.json({ success: true, settings });
});

// ----------------------------------------------------------------------------
// PUT /api/settings - Update school settings (Super Admin only)
// ----------------------------------------------------------------------------
router.put('/', authenticate, requireSuperAdmin, (req, res) => {
  const {
    schoolName, affiliationNo, schoolCode, address,
    phone, email, website, logoUrl, academicYear, timings, config
  } = req.body;

  const current = db.get(`SELECT id FROM school_settings LIMIT 1`);
  const configJson = typeof config === 'object' ? JSON.stringify(config) : undefined;

  if (current) {
    db.run(
      `UPDATE school_settings SET
        school_name = COALESCE(?, school_name),
        affiliation_no = COALESCE(?, affiliation_no),
        school_code = COALESCE(?, school_code),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        website = COALESCE(?, website),
        logo_url = COALESCE(?, logo_url),
        academic_year = COALESCE(?, academic_year),
        timings = COALESCE(?, timings),
        config_json = COALESCE(?, config_json),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        schoolName, affiliationNo, schoolCode, address,
        phone, email, website, logoUrl, academicYear, timings, configJson,
        current.id
      ]
    );
  }

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'SETTINGS_UPDATED',
    module: 'SETTINGS',
    details: 'Updated school profile and institutional parameters',
    ipAddress: req.ip
  });

  return res.json({ success: true, message: 'School settings saved successfully.' });
});

// ----------------------------------------------------------------------------
// GET /api/settings/modules - Configurable module status & multi-campus
// ----------------------------------------------------------------------------
router.get('/modules', (req, res) => {
  const config = db.get(`SELECT * FROM module_configurations WHERE id = 1`);
  return res.json({
    success: true,
    modules: config || {
      library_enabled: 1,
      inventory_enabled: 1,
      hostel_enabled: 1,
      transport_enabled: 1,
      hr_enabled: 1,
      payroll_enabled: 1,
      ai_assistant_enabled: 1,
      online_exams_enabled: 1,
      visitors_enabled: 1,
      multi_campus_enabled: 1,
      active_campus_name: 'Rex Senior Secondary Main Campus, Ootacamund'
    }
  });
});

// ----------------------------------------------------------------------------
// PUT /api/settings/modules - Toggle modules (Super Admin only)
// ----------------------------------------------------------------------------
router.put('/modules', authenticate, requireSuperAdmin, (req, res) => {
  const {
    libraryEnabled, inventoryEnabled, hostelEnabled, transportEnabled,
    hrEnabled, payrollEnabled, aiAssistantEnabled, onlineExamsEnabled,
    visitorsEnabled, multiCampusEnabled, activeCampusName
  } = req.body;

  db.run(`
    INSERT INTO module_configurations (
      id, library_enabled, inventory_enabled, hostel_enabled, transport_enabled,
      hr_enabled, payroll_enabled, ai_assistant_enabled, online_exams_enabled,
      visitors_enabled, multi_campus_enabled, active_campus_name
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      library_enabled = COALESCE(excluded.library_enabled, library_enabled),
      inventory_enabled = COALESCE(excluded.inventory_enabled, inventory_enabled),
      hostel_enabled = COALESCE(excluded.hostel_enabled, hostel_enabled),
      transport_enabled = COALESCE(excluded.transport_enabled, transport_enabled),
      hr_enabled = COALESCE(excluded.hr_enabled, hr_enabled),
      payroll_enabled = COALESCE(excluded.payroll_enabled, payroll_enabled),
      ai_assistant_enabled = COALESCE(excluded.ai_assistant_enabled, ai_assistant_enabled),
      online_exams_enabled = COALESCE(excluded.online_exams_enabled, online_exams_enabled),
      visitors_enabled = COALESCE(excluded.visitors_enabled, visitors_enabled),
      multi_campus_enabled = COALESCE(excluded.multi_campus_enabled, multi_campus_enabled),
      active_campus_name = COALESCE(excluded.active_campus_name, active_campus_name),
      updated_at = CURRENT_TIMESTAMP
  `, [
    libraryEnabled !== undefined ? (libraryEnabled ? 1 : 0) : 1,
    inventoryEnabled !== undefined ? (inventoryEnabled ? 1 : 0) : 1,
    hostelEnabled !== undefined ? (hostelEnabled ? 1 : 0) : 1,
    transportEnabled !== undefined ? (transportEnabled ? 1 : 0) : 1,
    hrEnabled !== undefined ? (hrEnabled ? 1 : 0) : 1,
    payrollEnabled !== undefined ? (payrollEnabled ? 1 : 0) : 1,
    aiAssistantEnabled !== undefined ? (aiAssistantEnabled ? 1 : 0) : 1,
    onlineExamsEnabled !== undefined ? (onlineExamsEnabled ? 1 : 0) : 1,
    visitorsEnabled !== undefined ? (visitorsEnabled ? 1 : 0) : 1,
    multiCampusEnabled !== undefined ? (multiCampusEnabled ? 1 : 0) : 1,
    activeCampusName || 'Rex Senior Secondary Main Campus, Ootacamund'
  ]);

  return res.json({ success: true, message: 'Module configurations updated successfully.' });
});

module.exports = router;
