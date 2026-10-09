const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');
const config = require('../config/env');
const demoGpsSimulator = require('../services/demoGpsSimulator');

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
    mode: isConfigured ? 'LIVE_GPS' : 'DEMO',
    message: isConfigured
      ? `Connected to ${provider} GPS telematics service`
      : 'Live GPS provider is not configured. Operating in DEMO TRACKING mode for realistic route simulation.'
  };
}

// ----------------------------------------------------------------------------
// GET /api/transport/maps-config - Client Google Maps API configuration
// (Available before authentication if needed by UI script loader)
// ----------------------------------------------------------------------------
router.get('/maps-config', (req, res) => {
  const webApiKey = process.env.GOOGLE_MAPS_WEB_API_KEY || process.env.GOOGLE_MAPS_API_KEY || config.googleMapsWebApiKey || '';
  const isConfigured = Boolean(webApiKey && webApiKey.trim().length > 8 && !webApiKey.includes('YOUR_'));

  return res.json({
    success: true,
    apiKey: webApiKey,
    isConfigured,
    provider: 'GOOGLE_MAPS',
    defaultCenter: { lat: 11.4116, lng: 76.7088 }, // Ooty / Nilgiris
    defaultZoom: 13,
    sampleRoutesAvailable: true,
    message: isConfigured
      ? 'Google Maps API key configured.'
      : 'Google Maps API key not set in environment (GOOGLE_MAPS_WEB_API_KEY). Interactive route visualizer enabled as fallback.'
  });
});

// Require authentication for all subsequent endpoints
router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/transport/gps-status - GPS integration telemetry status
// ----------------------------------------------------------------------------
router.get('/gps-status', (req, res) => {
  const status = getGpsProviderStatus();
  return res.json({
    success: true,
    gpsProvider: status.provider,
    status: status.status,
    isConfigured: status.isConfigured,
    mode: status.mode,
    message: status.message,
    modesSupported: [
      {
        mode: 'DEMO',
        name: 'DEMO TRACKING',
        description: 'Gradual waypoint progression along ordered route stops without physical GPS hardware.'
      },
      {
        mode: 'LIVE_GPS',
        name: 'LIVE GPS',
        description: 'Satellite telematics coordinates received when external hardware provider is connected.'
      }
    ]
  });
});

