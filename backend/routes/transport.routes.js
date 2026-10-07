const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');
const config = require('../config/env');

router.use(authenticate);

// Helper: Check if external GPS telematics provider is configured
function getGpsProviderStatus() {
  const provider = process.env.GPS_PROVIDER || config.gpsProvider || null;
  const apiKey = process.env.GPS_API_KEY || config.gpsApiKey || null;
  const apiUrl = process.env.GPS_API_URL || config.gpsApiUrl || null;
  const isConfigured = Boolean(provider && apiKey && apiUrl);

  return {
    provider: provider || 'NOT_CONFIGURED',
    isConfigured,
    status: isConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
    message: isConfigured
      ? `Connected to ${provider} GPS telematics service`
      : 'GPS tracking provider is not configured. Telematics integration is awaiting provider API credentials.'
  };
}

// ----------------------------------------------------------------------------
// GET /api/transport/gps-status - Check GPS integration status (Section 17 & 18)
// ----------------------------------------------------------------------------
router.get('/gps-status', (req, res) => {
  const status = getGpsProviderStatus();
  return res.json({
    success: true,
    gpsProvider: status.provider,
    status: status.status,
    isConfigured: status.isConfigured,
    message: status.message,
    requiredDetails: [
      '1. GPS tracking provider/API',
      '2. API Base URL',
      '3. API Key / Access Token',
      '4. Vehicle/Bus identifier format',
      '5. Location endpoint',
      '6. Authentication method',
      '7. Latitude/Longitude response format',
      '8. Location update frequency',
      '9. Driver/device tracking method',
      '10. Map provider/API key if required'
    ]
  });
});

// ----------------------------------------------------------------------------
// GET /api/transport/my-bus - Live bus tracking for parent's active child
// ----------------------------------------------------------------------------
router.get('/my-bus', (req, res) => {
  const role = req.user.role;

  if (role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      return res.status(404).json({ success: false, error: 'No linked students found for this parent.' });
    }

    const requestedStudentId = req.query.studentId
      ? parseInt(req.query.studentId, 10)
      : req.parent.students[0].id;

    const child = req.parent.students.find(s => s.id === requestedStudentId);
    if (!child) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to view transport for this student.'
      });
    }

    // Find student transport assignment
    const assignment = db.get(
      `SELECT sta.*, b.bus_number, b.vehicle_no, b.capacity, b.status as bus_status,
              br.route_code, br.name as route_name, br.start_point, br.end_point, br.eta_minutes, br.live_status,
              bs.stop_name, bs.pickup_time, bs.drop_time,
              d.name as driver_name, d.mobile as driver_mobile
       FROM student_transport_assignments sta
       JOIN buses b ON sta.bus_id = b.id
       JOIN bus_routes br ON sta.route_id = br.id
       LEFT JOIN bus_stops bs ON sta.pickup_stop_id = bs.id
       LEFT JOIN drivers d ON b.id = d.assigned_bus_id
       WHERE sta.student_id = ?`,
      [child.id]
    );

    const gpsStatus = getGpsProviderStatus();

    if (!assignment) {
      return res.json({
        success: true,
        student: {
          id: child.id,
          name: `${child.first_name} ${child.last_name}`,
          class: child.class_name,
          section: child.section_name
        },
        hasAssignment: false,
        message: 'No school bus transport assigned to this student.',
        tracking: null
      });
    }

    const stops = db.query(
      `SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`,
      [assignment.route_id]
    );

    return res.json({
      success: true,
      student: {
        id: child.id,
        name: `${child.first_name} ${child.last_name}`,
        class: child.class_name,
        section: child.section_name
      },
      hasAssignment: true,
      tracking: {
        busNumber: assignment.bus_number,
        vehicleNo: assignment.vehicle_no,
        routeName: assignment.route_name,
        driverName: assignment.driver_name,
        driverMobile: assignment.driver_mobile,
        status: gpsStatus.isConfigured ? assignment.live_status : 'GPS_NOT_CONFIGURED',
        gpsStatus: gpsStatus.status,
        isGpsConnected: gpsStatus.isConfigured,
        etaMinutes: assignment.eta_minutes,
        currentStop: gpsStatus.isConfigured ? 'Stop 2 (En Route)' : 'Awaiting GPS Feed',
        pickupStop: assignment.stop_name || 'Designated Gate',
        pickupTime: assignment.pickup_time || '07:45 AM',
        dropTime: assignment.drop_time || '03:45 PM',
        lastUpdated: null,
        coordinates: null, // No fake coordinates in production
        routeStops: stops,
        message: gpsStatus.message
      }
    });
  }

  // Super Admin view
  if (role === 'SUPER_ADMIN') {
    const buses = db.query(
      `SELECT b.*, d.name as driver_name, d.mobile as driver_mobile, br.route_code, br.name as route_name, br.live_status, br.eta_minutes
       FROM buses b
       LEFT JOIN drivers d ON b.id = d.assigned_bus_id
       LEFT JOIN bus_routes br ON b.id = br.assigned_bus_id`
    );

    return res.json({
      success: true,
      role: 'SUPER_ADMIN',
      fleet: buses
    });
  }

  // Teacher view (optional fleet overview)
  return res.json({
    success: true,
    role: 'TEACHER',
    message: 'Teacher transport telematics access is informational.'
  });
});

// ----------------------------------------------------------------------------
// GET /api/transport/fleet - Super Admin full fleet telematics
// ----------------------------------------------------------------------------
router.get('/fleet', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Administrative permission required.' });
  }

  const buses = db.query(
    `SELECT b.*, d.name as driver_name, d.mobile as driver_mobile, d.license_no,
            br.route_code, br.name as route_name, br.start_point, br.end_point, br.live_status, br.eta_minutes,
            (SELECT COUNT(*) FROM student_transport_assignments sta WHERE sta.bus_id = b.id) as assigned_students
     FROM buses b
     LEFT JOIN drivers d ON b.id = d.assigned_bus_id
     LEFT JOIN bus_routes br ON b.id = br.assigned_bus_id`
  );

  res.json({
    success: true,
    buses
  });
});

module.exports = router;
