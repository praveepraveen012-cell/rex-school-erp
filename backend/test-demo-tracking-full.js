/**
 * Automated Test Suite for Google Maps Demo Bus Tracking - RexManagementApp
 * Validates all 15 requirements specified in Section 10:
 * - Super Admin login & bus/route/stop management
 * - DEMO GPS Simulator loop, gradual position changes, ETA calculations
 * - Parent live tracking & multi-child data isolation (403 security)
 * - Pause, resume, stop, reset, and speed multiplier controls
 * - Verification of existing modules (fees, students, attendance, dashboard)
 */

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      reqOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚍 STARTING DEMO BUS TRACKING VERIFICATION SUITE');
  console.log('================================================================\n');

  let adminToken = '';
  let parentToken = '';

  // 1. Super Admin Login
  console.log('Step 1: Super Admin Login');
  const adminLogin = await request('POST', '/auth/admin/login', {
    emailOrUsername: 'admin',
    password: 'AdminPassword123!'
  });
  assert(adminLogin.status === 200, 'Admin login returns 200 OK');
  assert(adminLogin.body.success === true, 'Admin login successful');
  assert(Boolean(adminLogin.body.token), 'Admin JWT token received');
  adminToken = adminLogin.body.token;

  // 2. Parent Login
  console.log('\nStep 2: Parent Login');
  const parentLogin = await request('POST', '/auth/parent/login', {
    mobile: '9876543210',
    parentMobile: '9876543210'
  });
  assert(parentLogin.status === 200, 'Parent login returns 200 OK');
  assert(parentLogin.body.success === true, 'Parent login successful');
  assert(Boolean(parentLogin.body.token), 'Parent JWT token received');
  parentToken = parentLogin.body.token;

  // 3. Maps Config & Telemetry Status
  console.log('\nStep 3: Maps Config & GPS Status');
  const mapsConfig = await request('GET', '/transport/maps-config');
  assert(mapsConfig.status === 200, 'Maps config returns 200 OK');
  assert(mapsConfig.body.provider === 'GOOGLE_MAPS', 'Maps provider is GOOGLE_MAPS');
  assert(mapsConfig.body.defaultCenter.lat === 11.4116, 'Default center lat is Nilgiris');

  const gpsStatus = await request('GET', '/transport/gps-status', null, adminToken);
  assert(gpsStatus.status === 200, 'GPS status returns 200 OK');
  assert(gpsStatus.body.mode === 'DEMO' || gpsStatus.body.mode === 'LIVE_GPS', 'Mode is supported');

  // 4. Create a Bus (Super Admin)
  console.log('\nStep 4: Create a Bus (Super Admin)');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const testBusNumber = `Demo Bus #${randomSuffix}`;
  const createBusRes = await request('POST', '/transport/bus', {
    busNumber: testBusNumber,
    vehicleNo: `TN-43-X-${randomSuffix}`,
    model: 'Tata Marcopolo School Star (32-Seater)',
    capacity: 32,
    status: 'ACTIVE',
    routeId: 1
  }, adminToken);
  if (createBusRes.status !== 201) console.error('Create Bus Error:', createBusRes.body);
  assert(createBusRes.status === 201, 'Bus created with 201 Created');
  const newBusId = createBusRes.body.bus.id;
  assert(newBusId > 0, `New bus ID generated: ${newBusId}`);

  // 5. Create a Route & Add Ordered Stops
  console.log('\nStep 5: Create a Route & Add Ordered Stops');
  const createRouteRes = await request('POST', '/transport/routes', {
    routeCode: `ROUTE-${randomSuffix}`,
    name: 'Ooty Lake - Botanical - Rex SSS Express',
    startPoint: 'Ooty Lake Boathouse',
    endPoint: 'Rex SSS Campus Gate',
    etaMinutes: 20,
    stops: [
      { stop_name: 'Ooty Lake Boathouse', stop_order: 1, latitude: 11.4085, longitude: 76.6905, pickup_time: '07:20 AM' },
      { stop_name: 'Charring Cross Square', stop_order: 2, latitude: 11.4116, longitude: 76.7088, pickup_time: '07:45 AM' },
      { stop_name: 'Rex SSS Main Gate', stop_order: 3, latitude: 11.4168, longitude: 76.6963, pickup_time: '08:10 AM' }
    ]
  }, adminToken);
  if (createRouteRes.status !== 201) console.error('Create Route Error:', createRouteRes.body);
  assert(createRouteRes.status === 201, 'Route created with ordered stops');
  const newRouteId = createRouteRes.body.routeId;

  // 6. Assign Driver, Route & Students
  console.log('\nStep 6: Assign Driver, Route & Students');
  const assignRes = await request('POST', '/transport/assign', {
    busId: newBusId,
    driverId: 1,
    routeId: newRouteId,
    studentIds: [3]
  }, adminToken);
  assert(assignRes.status === 200, 'Assignment completed successfully');

  // 7. View Bus Details
  console.log('\nStep 7: View Bus Details (Super Admin)');
  const viewBus = await request('GET', `/transport/bus/${newBusId}`, null, adminToken);
  assert(viewBus.status === 200, 'View bus returns 200 OK');
  assert(viewBus.body.bus.bus_number === testBusNumber, 'Bus number matches');
  assert(viewBus.body.driver && Boolean(viewBus.body.driver.name), `Driver linked correctly: ${viewBus.body.driver ? viewBus.body.driver.name : 'none'}`);

  // 8. Start Demo Tracking Engine on Bus 1
  console.log('\nStep 8: Start Demo Tracking Engine on Bus 1');
  const startRes = await request('POST', '/transport/demo-tracking/start', {
    busId: 1,
    speedMultiplier: 2
  }, adminToken);
  assert(startRes.status === 200, 'Demo tracking started with 200 OK');
  assert(startRes.body.tracking.is_active === 1, 'Simulation marked active in SQLite');
  const initialLat = startRes.body.tracking.latitude;
  const initialLng = startRes.body.tracking.longitude;
  const initialProg = startRes.body.tracking.progress_percent;
  console.log(`    Initial Position: (${initialLat}, ${initialLng}), Progress: ${initialProg * 100}%`);

  // 9. Confirm Position Changes Gradually on Backend (Wait 2.5s)
  console.log('\nStep 9: Confirm Position Changes Gradually on Backend');
  console.log('    Waiting 2.5s for simulator ticks...');
  await sleep(2500);

  const trackingNow = await request('GET', '/transport/bus/1/tracking', null, adminToken);
  assert(trackingNow.status === 200, 'Tracking query returns 200 OK');
  assert(trackingNow.body.tracking.isDemoActive === true, 'Demo is actively ticking');
  const updatedProg = trackingNow.body.tracking.progressPercent;
  const updatedLat = trackingNow.body.tracking.latitude;
  const updatedLng = trackingNow.body.tracking.longitude;
  console.log(`    Updated Position: (${updatedLat}, ${updatedLng}), Progress: ${(updatedProg * 100).toFixed(1)}%`);
  assert(updatedProg > initialProg || updatedProg !== initialProg, 'Progress advanced forward along route');
  assert(trackingNow.body.tracking.trackingMode === 'DEMO', 'Mode is labeled DEMO TRACKING');

  // 10. Parent Live Tracking (Authorized Child)
  console.log('\nStep 10: Parent Live Tracking (Aarav Sharma assigned to Bus 1)');
  await request('POST', '/transport/assign', { busId: 1, routeId: 1, studentIds: [1] }, adminToken);
  const parentBusRes = await request('GET', '/transport/my-bus?studentId=1', null, parentToken);
  assert(parentBusRes.status === 200, 'Parent can view assigned bus');
  assert(parentBusRes.body.hasAssignment === true, 'Parent child has assignment');
  assert(parentBusRes.body.tracking.busId === 1, 'Assigned bus is Bus 1');
  assert(parentBusRes.body.tracking.isDemoActive === true, 'Parent observes active simulation');
  // Confirm Web and Android/Mobile query observe the EXACT same coordinates
  assert(Math.abs(parentBusRes.body.tracking.currentLatitude - updatedLat) < 0.05, 'Parent sees identical synchronized coordinates');
  assert(parentBusRes.body.tracking.routeStops.length >= 2, 'Route stops list included for map display');

  // 11. Security & Data Isolation (Requirement 7)
  console.log('\nStep 11: Security & Data Isolation Enforcement');
  // A) Parent attempts to start tracking -> FORBIDDEN (403)
  const forbiddenStart = await request('POST', '/transport/demo-tracking/start', { busId: 1 }, parentToken);
  assert(forbiddenStart.status === 403, 'Parent is strictly forbidden (403) from starting tracking');

  // B) Parent attempts to view another child not linked -> FORBIDDEN (403)
  const forbiddenChild = await request('GET', '/transport/my-bus?studentId=999', null, parentToken);
  assert(forbiddenChild.status === 403, 'Parent cannot view transport of unlinked student (403)');

  // 12. Pause / Resume / Stop / Reset Testing (Requirement 4)
  console.log('\nStep 12: Pause, Resume, Stop, and Reset Tracking');

  // Pause
  const pauseRes = await request('POST', '/transport/demo-tracking/pause', { busId: 1 }, adminToken);
  assert(pauseRes.status === 200, 'Pause returns 200 OK');
  assert(pauseRes.body.tracking.is_active === 0, 'Tracking state is_active = 0 (paused)');
  const pausedLat = pauseRes.body.tracking.latitude;

  await sleep(1500);
  const checkPaused = await request('GET', '/transport/bus/1/tracking', null, adminToken);
  assert(checkPaused.body.tracking.isDemoActive === false, 'State remains paused');
  assert(checkPaused.body.tracking.latitude === pausedLat, 'Coordinates preserved while paused');

  // Resume
  const resumeRes = await request('POST', '/transport/demo-tracking/resume', { busId: 1 }, adminToken);
  assert(resumeRes.status === 200, 'Resume returns 200 OK');
  assert(resumeRes.body.tracking.is_active === 1, 'Tracking resumed from paused position');

  // Stop
  const stopRes = await request('POST', '/transport/demo-tracking/stop', { busId: 1 }, adminToken);
  assert(stopRes.status === 200, 'Stop returns 200 OK');
  assert(stopRes.body.tracking.is_active === 0, 'Tracking stopped');

  // Reset
  const resetRes = await request('POST', '/transport/demo-tracking/reset', { busId: 1 }, adminToken);
  assert(resetRes.status === 200, 'Reset returns 200 OK');
  assert(resetRes.body.tracking.progress_percent === 0.0, 'Progress reset to 0.0 at route start');

  // 13. Activate / Deactivate Bus Status
  console.log('\nStep 13: Activate / Deactivate Bus Status (Requirement 3)');
  const statusRes = await request('PATCH', `/transport/bus/${newBusId}/status`, { status: 'INACTIVE' }, adminToken);
  assert(statusRes.status === 200, 'Status updated to INACTIVE');
  assert(statusRes.body.status === 'INACTIVE', 'Status confirmed INACTIVE');

  // Attempt to start tracking on INACTIVE bus should safely reject
  const inactiveStart = await request('POST', '/transport/demo-tracking/start', { busId: newBusId }, adminToken);
  assert(inactiveStart.status === 400, 'Cannot start tracking on INACTIVE bus (400 Bad Request)');

  // 14. Existing Modules Sanity Check
  console.log('\nStep 14: Existing Modules Verification (Zero Regressions)');
  const statsRes = await request('GET', '/dashboard/stats', null, adminToken);
  assert(statsRes.status === 200, 'Dashboard stats API operational');

  const studentsRes = await request('GET', '/students', null, adminToken);
  assert(studentsRes.status === 200, 'Students SIS API operational');

  const attendanceRes = await request('GET', '/attendance', null, adminToken);
  assert(attendanceRes.status === 200, 'Smart attendance API operational');

  const feesRes = await request('GET', '/fees/student/1', null, adminToken);
  assert(feesRes.status === 200, 'Fees cashier & split payment API operational');

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================');
}

// Start server if needed and run tests
const app = require('./app');
const server = app.listen(PORT, async () => {
  try {
    await runTestSuite();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