// ----------------------------------------------------------------------------
// GET /api/transport/my-bus - Live bus tracking for parent's active child
// Strict Data Isolation: Parents can ONLY view buses assigned to their own children!
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
      `SELECT sta.*, b.bus_number, b.vehicle_no, b.model, b.capacity, b.status as bus_status,
              br.route_code, br.name as route_name, br.start_point, br.end_point, br.eta_minutes, br.live_status,
              bs.stop_name as pickup_stop_name, bs.pickup_time, bs.drop_time, bs.latitude as pickup_lat, bs.longitude as pickup_lng,
              d.name as driver_name, d.mobile as driver_mobile, d.license_no
       FROM student_transport_assignments sta
       JOIN buses b ON sta.bus_id = b.id
       JOIN bus_routes br ON sta.route_id = br.id
       LEFT JOIN bus_stops bs ON sta.pickup_stop_id = bs.id
       LEFT JOIN drivers d ON b.id = d.assigned_bus_id
       WHERE sta.student_id = ?`,
      [child.id]
    );

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

    // Read authoritative simulation state from simulator or database
    let trackingState = demoGpsSimulator.getState(assignment.bus_id) || db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [assignment.bus_id]);
    const gpsStatus = getGpsProviderStatus();

    const stops = db.query(
      `SELECT id, route_id, stop_name, stop_order, pickup_time, drop_time, distance_meters, latitude, longitude
       FROM bus_stops
       WHERE route_id = ?
       ORDER BY stop_order ASC`,
      [assignment.route_id]
    );

    const isDemoActive = trackingState && trackingState.is_active === 1;
    const trackingMode = isDemoActive ? 'DEMO' : (gpsStatus.isConfigured ? 'LIVE_GPS' : 'DEMO');

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
        busId: assignment.bus_id,
        busNumber: assignment.bus_number,
        vehicleNo: assignment.vehicle_no,
        model: assignment.model,
        capacity: assignment.capacity,
        busStatus: assignment.bus_status,
        routeId: assignment.route_id,
        routeName: assignment.route_name,
        routeCode: assignment.route_code,
        startPoint: assignment.start_point,
        endPoint: assignment.end_point,
        driverName: assignment.driver_name || 'Assigned Driver',
        driverMobile: assignment.driver_mobile || '9443210045',
        driverLicense: assignment.license_no || 'TN43-2015',
        trackingMode: trackingMode,
        trackingModeLabel: trackingMode === 'DEMO' ? 'DEMO TRACKING' : 'LIVE GPS',
        isDemoActive: isDemoActive,
        isGpsConnected: gpsStatus.isConfigured,
        speedMultiplier: trackingState ? trackingState.speed_multiplier : 1,
        progressPercent: trackingState ? trackingState.progress_percent : 0.0,
        currentLatitude: trackingState && trackingState.latitude ? trackingState.latitude : (stops.length > 0 ? stops[0].latitude : 11.3530),
        currentLongitude: trackingState && trackingState.longitude ? trackingState.longitude : (stops.length > 0 ? stops[0].longitude : 76.7959),
        currentStop: trackingState ? trackingState.current_stop_name : (stops.length > 0 ? stops[0].stop_name : 'Depot'),
        nextStop: trackingState ? trackingState.next_stop_name : (stops.length > 1 ? stops[1].stop_name : 'Destination'),
        status: isDemoActive
          ? trackingState.status_text
          : (gpsStatus.isConfigured ? assignment.live_status : 'Stationary (DEMO TRACKING Ready)'),
        etaMinutes: trackingState && trackingState.eta_minutes ? trackingState.eta_minutes : assignment.eta_minutes,
        pickupStop: assignment.pickup_stop_name || 'Designated Gate',
        pickupStopCoordinates: {
          latitude: assignment.pickup_lat || 11.4116,
          longitude: assignment.pickup_lng || 76.7088
        },
        pickupTime: assignment.pickup_time || '07:45 AM',
        dropTime: assignment.drop_time || '03:45 PM',
        lastUpdated: (trackingState && trackingState.last_updated) || new Date().toISOString(),
        routeStops: stops,
        message: isDemoActive
          ? 'DEMO TRACKING: Live continuous simulation is moving along configured route stops.'
          : (gpsStatus.isConfigured
              ? 'Connected to live GPS satellite telematics.'
              : 'DEMO TRACKING is stationary. When Super Admin starts tracking, you will see the bus move live.')
      }
    });
  }

  // Super Admin view
  if (role === 'SUPER_ADMIN') {
    const buses = db.query(
      `SELECT b.*, d.id as driver_id, d.name as driver_name, d.mobile as driver_mobile, d.license_no,
              br.id as route_id, br.route_code, br.name as route_name, br.start_point, br.end_point, br.live_status, br.eta_minutes,
              (SELECT COUNT(*) FROM student_transport_assignments sta WHERE sta.bus_id = b.id) as assigned_students,
              bts.tracking_mode, bts.is_active as is_demo_active, bts.progress_percent, bts.latitude, bts.longitude,
              bts.current_stop_name, bts.next_stop_name, bts.speed_multiplier, bts.status_text, bts.last_updated
       FROM buses b
       LEFT JOIN drivers d ON b.id = d.assigned_bus_id
       LEFT JOIN bus_routes br ON b.id = br.assigned_bus_id
       LEFT JOIN bus_tracking_state bts ON b.id = bts.bus_id`
    );

    return res.json({
      success: true,
      role: 'SUPER_ADMIN',
      fleet: buses
    });
  }

  return res.status(403).json({ success: false, error: 'Unauthorized role.' });
});

// ----------------------------------------------------------------------------
// GET /api/transport/fleet - Super Admin full fleet telematics & stats
// ----------------------------------------------------------------------------
router.get('/fleet', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Administrative permission required.' });
  }

  const buses = db.query(
    `SELECT b.*, d.id as driver_id, d.name as driver_name, d.mobile as driver_mobile, d.license_no,
            br.id as route_id, br.route_code, br.name as route_name, br.start_point, br.end_point, br.live_status, br.eta_minutes,
            (SELECT COUNT(*) FROM student_transport_assignments sta WHERE sta.bus_id = b.id) as assigned_students,
            bts.tracking_mode, bts.is_active as is_demo_active, bts.progress_percent, bts.latitude, bts.longitude,
            bts.current_stop_name, bts.next_stop_name, bts.speed_multiplier, bts.status_text, bts.last_updated
     FROM buses b
     LEFT JOIN drivers d ON b.id = d.assigned_bus_id
     LEFT JOIN bus_routes br ON b.id = br.assigned_bus_id
     LEFT JOIN bus_tracking_state bts ON b.id = bts.bus_id`
  );

  const totalBuses = buses.length;
  const activeBuses = buses.filter(b => b.status === 'ACTIVE').length;
  const inactiveBuses = buses.filter(b => b.status === 'INACTIVE' || b.status === 'IDLE').length;
  const maintenanceBuses = buses.filter(b => b.status === 'MAINTENANCE').length;
  const demoActiveBuses = buses.filter(b => b.is_demo_active === 1).length;

  res.json({
    success: true,
    summary: {
      totalBuses,
      activeBuses,
      inactiveBuses,
      maintenanceBuses,
      demoActiveBuses
    },
    buses
  });
});

