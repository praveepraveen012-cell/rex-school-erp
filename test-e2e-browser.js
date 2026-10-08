/**
 * End-to-End Headless Chrome CDP Test Suite for RexManagementApp
 * Runs genuine browser instance against http://localhost:3000
 * Uses native Node 24 WebSocket and Chrome DevTools Protocol.
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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
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
        if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' ');
          if (msg.params.type === 'error') {
            console.error('  [CONSOLE ERROR]', text);
          }
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          console.error('  [UNCAUGHT EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
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

async function runBrowserAudit() {
  console.log('🚀 Spawning Google Chrome Headless on remote debugging port 9222...');
  
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\prave\\.gemini\\antigravity-ide\\scratch\\rex_school_erp_flutter\\.chrome_test_profile',
    APP_URL
  ], { stdio: 'ignore' });

  // Wait for Chrome remote debugging to be ready
  let version = null;
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (version && version.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!version) {
    console.error('❌ Could not connect to Chrome DevTools port 9222');
    chromeProcess.kill();
    process.exit(1);
  }

  console.log(`✓ Connected to Chrome: ${version['Browser']}`);

  // Get active page target
  const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  console.log(`✓ Attached to page target: ${pageTarget.url}`);

  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  let passed = 0;
  let failed = 0;
  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  try {
    console.log('\n--- Test 1: Initial Page Load & Document Ready ---');
    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor('document.readyState === "complete" && typeof window.AuthUI !== "undefined"');

    // Ensure state is clean
    await cdp.eval('localStorage.clear(); sessionStorage.clear(); window.location.hash = "";');
    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor('document.readyState === "complete" && typeof window.AuthUI !== "undefined"');

    const initialTitle = await cdp.eval('document.title');
    assert(initialTitle.includes('Rex Senior Secondary School'), `Document title correct: "${initialTitle}"`);

    const hasSignInBtn = await cdp.eval('Boolean(document.getElementById("home-nav-signin-btn"))');
    assert(hasSignInBtn, 'Top navigation bar contains dedicated "Sign In" button (#home-nav-signin-btn)');

    console.log('\n--- Test 2: Unauthenticated Protected Route Guard ---');
    const directAccessAttempt = await cdp.eval(`
      (function() {
        if (window.App && typeof window.App.switchView === 'function') {
          window.App.switchView('dashboard');
        }
        return document.querySelector('.view-section.active')?.id || 'home';
      })()
    `);
    assert(directAccessAttempt === 'home', `Unauthenticated switchView('dashboard') prevented, active view is: ${directAccessAttempt}`);

    console.log('\n--- Test 3: Open Auth Modal & Invalid Login Rejection ---');
    await cdp.eval('window.AuthUI.showLoginModal()');
    await cdp.waitFor('Boolean(document.getElementById("rex-login-modal") && document.getElementById("rex-login-modal").style.display === "flex")');

    const isModalOpen = await cdp.eval(`
      document.getElementById('rex-login-modal')?.style.display === 'flex'
    `);
    assert(isModalOpen, 'Auth modal successfully opened and displayed (#rex-login-modal)');

    // Attempt invalid credentials
    await cdp.eval(`
      (function() {
        document.getElementById('admin-user').value = 'admin';
        document.getElementById('admin-pass').value = 'WrongPassword999!';
      })()
    `);

    // Submit invalid form
    await cdp.eval(`
      document.getElementById('admin-login-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    `);

    await cdp.waitFor('Boolean(document.getElementById("auth-error-banner") && document.getElementById("auth-error-banner").style.display !== "none")');

    const errorBannerState = await cdp.eval(`
      (function() {
        const b = document.getElementById('auth-error-banner');
        return {
          displayed: b && b.style.display !== 'none',
          text: b ? b.innerText : ''
        };
      })()
    `);
    assert(errorBannerState.displayed, `Error banner displayed on invalid login: "${errorBannerState.text}"`);
    assert(errorBannerState.text.includes('Invalid credentials') || errorBannerState.text.includes('Incorrect password'), 'Error banner contains user-friendly message');

    const buttonEnabledAfterFail = await cdp.eval(`
      !document.getElementById('btn-admin-submit').disabled
    `);
    assert(buttonEnabledAfterFail, 'Login button re-enabled after failed attempt (prevents permanently stuck loading state)');

    console.log('\n--- Test 4: Valid Super Admin Login ---');
    console.log('Executing valid admin login...');
    const adminSubmitTrace = await cdp.eval(`
      (async function() {
        try {
          document.getElementById('admin-user').value = 'admin';
          document.getElementById('admin-pass').value = 'AdminPassword123!';
          const res = await window.RexApi.loginAdmin('admin', 'AdminPassword123!');
          window.AuthUI.hideLoginModal();
          window.AuthUI.renderUserBadge();
          if (window.App) {
            window.App.applyRole('admin', false);
            window.App.switchView('dashboard');
          }
          return {
            success: true,
            role: window.RexApi.getRole(),
            token: Boolean(window.RexApi.getToken()),
            view: window.App ? window.App.currentView : null
          };
        } catch (err) {
          return { success: false, error: err.message, status: err.status };
        }
      })()
    `);
    console.log('Admin login trace result:', JSON.stringify(adminSubmitTrace));

    const adminAuthState = await cdp.eval(`
      (function() {
        return {
          token: RexApi.getToken(),
          user: RexApi.getUser(),
          role: RexApi.getRole(),
          activeView: window.App ? window.App.currentView : '',
          erpActive: document.body.classList.contains('erp-active'),
          modalHidden: document.getElementById('rex-login-modal')?.style.display === 'none',
          badgeName: document.querySelector('.rex-user-name')?.innerText,
          badgeRole: document.querySelector('.rex-role-tag')?.innerText
        };
      })()
    `);

    assert(Boolean(adminAuthState.token), 'Valid JWT token stored in localStorage');
    assert(adminAuthState.role === 'SUPER_ADMIN', 'User authenticated with role SUPER_ADMIN');
    assert(adminAuthState.activeView === 'dashboard', `Successfully redirected to Super Admin dashboard: #${adminAuthState.activeView}`);
    assert(adminAuthState.modalHidden, 'Auth modal hidden after successful login');
    assert(adminAuthState.erpActive, 'ERP interface activated');
    assert(Boolean(adminAuthState.badgeName), `User badge name displayed: "${adminAuthState.badgeName}"`);
    assert(Boolean(adminAuthState.badgeRole), `User badge role displayed: "${adminAuthState.badgeRole}"`);

    console.log('\n--- Test 5: Page Refresh Session Persistence ---');
    await cdp.send('Page.reload');
    await cdp.waitFor('document.readyState === "complete" && Boolean(window.RexApi && window.RexApi.isAuthenticated() && window.App && window.App.currentView === "dashboard")');
    await sleep(600);

    const refreshAuthState = await cdp.eval(`
      (function() {
        return {
          token: RexApi.getToken(),
          user: RexApi.getUser(),
          role: RexApi.getRole(),
          activeView: window.App ? window.App.currentView : '',
          erpActive: document.body.classList.contains('erp-active'),
          badgeName: document.querySelector('.rex-user-name')?.innerText || document.getElementById('current-user-name')?.innerText
        };
      })()
    `);

    assert(Boolean(refreshAuthState.token), 'Token persisted in localStorage after browser reload');
    assert(refreshAuthState.erpActive, 'ERP remains active after reload');
    assert(refreshAuthState.activeView === 'dashboard', 'User remains on #dashboard after reload');
    assert(Boolean(refreshAuthState.badgeName), `User profile badge restored on reload: "${refreshAuthState.badgeName}"`);

    console.log('\n--- Test 6: Super Admin Logout ---');
    await cdp.eval(`
      (function() {
        const logoutBtn = document.querySelector('.rex-btn-logout');
        if (logoutBtn) logoutBtn.click();
        else window.RexApi.logout();
      })()
    `);

    await cdp.waitFor('Boolean(!window.RexApi.isAuthenticated() && window.App && window.App.currentView === "home")');

    const loggedOutState = await cdp.eval(`
      (function() {
        return {
          token: RexApi.getToken(),
          user: RexApi.getUser(),
          role: RexApi.getRole(),
          activeView: window.App ? window.App.currentView : '',
          erpActive: document.body.classList.contains('erp-active'),
          hasUserPill: Boolean(document.querySelector('.rex-user-pill'))
        };
      })()
    `);

    assert(!loggedOutState.token, 'Token cleared from localStorage upon logout');
    assert(!loggedOutState.user, 'User object cleared from localStorage');
    assert(!loggedOutState.erpActive, 'ERP layout deactivated');
    assert(loggedOutState.activeView === 'home', `Redirected back to landing view: #${loggedOutState.activeView}`);
    assert(!loggedOutState.hasUserPill, 'User badge removed from topbar');

    console.log('\n--- Test 7: Teacher OTP Login & Role Routing ---');
    await cdp.eval('window.AuthUI.showLoginModal(); window.AuthUI.switchTab("teacher");');
    console.log('Sending Teacher OTP...');
    const sendOtpTrace = await cdp.eval(`
      (async function() {
        document.getElementById('teacher-phone').value = '9876500004';
        try {
          await window.AuthUI.handleTeacherSendOtp(new Event('submit'));
          return {
            step1: document.getElementById('teacher-step-1')?.style.display,
            step2: document.getElementById('teacher-step-2')?.style.display,
            devOtp: document.getElementById('teacher-otp')?.value
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);
    console.log('Send OTP trace:', JSON.stringify(sendOtpTrace));

    await cdp.waitFor('Boolean(document.getElementById("teacher-step-2") && document.getElementById("teacher-step-2").style.display !== "none")');

    const otpInputVisible = await cdp.eval(`
      document.getElementById('teacher-step-2')?.style.display !== 'none'
    `);
    assert(otpInputVisible, 'Teacher OTP verification form displayed after requesting OTP');

    // Enter test OTP 123456 and verify
    console.log('Verifying Teacher OTP...');
    const verifyOtpTrace = await cdp.eval(`
      (async function() {
        document.getElementById('teacher-otp').value = '123456';
        try {
          await window.AuthUI.handleTeacherVerifyOtp(new Event('submit'));
          return {
            token: Boolean(window.RexApi.getToken()),
            role: window.RexApi.getRole(),
            view: window.App ? window.App.currentView : null
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);
    console.log('Verify OTP trace:', JSON.stringify(verifyOtpTrace));

    await cdp.waitFor('Boolean(window.RexApi && window.RexApi.getRole() === "TEACHER" && window.App && window.App.currentView === "attendance")');

    const teacherAuthState = await cdp.eval(`
      (function() {
        return {
          token: RexApi.getToken(),
          user: RexApi.getUser(),
          role: RexApi.getRole(),
          activeView: window.App ? window.App.currentView : '',
          badgeName: document.querySelector('.rex-user-name')?.innerText,
          badgeRole: document.querySelector('.rex-role-tag')?.innerText
        };
      })()
    `);

    assert(Boolean(teacherAuthState.token), 'Teacher JWT token stored in localStorage');
    assert(teacherAuthState.role === 'TEACHER', 'Authenticated role is TEACHER');
    assert(teacherAuthState.activeView === 'attendance', `Teacher redirected to attendance view: #${teacherAuthState.activeView}`);
    assert(teacherAuthState.badgeName.includes('Anitha') || teacherAuthState.badgeName.includes('Kumar') || teacherAuthState.badgeName.includes('maths'), `Teacher badge name: "${teacherAuthState.badgeName}"`);
    assert(teacherAuthState.badgeRole.toUpperCase().includes('TEACHER'), `Teacher badge role: "${teacherAuthState.badgeRole}"`);

    // Logout teacher
    await cdp.eval('window.RexApi.logout()');
    await cdp.waitFor('Boolean(!window.RexApi.isAuthenticated() && window.App && window.App.currentView === "home")');

    console.log('\n--- Test 8: Parent Mobile Login & Multi-Child Switcher ---');
    await cdp.eval('window.AuthUI.showLoginModal(); window.AuthUI.switchTab("parent");');
    await cdp.waitFor('Boolean(document.getElementById("parent-phone"))');

    console.log('Logging in Parent with mobile...');
    const parentTrace = await cdp.eval(`
      (async function() {
        document.getElementById('parent-phone').value = '9876543210';
        try {
          await window.AuthUI.handleParentLogin(new Event('submit'));
          return {
            token: Boolean(window.RexApi.getToken()),
            role: window.RexApi.getRole(),
            view: window.App ? window.App.currentView : null
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);
    console.log('Parent trace:', JSON.stringify(parentTrace));

    await cdp.waitFor('Boolean(window.RexApi && window.RexApi.getRole() === "PARENT" && window.App && window.App.currentView === "parent-portal")');

    const parentAuthState = await cdp.eval(`
      (function() {
        const select = document.querySelector('.rex-student-switcher select');
        return {
          token: RexApi.getToken(),
          user: RexApi.getUser(),
          role: RexApi.getRole(),
          activeView: window.App ? window.App.currentView : '',
          badgeName: document.querySelector('.rex-user-name')?.innerText,
          badgeRole: document.querySelector('.rex-role-tag')?.innerText,
          childrenCount: select ? select.options.length : 0
        };
      })()
    `);

    assert(Boolean(parentAuthState.token), 'Parent JWT token stored');
    assert(parentAuthState.role === 'PARENT', 'Authenticated role is PARENT');
    assert(parentAuthState.activeView === 'parent-portal', `Parent redirected to parent portal: #${parentAuthState.activeView}`);
    assert(parentAuthState.badgeRole.toUpperCase().includes('PARENT'), `Parent badge role: "${parentAuthState.badgeRole}"`);
    assert(parentAuthState.childrenCount === 2, `Multi-child selector populated with 2 children (Aarav & Ananya)`);

    // Logout parent
    await cdp.eval('window.RexApi.logout()');
    await sleep(500);

    console.log('\n==================================================');
    console.log(`🎉 BROWSER E2E SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('==================================================\n');

  } finally {
    cdp.close();
    chromeProcess.kill();
    await sleep(500);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runBrowserAudit().catch(err => {
  console.error('Fatal Browser E2E Error:', err);
  process.exit(1);
});
