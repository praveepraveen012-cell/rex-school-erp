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
    mode: isConfigured ? 'LIVE_GPS' : 'DEMO',
    message: isConfigured
      ? `Connected to ${provider} GPS telematics service`
      : 'Live GPS provider is not configured. Telematics is operating in Demo Simulation Mode for interactive testing.'
  };
}

// Helper: advance demo tracking state along route stops
function updateDemoTrackingPosition(busId) {
  const state = db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [busId]);
  if (!state) return null;

  if (state.tracking_mode !== 'DEMO' || state.is_active !== 1) {
    return state;
  }

  const routeId = state.route_id;
  if (!routeId) return state;

  const stops = db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [routeId]);
  if (stops.length < 2) return state;

  // Advance based on elapsed time and speed multiplier
  const lastUpdatedTime = state.last_updated ? new Date(state.last_updated).getTime() : Date.now();
  const elapsedSec = Math.max(0.2, (Date.now() - lastUpdatedTime) / 1000);

  // Speed: ~2.5% progression per 2 seconds at 1x
  const speed = state.speed_multiplier || 1;
  const progressStep = (0.02 * speed) * (elapsedSec / 2.0);
  let newProgress = (state.progress_percent + progressStep);
  if (newProgress >= 1.0) {
    // Loop smoothly back to beginning for continuous demo tracking
    newProgress = newProgress % 1.0;
  }

  // Calculate segment and coordinates
  const totalSegments = stops.length - 1;
  const rawSegment = newProgress * totalSegments;
  const segIndex = Math.min(totalSegments - 1, Math.floor(rawSegment));
  const t = rawSegment - segIndex;

  const currentStop = stops[segIndex];
  const nextStop = stops[segIndex + 1] || stops[segIndex];

  const currentLat = (currentStop.latitude || 11.3530) + ((nextStop.latitude || 11.4168) - (currentStop.latitude || 11.3530)) * t;
  const currentLng = (currentStop.longitude || 76.7959) + ((nextStop.longitude || 76.6963) - (currentStop.longitude || 76.7959)) * t;

  const route = db.get(`SELECT * FROM bus_routes WHERE id = ?`, [routeId]);
  const baseEta = (route && route.eta_minutes) || 15;
  const remainingEta = Math.max(1, Math.round(baseEta * (1.0 - newProgress)));
  const statusText = newProgress > 0.95 ? 'Approaching Campus Gate' : `En Route to ${nextStop.stop_name}`;

  db.run(
    `UPDATE bus_tracking_state
     SET progress_percent = ?, current_stop_index = ?, latitude = ?, longitude = ?,
         current_stop_name = ?, next_stop_name = ?, eta_minutes = ?, status_text = ?,
         last_updated = CURRENT_TIMESTAMP
     WHERE bus_id = ?`,
    [
      parseFloat(newProgress.toFixed(4)),
      segIndex,
      parseFloat(currentLat.toFixed(6)),
      parseFloat(currentLng.toFixed(6)),
      currentStop.stop_name,
      nextStop.stop_name,
      remainingEta,
      statusText,
      busId
    ]
  );

  return db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [busId]);
}

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
        name: 'Demo Live Tracking Mode',
        description: 'Simulates continuous waypoint progression along configured stops without physical GPS hardware.'
      },
      {
        mode: 'LIVE_GPS',
        name: 'Live GPS Satellite Telematics',
        description: 'Receives real telemetry coordinates when telematics API provider is connected.'
      }
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
      `SELECT sta.*, b.bus_number, b.vehicle_no, b.model, b.capacity, b.status as bus_status,
              br.route_code, br.name as route_name, br.start_point, br.end_point, br.eta_minutes, br.live_status,
              bs.stop_name as pickup_stop_name, bs.pickup_time, bs.drop_time,
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

    // Advance demo tracking position if demo is running
    const trackingState = updateDemoTrackingPosition(assignment.bus_id);
    const gpsStatus = getGpsProviderStatus();

    const stops = db.query(
      `SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`,
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
        routeName: assignment.route_name,
        routeCode: assignment.route_code,
        startPoint: assignment.start_point,
        endPoint: assignment.end_point,
        driverName: assignment.driver_name || 'Assigned Driver',
        driverMobile: assignment.driver_mobile || '9443210045',
        driverLicense: assignment.license_no || 'TN43-2015',
        trackingMode: trackingMode,
        trackingModeLabel: trackingMode === 'DEMO' ? 'Demo Tracking' : 'Live GPS',
        isDemoActive: isDemoActive,
        isGpsConnected: gpsStatus.isConfigured,
        speedMultiplier: trackingState ? trackingState.speed_multiplier : 1,
        progressPercent: trackingState ? trackingState.progress_percent : 0.0,
        currentLatitude: trackingState ? trackingState.latitude : (stops.length > 0 ? stops[0].latitude : 11.3530),
        currentLongitude: trackingState ? trackingState.longitude : (stops.length > 0 ? stops[0].longitude : 76.7959),
        currentStop: trackingState ? trackingState.current_stop_name : (stops.length > 0 ? stops[0].stop_name : 'Depot'),
        nextStop: trackingState ? trackingState.next_stop_name : (stops.length > 1 ? stops[1].stop_name : 'Destination'),
        status: isDemoActive ? trackingState.status_text : (gpsStatus.isConfigured ? assignment.live_status : 'Stationary (Demo Ready)'),
        etaMinutes: trackingState ? trackingState.eta_minutes : assignment.eta_minutes,
        pickupStop: assignment.pickup_stop_name || 'Designated Gate',
        pickupTime: assignment.pickup_time || '07:45 AM',
        dropTime: assignment.drop_time || '03:45 PM',
        lastUpdated: (trackingState && trackingState.last_updated) || new Date().toISOString(),
        routeStops: stops,
        message: isDemoActive
          ? 'Live Demo Tracking simulation is running along the configured route.'
          : (gpsStatus.isConfigured ? 'Connected to live GPS satellite telematics.' : 'Demo live tracking is currently stationary. Start demo tracking in Super Admin to observe motion.')
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
// SUPER ADMIN BUS CRUD
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
        busNumber,
        vehicleNo,
        model || 'Standard Fleet (36-Seater)',
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

    // Initialize bus_tracking_state
    db.run(
      `INSERT OR REPLACE INTO bus_tracking_state
       (bus_id, route_id, driver_id, tracking_mode, is_active, speed_multiplier, current_stop_index, progress_percent, latitude, longitude, current_stop_name, next_stop_name, status_text)
       VALUES (?, ?, ?, 'DEMO', 0, 1, 0, 0.0, 11.3530, 76.7959, 'Initial Depot', 'Campus Gate', 'Stationary (Demo Ready)')`,
      [newBusId, routeId || null, driverId || null]
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

    auditService.log(req.user.id, req.user.role, 'UPDATE_BUS', 'transport', busId.toString(), `Updated bus ${bus.bus_number}`);

    return res.json({
      success: true,
      message: 'Bus updated successfully.'
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to update bus: ' + err.message });
  }
});

// DELETE /api/transport/bus/:id - Deactivate/Delete Bus
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
    // Check if students are currently assigned
    const assignedCount = db.get(`SELECT COUNT(*) as count FROM student_transport_assignments WHERE bus_id = ?`, [busId]);
    if (assignedCount && assignedCount.count > 0) {
      // Deactivate instead of hard delete to preserve historical integrity
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
// DRIVERS & ROUTES MANAGEMENT
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

// GET /api/transport/routes - List routes with stops
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

    return res.status(201).json({
      success: true,
      message: 'Route created successfully.',
      routeId: result.lastInsertRowid
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to create route: ' + err.message });
  }
});

// POST /api/transport/assign - Assign Bus -> Driver -> Route -> Students
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

    return res.json({
      success: true,
      message: 'Transport assignment updated successfully.'
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to assign: ' + err.message });
  }
});

// ----------------------------------------------------------------------------
// DEMO LIVE TRACKING SIMULATION CONTROLLER (Requirements 12, 13, 14, 15, 16)
// ----------------------------------------------------------------------------

// POST /api/transport/demo-tracking/start - Start demo tracking for a bus
router.post('/demo-tracking/start', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control demo tracking simulations.' });
  }

  const { busId, routeId, speedMultiplier } = req.body;
  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID required.' });
  }

  const bus = db.get(`SELECT * FROM buses WHERE id = ?`, [busId]);
  if (!bus) {
    return res.status(404).json({ success: false, error: 'Bus not found.' });
  }

  // Find assigned or specified route
  const assignedRoute = routeId
    ? db.get(`SELECT * FROM bus_routes WHERE id = ?`, [routeId])
    : db.get(`SELECT * FROM bus_routes WHERE assigned_bus_id = ?`, [busId]) || db.get(`SELECT * FROM bus_routes LIMIT 1`);

  if (!assignedRoute) {
    return res.status(400).json({ success: false, error: 'No route configured for demo tracking.' });
  }

  const stops = db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [assignedRoute.id]);
  const initialStop = stops.length > 0 ? stops[0] : { stop_name: 'Start', latitude: 11.3530, longitude: 76.7959 };
  const nextStop = stops.length > 1 ? stops[1] : initialStop;

  const speed = parseInt(speedMultiplier, 10) || 1;

  db.run(
    `INSERT OR REPLACE INTO bus_tracking_state
     (bus_id, route_id, driver_id, tracking_mode, is_active, speed_multiplier, current_stop_index, progress_percent, latitude, longitude, current_stop_name, next_stop_name, eta_minutes, status_text, last_updated)
     VALUES (?, ?, ?, 'DEMO', 1, ?, 0, 0.05, ?, ?, ?, ?, ?, 'En Route (Demo Tracking Active)', CURRENT_TIMESTAMP)`,
    [
      busId,
      assignedRoute.id,
      bus.driver_id || null,
      speed,
      initialStop.latitude,
      initialStop.longitude,
      initialStop.stop_name,
      nextStop.stop_name,
      assignedRoute.eta_minutes || 15
    ]
  );

  auditService.log(req.user.id, req.user.role, 'DEMO_TRACKING_START', 'transport', busId.toString(), `Started Demo Tracking for bus ${bus.bus_number}`);

  return res.json({
    success: true,
    message: `Demo Tracking activated for ${bus.bus_number} on ${assignedRoute.name}.`,
    busId,
    routeName: assignedRoute.name,
    speedMultiplier: speed,
    mode: 'DEMO'
  });
});

// POST /api/transport/demo-tracking/stop - Stop demo tracking
router.post('/demo-tracking/stop', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control demo tracking simulations.' });
  }

  const { busId } = req.body;
  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID required.' });
  }

  db.run(
    `UPDATE bus_tracking_state
     SET is_active = 0, status_text = 'Stationary (Demo Paused)', last_updated = CURRENT_TIMESTAMP
     WHERE bus_id = ?`,
    [busId]
  );

  return res.json({
    success: true,
    message: 'Demo Tracking stopped.',
    busId
  });
});

// POST /api/transport/demo-tracking/reset - Reset demo tracking to initial stop
router.post('/demo-tracking/reset', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can control demo tracking simulations.' });
  }

  const { busId } = req.body;
  if (!busId) {
    return res.status(400).json({ success: false, error: 'Bus ID required.' });
  }

  const state = db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [busId]);
  if (!state || !state.route_id) {
    return res.status(400).json({ success: false, error: 'Tracking state not found for this bus.' });
  }

  const stops = db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [state.route_id]);
  const firstStop = stops[0] || { stop_name: 'Start', latitude: 11.3530, longitude: 76.7959 };
  const secondStop = stops[1] || firstStop;

  db.run(
    `UPDATE bus_tracking_state
     SET progress_percent = 0.0, current_stop_index = 0,
         latitude = ?, longitude = ?,
         current_stop_name = ?, next_stop_name = ?,
         status_text = 'Stationary (Reset to Start)', last_updated = CURRENT_TIMESTAMP
     WHERE bus_id = ?`,
    [firstStop.latitude, firstStop.longitude, firstStop.stop_name, secondStop.stop_name, busId]
  );

  return res.json({
    success: true,
    message: 'Demo Tracking reset to route start point.',
    busId
  });
});

// POST /api/transport/demo-tracking/step - Explicitly step simulation forward
router.post('/demo-tracking/step', (req, res) => {
  const { busId } = req.body;
  const targetBusId = busId || 1;
  const updated = updateDemoTrackingPosition(targetBusId);

  return res.json({
    success: true,
    state: updated
  });
});

// GET /api/transport/bus/:id/tracking - Detailed live tracking for a specific bus
// PARENT BUS SECURITY (Section 15): Parents can ONLY view tracking for buses assigned to their child!
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

  const trackingState = updateDemoTrackingPosition(busId);
  const gpsStatus = getGpsProviderStatus();

  const driver = db.get(`SELECT * FROM drivers WHERE assigned_bus_id = ?`, [busId]);
  const route = db.get(`SELECT * FROM bus_routes WHERE assigned_bus_id = ? OR id = ?`, [busId, trackingState ? trackingState.route_id : 1]);
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
      trackingMode,
      trackingModeLabel: trackingMode === 'DEMO' ? 'Demo Tracking' : 'Live GPS',
      isDemoActive,
      isGpsConnected: gpsStatus.isConfigured,
      latitude: trackingState ? trackingState.latitude : (stops[0] ? stops[0].latitude : 11.3530),
      longitude: trackingState ? trackingState.longitude : (stops[0] ? stops[0].longitude : 76.7959),
      currentStopName: trackingState ? trackingState.current_stop_name : 'Depot',
      nextStopName: trackingState ? trackingState.next_stop_name : 'Destination',
      etaMinutes: trackingState ? trackingState.eta_minutes : (route ? route.eta_minutes : 15),
      progressPercent: trackingState ? trackingState.progress_percent : 0.0,
      speedMultiplier: trackingState ? trackingState.speed_multiplier : 1,
      statusText: trackingState ? trackingState.status_text : 'Stationary',
      lastUpdated: (trackingState && trackingState.last_updated) || new Date().toISOString()
    }
  });
});

module.exports = router;