// ----------------------------------------------------------------------------
// GET /api/transport/bus/:id - View detailed bus information (Requirement 3)
// ----------------------------------------------------------------------------
router.get('/bus/:id', (req, res) => {
  const busId = parseInt(req.params.id, 10);
  const bus = db.get(`SELECT * FROM buses WHERE id = ?`, [busId]);
  if (!bus) {
    return res.status(404).json({ success: false, error: 'Bus not found.' });
  }

  const driver = db.get(`SELECT * FROM drivers WHERE assigned_bus_id = ?`, [busId]);
  const route = db.get(`SELECT * FROM bus_routes WHERE assigned_bus_id = ? OR id = 1`, [busId]);
  const stops = route
    ? db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [route.id])
    : [];

  const assignedStudents = db.query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, c.name as class_name, sec.name as section_name,
            bs.stop_name as pickup_stop_name, bs.pickup_time, bs.drop_time
     FROM student_transport_assignments sta
     JOIN students s ON sta.student_id = s.id
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN sections sec ON s.section_id = sec.id
     LEFT JOIN bus_stops bs ON sta.pickup_stop_id = bs.id
     WHERE sta.bus_id = ?`,
    [busId]
  );

  const trackingState = demoGpsSimulator.getState(busId) || db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [busId]);

  return res.json({
    success: true,
    bus,
    driver,
    route: route ? { ...route, stops } : null,
    assignedStudents,
    trackingState
  });
});

// ----------------------------------------------------------------------------
// SUPER ADMIN BUS CRUD & STATUS MANAGEMENT (Requirement 3)
// ----------------------------------------------------------------------------

// POST /api/transport/bus - Add Bus
router.post('/bus', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can add buses.' });
  }

  const { busNumber, vehicleNo, model, capacity, status, driverId, routeId } = req.body;

  if (!busNumber || !vehicleNo) {
    return res.status(400).json({ success: false, error: 'Bus Number and Vehicle Registration Number are required.' });
  }

  try {
    const insertResult = db.run(
      `INSERT INTO buses (bus_number, vehicle_no, model, capacity, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        busNumber.trim(),
        vehicleNo.trim(),
        model ? model.trim() : 'Standard Fleet (36-Seater)',
        parseInt(capacity, 10) || 36,
        status || 'ACTIVE'
      ]
    );

    const newBusId = insertResult.lastInsertRowid;

    // Link driver if provided
    if (driverId) {
      db.run(`UPDATE drivers SET assigned_bus_id = ? WHERE id = ?`, [newBusId, driverId]);
    }

    // Link route if provided
    if (routeId) {
      db.run(`UPDATE bus_routes SET assigned_bus_id = ? WHERE id = ?`, [newBusId, routeId]);
    }

    // Get default coordinates from target route or default Nilgiris Depot
    let initialLat = 11.3530;
    let initialLng = 76.7959;
    let initialStopName = 'Initial Depot';
    let nextStopName = 'Campus Gate';

    if (routeId) {
      const stops = db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [routeId]);
      if (stops.length > 0) {
        initialLat = stops[0].latitude || initialLat;
        initialLng = stops[0].longitude || initialLng;
        initialStopName = stops[0].stop_name;
        if (stops.length > 1) nextStopName = stops[1].stop_name;
      }
    }

    // Initialize bus_tracking_state
    db.run(
      `INSERT OR REPLACE INTO bus_tracking_state
       (bus_id, route_id, driver_id, tracking_mode, is_active, speed_multiplier, current_stop_index, progress_percent, latitude, longitude, current_stop_name, next_stop_name, status_text)
       VALUES (?, ?, ?, 'DEMO', 0, 1, 0, 0.0, ?, ?, ?, ?, 'Stationary (DEMO TRACKING Ready)')`,
      [newBusId, routeId || null, driverId || null, initialLat, initialLng, initialStopName, nextStopName]
    );

    auditService.log(req.user.id, req.user.role, 'ADD_BUS', 'transport', newBusId.toString(), `Added bus ${busNumber} (${vehicleNo})`);

    return res.status(201).json({
      success: true,
      message: 'Bus created successfully.',
      bus: {
        id: newBusId,
        busNumber,
        vehicleNo,
        model: model || 'Standard Fleet (36-Seater)',
        capacity: parseInt(capacity, 10) || 36,
        status: status || 'ACTIVE',
        driverId,
        routeId
      }
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to add bus: ' + err.message });
  }
});

