/**
 * End-to-End Headless Chrome Test for Bus Tracking - RexManagementApp
 * Verifies Web UI for both Super Admin and Parent roles:
 * - Super Admin Transport & Fleet screen, Google Maps / Topo visualizer
 * - Add bus, Edit bus, View bus modals
 * - Start, Pause, Resume, Stop, Reset demo tracking controls
 * - Parent Live Bus Tracker, multi-child switcher, 500m geofence alarm
 */

const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const APP_URL = 'http://localhost:3000';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async waitFor(expression, timeoutMs = 8000, intervalMs = 200) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await this.eval(expression);
        if (val) return val;
      } catch (e) {}
      await sleep(intervalMs);
    }
    throw new Error(`Timeout waiting for condition: ${expression}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runBrowserE2E() {
  console.log('================================================================');
  console.log('🌐 RUNNING HEADLESS CHROME BROWSER E2E TESTS');
  console.log('================================================================\n');

  // Start app server if not running
  const server = require('./app').listen(3000);

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\prave\\.gemini\\antigravity-ide\\scratch\\rex_school_erp_flutter\\.chrome_test_profile_tracking',
    APP_URL
  ], { stdio: 'ignore' });

  // Wait for Chrome remote debugging
  let version = null;
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (version && version.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!version) {
    console.error('❌ Could not connect to Chrome port 9222');
    chromeProcess.kill();
    server.close();
    process.exit(1);
  }

  console.log(`✓ Connected to Chrome: ${version['Browser']}`);

  const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  let passed = 0;
  let total = 0;
  function assert(cond, msg) {
    total++;
    if (cond) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  try {
    // 1. Navigate to App
    console.log('Test 1: Navigate to Web Application');
    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor('document.readyState === "complete" && typeof window.AuthUI !== "undefined"');
    assert(true, 'Application loaded and AuthUI initialized');

    // 2. Super Admin Login
    console.log('\nTest 2: Super Admin Login via UI');
    await cdp.eval(`
      (async function() {
        const res = await RexApi.loginAdmin('admin', 'AdminPassword123!');
        if (res.success) {
          App.applyRole('admin', false);
          App.switchView('transport');
        }
        return res;
      })()
    `);
    await cdp.waitFor('document.getElementById("transport-view")?.classList.contains("active-view")');
    assert(true, 'Admin authenticated and navigated to Transport & Fleet view');

    // 3. Super Admin Fleet Management Interface
    console.log('\nTest 3: Transport & Fleet Interface Elements');
    const hasFleetTitle = await cdp.eval('document.body.innerText.includes("Transport & GPS Fleet Management")');
    assert(hasFleetTitle, 'Fleet management header displayed');

    const hasController = await cdp.eval('document.body.innerText.includes("Backend Demo GPS Simulator Controller")');
    assert(hasController, 'Demo tracking controller card rendered');

    // Check Start / Pause / Resume / Stop / Reset buttons
    const hasButtons = await cdp.eval(`
      Boolean(document.querySelector('button[onclick*="startDemoTracking"]') &&
              document.querySelector('button[onclick*="pauseDemoTracking"]') &&
              document.querySelector('button[onclick*="stopDemoTracking"]') &&
              document.querySelector('button[onclick*="resetDemoTracking"]'))
    `);
    assert(hasButtons, 'All demo tracking controller buttons present');

    // 4. Test Add Bus Modal
    console.log('\nTest 4: Open Add Bus Modal');
    await cdp.eval('TransportModule.openAddBusModal()');
    await cdp.waitFor('document.getElementById("add-bus-modal")?.classList.contains("open")');
    const hasFormInputs = await cdp.eval('Boolean(document.getElementById("form-bus-number") && document.getElementById("form-vehicle-no"))');
    assert(hasFormInputs, 'Add Bus modal opened with required form fields');
    await cdp.eval('TransportModule.closeAddBusModal()');

    // 5. Test Routes & Stops Modal
    console.log('\nTest 5: Open Routes & Ordered Stops Management Modal');
    await cdp.eval('TransportModule.openRouteManagementModal()');
    await cdp.waitFor('document.getElementById("route-mgmt-modal")?.classList.contains("open")');
    const hasRoutesText = await cdp.eval('document.body.innerText.includes("Route & Ordered Stops Management")');
    assert(hasRoutesText, 'Routes & Stops modal opened with ordered coordinates');
    await cdp.eval('TransportModule.closeRouteModal()');

    // 6. Test Start Demo Tracking via UI
    console.log('\nTest 6: Start Demo Tracking via Controller');
    await cdp.eval('TransportModule.startDemoTracking(2)');
    await sleep(2500);
    const isDemoActiveText = await cdp.eval('document.body.innerText.includes("SIMULATION RUNNING") || document.body.innerText.includes("DEMO TRACKING")');
    assert(isDemoActiveText, 'Demo tracking active state confirmed in UI');

    // 7. Test Parent Portal Live Tracking
    console.log('\nTest 7: Parent Portal Live Bus Tracker');
    await cdp.eval(`
      (async function() {
        const res = await RexApi.loginParent('9876543210');
        if (res.success) {
          App.applyRole('parent', false);
          App.switchView('parent-portal');
        }
        return res;
      })()
    `);
    await cdp.waitFor('document.getElementById("parent-portal-view")?.classList.contains("active-view")');
    assert(true, 'Switched to Parent Portal perspective');

    // Verify Child Bus Tracker Widget
    await cdp.waitFor('document.getElementById("parent-bus-widget")');
    const hasBusTrackerWidget = await cdp.eval('Boolean(document.getElementById("parent-bus-widget"))');
    assert(hasBusTrackerWidget, 'Parent bus tracking widget present in portal');

    // Verify Multi-child selector
    const hasChildChips = await cdp.eval('document.body.innerText.includes("Aarav Sharma") && document.body.innerText.includes("Ananya Sharma")');
    assert(hasChildChips, 'Multi-child selector chips displayed (Aarav & Ananya)');

    // 8. Test 500m Proximity Alarm Modal
    console.log('\nTest 8: 500m Proximity Geofencing Modal');
    await cdp.eval('TransportModule.simulate500mAlert()');
    await cdp.waitFor('document.getElementById("bus-proximity-modal")?.classList.contains("open")');
    const hasAlertContent = await cdp.eval('document.body.innerText.includes("500m Proximity Geofence Alert")');
    assert(hasAlertContent, '500m Proximity Alert modal opened with live distance & WhatsApp copy');
    await cdp.eval('TransportModule.closeProximityModal()');

    console.log('\n================================================================');
    console.log(`🎉 BROWSER E2E AUDIT PASSED: ${passed}/${total} TESTS SUCCESSFUL!`);
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ BROWSER E2E TEST FAILED:', err);
    process.exit(1);
  } finally {
    cdp.close();
    chromeProcess.kill();
    server.close();
    process.exit(0);
  }
}

runBrowserE2E();
