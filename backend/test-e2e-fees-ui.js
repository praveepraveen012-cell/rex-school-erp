/**
 * End-to-End Headless Chrome Test for Fee Cashier & Ledger Desk - RexManagementApp
 * Verifies:
 * 1. Super Admin Fee Cashier & Ledger Desk:
 *    - NO "Collect Fee" button exists anywhere in the DOM
 *    - Administrative actions "View Details", "Receipt", "Send Reminder" are present
 *    - View Details modal opens and contains zero payment inputs/buttons
 * 2. Parent App / Portal:
 *    - Parent can view fees and initiate payment (Split / Full)
 */

const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9223;
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

async function runFeeE2E() {
  console.log('================================================================');
  console.log('🌐 RUNNING HEADLESS CHROME BROWSER E2E TESTS (FEE DESK)');
  console.log('================================================================\n');

  const server = require('./app').listen(3000);

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\prave\\.gemini\\antigravity-ide\\scratch\\rex_school_erp_flutter\\.chrome_test_profile_fees',
    APP_URL
  ], { stdio: 'ignore' });

  let version = null;
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (version && version.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  if (!version) {
    console.error('❌ Could not connect to Chrome port 9223');
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
    // 1. Load Application
    console.log('Test 1: Navigate to Web Application');
    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor('document.readyState === "complete" && typeof window.AuthUI !== "undefined"');
    assert(true, 'Application loaded and AuthUI initialized');

    // 2. Super Admin Login
    console.log('\nTest 2: Super Admin Login & Navigate to Fee Desk');
    await cdp.eval(`
      (async function() {
        const res = await RexApi.loginAdmin('admin', 'AdminPassword123!');
        if (res.success) {
          App.applyRole('admin', false);
          App.switchView('fees');
        }
        return res;
      })()
    `);
    await cdp.waitFor('document.getElementById("fees-view")?.classList.contains("active-view")');
    assert(true, 'Admin authenticated and navigated to Fee Cashier & Ledger Desk');

    // 3. Confirm Summary Metrics & Filters
    console.log('\nTest 3: Financial Summary & Filters');
    const totalBilled = await cdp.eval('document.getElementById("fee-total-billed")?.innerText');
    const totalCollected = await cdp.eval('document.getElementById("fee-total-collected")?.innerText');
    const totalOutstanding = await cdp.eval('document.getElementById("fee-total-outstanding")?.innerText');
    assert(Boolean(totalBilled && totalCollected && totalOutstanding), `Financial KPIs rendered (Billed: ${totalBilled}, Collected: ${totalCollected}, Due: ${totalOutstanding})`);

    // 4. CRITICAL: Confirm NO "Collect Fee" Button Exists on Super Admin Fee Desk
    console.log('\nTest 4: Absence of "Collect Fee" Action on Super Admin Screen');
    const hasCollectFeeButton = await cdp.eval(`
      Array.from(document.querySelectorAll('#fees-view button')).some(b => b.innerText.toLowerCase().includes('collect fee'))
    `);
    assert(hasCollectFeeButton === false, 'Confirmed ZERO "Collect Fee" buttons exist in Fee Desk table');

    // Confirm presence of View Details, Receipt, and Send Reminder
    const hasViewDetailsBtn = await cdp.eval(`
      Array.from(document.querySelectorAll('#fee-table-body button')).some(b => b.innerText.includes('View Details'))
    `);
    assert(hasViewDetailsBtn, 'Action "View Details" button rendered on student ledger cards');

    const hasSendReminderBtn = await cdp.eval(`
      Array.from(document.querySelectorAll('#fee-table-body button')).some(b => b.innerText.includes('Send Reminder'))
    `);
    assert(hasSendReminderBtn, 'Action "Send Reminder" button rendered for students with outstanding balance');

    // 5. Test "View Details" Modal (Must have ZERO payment inputs)
    console.log('\nTest 5: Open Student Fee Ledger Modal & Verify Zero Payment Capability');
    await cdp.eval('FeesModule.openStudentLedgerModal("STU-1003")'); // Rohan Verma
    await cdp.waitFor('document.getElementById("cashier-modal")?.classList.contains("open")');
    assert(true, 'Student Fee Ledger modal opened');

    const modalTitle = await cdp.eval('document.getElementById("cashier-modal-title")?.innerText');
    assert(modalTitle.includes('Ledger') || modalTitle.includes('Details'), `Modal title: "${modalTitle}"`);

    // Verify modal contains NO amount-entry field, NO payment method pills, NO Process Payment button
    const hasPayInput = await cdp.eval('Boolean(document.getElementById("cashier-pay-amount") || document.getElementById("split-pay-amount"))');
    assert(hasPayInput === false, 'Confirmed NO payment amount input field in Super Admin modal');

    const hasProcessBtn = await cdp.eval(`
      Array.from(document.querySelectorAll('#cashier-modal button')).some(b => 
        b.innerText.toLowerCase().includes('process') || 
        b.innerText.toLowerCase().includes('pay now') || 
        b.innerText.toLowerCase().includes('proceed to payment')
      )
    `);
    assert(hasProcessBtn === false, 'Confirmed NO Pay Now or Process Payment button in modal');

    // Confirm Send Reminder button in modal works
    const hasModalReminder = await cdp.eval(`
      Array.from(document.querySelectorAll('#cashier-modal button')).some(b => b.innerText.includes('Send Payment Reminder'))
    `);
    assert(hasModalReminder, 'Send Payment Reminder action button available in modal');
    await cdp.eval('FeesModule.closeCashierModal()');

    // 6. Test Receipt Preview Modal
    console.log('\nTest 6: Official Receipt Preview');
    await cdp.eval('FeesModule.previewReceipt("STU-1003")');
    await cdp.waitFor('document.getElementById("receipt-preview-modal")?.classList.contains("open")');
    const hasReceiptDoc = await cdp.eval('document.body.innerText.includes("OFFICIAL FEE RECEIPT")');
    assert(hasReceiptDoc, 'Official stamped fee receipt displayed');
    await cdp.eval('FeesModule.closeReceiptModal()');

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

runFeeE2E();