// PUT /api/transport/bus/:id - Edit Bus
router.put('/bus/:id', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can update buses.' });
  }

  const busId = parseInt(req.params.id, 10);
  const { busNumber, vehicleNo, model, capacity, status, driverId, routeId } = req.body;

  const bus = db.get(`SELECT * FROM buses WHERE id = ?`, [busId]);
  if (!bus) {
    return res.status(404).json({ success: false, error: 'Bus not found.' });
  }

  try {
    db.run(
      `UPDATE buses
       SET bus_number = COALESCE(?, bus_number),
           vehicle_no = COALESCE(?, vehicle_no),
           model = COALESCE(?, model),
           capacity = COALESCE(?, capacity),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [busNumber, vehicleNo, model, capacity, status, busId]
    );

    if (driverId !== undefined) {
      db.run(`UPDATE drivers SET assigned_bus_id = NULL WHERE assigned_bus_id = ?`, [busId]);
      if (driverId) {
        db.run(`UPDATE drivers SET assigned_bus_id = ? WHERE id = ?`, [busId, driverId]);
      }
    }

    if (routeId !== undefined) {
      db.run(`UPDATE bus_routes SET assigned_bus_id = NULL WHERE assigned_bus_id = ?`, [busId]);
      if (routeId) {
        db.run(`UPDATE bus_routes SET assigned_bus_id = ? WHERE id = ?`, [busId, routeId]);
      }
    }

    // Update tracking state references
    db.run(
      `UPDATE bus_tracking_state
       SET route_id = COALESCE(?, route_id),
           driver_id = COALESCE(?, driver_id)
       WHERE bus_id = ?`,
      [routeId || null, driverId || null, busId]
    );

    if (status === 'INACTIVE') {
      demoGpsSimulator.stop(busId);
    }

    auditService.log(req.user.id, req.user.role, 'UPDATE_BUS', 'transport', busId.toString(), `Updated bus ${bus.bus_number}`);

    return res.json({
      success: true,
      message: 'Bus updated successfully.'
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to update bus: ' + err.message });
  }
});

// PATCH /api/transport/bus/:id/status - Activate / Deactivate Bus (Requirement 3)
router.patch('/bus/:id/status', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can change bus status.' });
  }

  const busId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE', 'IDLE', 'MAINTENANCE'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status must be ACTIVE, INACTIVE, or MAINTENANCE.' });
  }

  const bus = db.get(`SELECT * FROM buses WHERE id = ?`, [busId]);
  if (!bus) {
    return res.status(404).json({ success: false, error: 'Bus not found.' });
  }

  const dbStatus = (status === 'INACTIVE') ? 'IDLE' : status;
  db.run(`UPDATE buses SET status = ? WHERE id = ?`, [dbStatus, busId]);

  if (status === 'INACTIVE' || status === 'IDLE') {
    demoGpsSimulator.stop(busId);
  }

  auditService.log(req.user.id, req.user.role, 'CHANGE_BUS_STATUS', 'transport', busId.toString(), `Changed status of ${bus.bus_number} to ${status}`);

  return res.json({
    success: true,
    message: `Bus ${bus.bus_number} status updated to ${status}.`,
    busId,
    status
  });
});

// DELETE /api/transport/bus/:id - Delete or Deactivate Bus
router.delete('/bus/:id', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can delete buses.' });
  }

  const busId = parseInt(req.params.id, 10);
  const bus = db.get(`SELECT * FROM buses WHERE id = ?`, [busId]);
  if (!bus) {
    return res.status(404).json({ success: false, error: 'Bus not found.' });
  }

  try {
    demoGpsSimulator.stop(busId);

    // Check if students are currently assigned
    const assignedCount = db.get(`SELECT COUNT(*) as count FROM student_transport_assignments WHERE bus_id = ?`, [busId]);
    if (assignedCount && assignedCount.count > 0) {
      db.run(`UPDATE buses SET status = 'INACTIVE' WHERE id = ?`, [busId]);
      db.run(`UPDATE bus_tracking_state SET is_active = 0, status_text = 'Deactivated' WHERE bus_id = ?`, [busId]);
      return res.json({
        success: true,
        message: `Bus marked as INACTIVE because ${assignedCount.count} students are assigned.`
      });
    }

    db.run(`DELETE FROM buses WHERE id = ?`, [busId]);
    db.run(`DELETE FROM bus_tracking_state WHERE bus_id = ?`, [busId]);

    auditService.log(req.user.id, req.user.role, 'DELETE_BUS', 'transport', busId.toString(), `Deleted bus ${bus.bus_number}`);

    return res.json({ success: true, message: 'Bus deleted successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to delete bus: ' + err.message });
  }
});

// ----------------------------------------------------------------------------
// DRIVERS MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/transport/drivers - List drivers
router.get('/drivers', (req, res) => {
  const drivers = db.query(`SELECT d.*, b.bus_number, b.vehicle_no FROM drivers d LEFT JOIN buses b ON d.assigned_bus_id = b.id`);
  res.json({ success: true, drivers });
});

// POST /api/transport/drivers - Add driver
router.post('/drivers', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can manage drivers.' });
  }

  const { name, mobile, licenseNo, assignedBusId, status } = req.body;
  if (!name || !mobile || !licenseNo) {
    return res.status(400).json({ success: false, error: 'Name, mobile, and license number are required.' });
  }

  try {
    const result = db.run(
      `INSERT INTO drivers (name, mobile, license_no, assigned_bus_id, status)
       VALUES (?, ?, ?, ?, ?)`,
      [name, mobile, licenseNo, assignedBusId || null, status || 'ACTIVE']
    );

    return res.status(201).json({
      success: true,
      message: 'Driver added successfully.',
      driverId: result.lastInsertRowid
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to add driver: ' + err.message });
  }
});

// ----------------------------------------------------------------------------
// ROUTES & ORDERED STOPS MANAGEMENT (Requirement 3 & 8)
// ----------------------------------------------------------------------------

// GET /api/transport/routes - List routes with ordered stops & coordinates
router.get('/routes', (req, res) => {
  const routes = db.query(
    `SELECT br.*, b.bus_number, b.vehicle_no
     FROM bus_routes br
     LEFT JOIN buses b ON br.assigned_bus_id = b.id`
  );

  const routesWithStops = routes.map(r => {
    const stops = db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [r.id]);
    return { ...r, stops };
  });

  res.json({ success: true, routes: routesWithStops });
});

// POST /api/transport/routes - Create route
router.post('/routes', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can manage routes.' });
  }

  const { routeCode, name, assignedBusId, startPoint, endPoint, etaMinutes } = req.body;
  if (!routeCode || !name || !startPoint || !endPoint) {
    return res.status(400).json({ success: false, error: 'Route code, name, starting point, and destination are required.' });
  }

  try {
    const result = db.run(
      `INSERT INTO bus_routes (route_code, name, assigned_bus_id, start_point, end_point, eta_minutes, live_status)
       VALUES (?, ?, ?, ?, ?, ?, 'Stationary')`,
      [routeCode, name, assignedBusId || null, startPoint, endPoint, parseInt(etaMinutes, 10) || 15]
    );

    const newRouteId = result.lastInsertRowid;

    // If initial stops provided in request body, add them
    if (Array.isArray(req.body.stops) && req.body.stops.length > 0) {
      req.body.stops.forEach((s, idx) => {
        db.run(
          `INSERT INTO bus_stops (route_id, stop_name, stop_order, pickup_time, drop_time, distance_meters, latitude, longitude)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newRouteId,
            s.stop_name || `Stop ${idx + 1}`,
            s.stop_order || (idx + 1),
            s.pickup_time || '07:30 AM',
            s.drop_time || '04:00 PM',
            s.distance_meters || 1000,
            parseFloat(s.latitude) || 11.4116,
            parseFloat(s.longitude) || 76.7088
          ]
        );
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Route created successfully.',
      routeId: newRouteId
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to create route: ' + err.message });
  }
});

// PUT /api/transport/routes/:id - Update route
router.put('/routes/:id', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can manage routes.' });
  }

  const routeId = parseInt(req.params.id, 10);
  const { routeCode, name, assignedBusId, startPoint, endPoint, etaMinutes } = req.body;

  try {
    db.run(
      `UPDATE bus_routes
       SET route_code = COALESCE(?, route_code),
           name = COALESCE(?, name),
           assigned_bus_id = COALESCE(?, assigned_bus_id),
           start_point = COALESCE(?, start_point),
           end_point = COALESCE(?, end_point),
           eta_minutes = COALESCE(?, eta_minutes)
       WHERE id = ?`,
      [routeCode, name, assignedBusId, startPoint, endPoint, etaMinutes, routeId]
    );

    return res.json({ success: true, message: 'Route updated successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to update route: ' + err.message });
  }
});

// POST /api/transport/routes/:id/stops - Add ordered stop to route
router.post('/routes/:id/stops', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can manage route stops.' });
  }

  const routeId = parseInt(req.params.id, 10);
  const { stop_name, stop_order, pickup_time, drop_time, distance_meters, latitude, longitude } = req.body;

  if (!stop_name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: 'Stop name, latitude, and longitude are required.' });
  }

  try {
    const maxOrder = db.get(`SELECT MAX(stop_order) as m FROM bus_stops WHERE route_id = ?`, [routeId]);
    const nextOrder = stop_order || ((maxOrder && maxOrder.m) ? maxOrder.m + 1 : 1);

    const result = db.run(
      `INSERT INTO bus_stops (route_id, stop_name, stop_order, pickup_time, drop_time, distance_meters, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routeId,
        stop_name,
        nextOrder,
        pickup_time || '07:30 AM',
        drop_time || '04:00 PM',
        parseInt(distance_meters, 10) || 500,
        parseFloat(latitude),
        parseFloat(longitude)
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Stop added to route successfully.',
      stopId: result.lastInsertRowid
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to add stop: ' + err.message });
  }
});

// PUT /api/transport/routes/stops/:stopId - Edit ordered stop
router.put('/routes/stops/:stopId', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can manage route stops.' });
  }

  const stopId = parseInt(req.params.stopId, 10);
  const { stop_name, stop_order, pickup_time, drop_time, distance_meters, latitude, longitude } = req.body;

  try {
    db.run(
      `UPDATE bus_stops
       SET stop_name = COALESCE(?, stop_name),
           stop_order = COALESCE(?, stop_order),
           pickup_time = COALESCE(?, pickup_time),
           drop_time = COALESCE(?, drop_time),
           distance_meters = COALESCE(?, distance_meters),
           latitude = COALESCE(?, latitude),
           longitude = COALESCE(?, longitude)
       WHERE id = ?`,
      [stop_name, stop_order, pickup_time, drop_time, distance_meters, latitude, longitude, stopId]
    );

    return res.json({ success: true, message: 'Stop updated successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to update stop: ' + err.message });
  }
});

// DELETE /api/transport/routes/stops/:stopId - Delete stop
router.delete('/routes/stops/:stopId', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can manage route stops.' });
  }

  const stopId = parseInt(req.params.stopId, 10);
  try {
    db.run(`DELETE FROM bus_stops WHERE id = ?`, [stopId]);
    return res.json({ success: true, message: 'Stop removed from route.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to delete stop: ' + err.message });
  }
});

// ----------------------------------------------------------------------------
// ASSIGNMENT MANAGEMENT (Driver, Route, Students)
// ----------------------------------------------------------------------------
router.post('/assign', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can assign transport.' });
  }

  const { busId, driverId, routeId, studentIds, pickupStopId } = req.body;
  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID is required.' });
  }

  try {
    if (driverId) {
      db.run(`UPDATE drivers SET assigned_bus_id = ? WHERE id = ?`, [busId, driverId]);
    }
    if (routeId) {
      db.run(`UPDATE bus_routes SET assigned_bus_id = ? WHERE id = ?`, [busId, routeId]);
    }

    if (Array.isArray(studentIds)) {
      for (const sId of studentIds) {
        db.run(
          `INSERT OR REPLACE INTO student_transport_assignments (student_id, bus_id, route_id, pickup_stop_id)
           VALUES (?, ?, ?, ?)`,
          [sId, busId, routeId || 1, pickupStopId || null]
        );
      }
    }

    auditService.log(req.user.id, req.user.role, 'ASSIGN_TRANSPORT', 'transport', busId.toString(), `Assigned transport to bus ${busId}`);

    return res.json({
      success: true,
      message: 'Transport assignment updated successfully.'
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to assign: ' + err.message });
  }
});

// ----------------------------------------------------------------------------
// DEMO LIVE TRACKING SIMULATOR CONTROLLER (Requirements 4, 5)
// ----------------------------------------------------------------------------

// Handler for starting demo tracking
function handleStartTracking(req, res) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control DEMO TRACKING.' });
  }

  const busId = req.params.id ? parseInt(req.params.id, 10) : parseInt(req.body.busId, 10);
  const routeId = req.body.routeId ? parseInt(req.body.routeId, 10) : null;
  const speed = parseInt(req.body.speedMultiplier, 10) || parseInt(req.body.speed, 10) || 1;

  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID is required.' });
  }

  try {
    const state = demoGpsSimulator.start(busId, routeId, speed);
    auditService.log(req.user.id, req.user.role, 'DEMO_TRACKING_START', 'transport', busId.toString(), `Started DEMO TRACKING on Bus ${busId} (${speed}x speed)`);

    return res.json({
      success: true,
      message: `DEMO TRACKING started at ${speed}x speed. Position is advancing continuously along route stops.`,
      tracking: state
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

router.post('/demo-tracking/start', handleStartTracking);
router.post('/bus/:id/demo/start', handleStartTracking);
router.post('/buses/:id/demo/start', handleStartTracking);

// Handler for pausing demo tracking
function handlePauseTracking(req, res) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control DEMO TRACKING.' });
  }

  const busId = req.params.id ? parseInt(req.params.id, 10) : parseInt(req.body.busId, 10);
  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID is required.' });
  }

  try {
    const state = demoGpsSimulator.pause(busId);
    auditService.log(req.user.id, req.user.role, 'DEMO_TRACKING_PAUSE', 'transport', busId.toString(), `Paused DEMO TRACKING on Bus ${busId}`);

    return res.json({
      success: true,
      message: 'DEMO TRACKING paused. Current coordinates and progress are preserved.',
      tracking: state
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

router.post('/demo-tracking/pause', handlePauseTracking);
router.post('/bus/:id/demo/pause', handlePauseTracking);
router.post('/buses/:id/demo/pause', handlePauseTracking);

// Handler for resuming demo tracking
function handleResumeTracking(req, res) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control DEMO TRACKING.' });
  }

  const busId = req.params.id ? parseInt(req.params.id, 10) : parseInt(req.body.busId, 10);
  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID is required.' });
  }

  try {
    const state = demoGpsSimulator.resume(busId);
    auditService.log(req.user.id, req.user.role, 'DEMO_TRACKING_RESUME', 'transport', busId.toString(), `Resumed DEMO TRACKING on Bus ${busId}`);

    return res.json({
      success: true,
      message: 'DEMO TRACKING resumed from current position.',
      tracking: state
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

router.post('/demo-tracking/resume', handleResumeTracking);
router.post('/bus/:id/demo/resume', handleResumeTracking);
router.post('/buses/:id/demo/resume', handleResumeTracking);

// Handler for stopping demo tracking
function handleStopTracking(req, res) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control DEMO TRACKING.' });
  }

  const busId = req.params.id ? parseInt(req.params.id, 10) : parseInt(req.body.busId, 10);
  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID is required.' });
  }

  try {
    const state = demoGpsSimulator.stop(busId);
    auditService.log(req.user.id, req.user.role, 'DEMO_TRACKING_STOP', 'transport', busId.toString(), `Stopped DEMO TRACKING on Bus ${busId}`);

    return res.json({
      success: true,
      message: 'DEMO TRACKING stopped.',
      tracking: state
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

router.post('/demo-tracking/stop', handleStopTracking);
router.post('/bus/:id/demo/stop', handleStopTracking);
router.post('/buses/:id/demo/stop', handleStopTracking);

// Handler for resetting demo tracking to first stop
function handleResetTracking(req, res) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control DEMO TRACKING.' });
  }

  const busId = req.params.id ? parseInt(req.params.id, 10) : parseInt(req.body.busId, 10);
  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID is required.' });
  }

  try {
    const state = demoGpsSimulator.reset(busId);
    auditService.log(req.user.id, req.user.role, 'DEMO_TRACKING_RESET', 'transport', busId.toString(), `Reset DEMO TRACKING on Bus ${busId} to route start point`);

    return res.json({
      success: true,
      message: 'DEMO TRACKING reset to the route starting depot.',
      tracking: state
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

router.post('/demo-tracking/reset', handleResetTracking);
router.post('/bus/:id/demo/reset', handleResetTracking);
router.post('/buses/:id/demo/reset', handleResetTracking);

// Handler for configuring demo simulation speed
function handleSetSpeed(req, res) {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control DEMO TRACKING speed.' });
  }

  const busId = req.params.id ? parseInt(req.params.id, 10) : parseInt(req.body.busId, 10);
  const speed = parseInt(req.body.speedMultiplier, 10) || parseInt(req.body.speed, 10) || 1;

  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID is required.' });
  }

  try {
    const state = demoGpsSimulator.setSpeed(busId, speed);
    return res.json({
      success: true,
      message: `DEMO TRACKING speed updated to ${speed}x.`,
      tracking: state
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

router.post('/demo-tracking/speed', handleSetSpeed);
router.post('/bus/:id/demo/speed', handleSetSpeed);
router.post('/buses/:id/demo/speed', handleSetSpeed);

// ----------------------------------------------------------------------------
// GET /api/transport/bus/:id/tracking - Detailed live tracking for a specific bus
// PARENT BUS SECURITY: Parents can ONLY view tracking for buses assigned to their child!
// ----------------------------------------------------------------------------
router.get('/bus/:id/tracking', (req, res) => {
  const busId = parseInt(req.params.id, 10);
  const role = req.user.role;

  if (role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden: No linked children found.' });
    }

    const linkedStudentIds = req.parent.students.map(s => s.id);
    const placeholders = linkedStudentIds.map(() => '?').join(',');

    const assignment = db.get(
      `SELECT * FROM student_transport_assignments
       WHERE bus_id = ? AND student_id IN (${placeholders})`,
      [busId, ...linkedStudentIds]
    );

    if (!assignment) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are strictly unauthorized to view tracking for a bus not assigned to your registered child.'
      });
    }
  }

  const bus = db.get(`SELECT * FROM buses WHERE id = ?`, [busId]);
  if (!bus) {
    return res.status(404).json({ success: false, error: 'Bus not found.' });
  }

  const trackingState = demoGpsSimulator.getState(busId) || db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [busId]);
  const gpsStatus = getGpsProviderStatus();

  const driver = db.get(`SELECT * FROM drivers WHERE assigned_bus_id = ?`, [busId]);
  const route = db.get(
    `SELECT * FROM bus_routes WHERE assigned_bus_id = ? OR id = ?`,
    [busId, trackingState && trackingState.route_id ? trackingState.route_id : 1]
  );
  const stops = route ? db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [route.id]) : [];

  const isDemoActive = trackingState && trackingState.is_active === 1;
  const trackingMode = isDemoActive ? 'DEMO' : (gpsStatus.isConfigured ? 'LIVE_GPS' : 'DEMO');

  return res.json({
    success: true,
    bus: {
      id: bus.id,
      busNumber: bus.bus_number,
      vehicleNo: bus.vehicle_no,
      model: bus.model,
      capacity: bus.capacity,
      status: bus.status
    },
    driver: driver ? {
      name: driver.name,
      mobile: driver.mobile,
      licenseNo: driver.license_no
    } : null,
    route: route ? {
      id: route.id,
      name: route.name,
      routeCode: route.route_code,
      startPoint: route.start_point,
      endPoint: route.end_point,
      etaMinutes: route.eta_minutes,
      stops
    } : null,
    tracking: {
      busId: bus.id,
      routeId: route ? route.id : 1,
      trackingMode,
      trackingModeLabel: trackingMode === 'DEMO' ? 'DEMO TRACKING' : 'LIVE GPS',
      isDemoActive,
      isGpsConnected: gpsStatus.isConfigured,
      latitude: trackingState && trackingState.latitude ? trackingState.latitude : (stops[0] ? stops[0].latitude : 11.3530),
      longitude: trackingState && trackingState.longitude ? trackingState.longitude : (stops[0] ? stops[0].longitude : 76.7959),
      currentStopName: trackingState && trackingState.current_stop_name ? trackingState.current_stop_name : 'Depot',
      nextStopName: trackingState && trackingState.next_stop_name ? trackingState.next_stop_name : 'Destination',
      etaMinutes: trackingState && trackingState.eta_minutes ? trackingState.eta_minutes : (route ? route.eta_minutes : 15),
      progressPercent: trackingState && trackingState.progress_percent !== undefined ? trackingState.progress_percent : 0.0,
      speedMultiplier: trackingState ? trackingState.speed_multiplier : 1,
      statusText: trackingState && trackingState.status_text ? trackingState.status_text : 'Stationary',
      lastUpdated: (trackingState && trackingState.last_updated) || new Date().toISOString()
    }
  });
});

module.exports = router;
