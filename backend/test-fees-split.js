const assert = require('assert');
const app = require('./app');
const db = require('./database/db');

async function runSplitPaymentAndBusTests() {
  console.log('🧪 Starting Fees, Split Payment, Super Admin & Bus Tracking QA Tests...\n');

  const server = app.listen(3003);
  const BASE = 'http://localhost:3003/api';

  try {
    // ------------------------------------------------------------------------
    // SETUP: Clear temporary test fee payments for student 1 & student 2 to have known balances
    db.run(`DELETE FROM fee_payments WHERE student_id IN (1, 2, 3)`);
    db.run(`DELETE FROM fee_structures WHERE id NOT IN (SELECT MIN(id) FROM fee_structures GROUP BY class_id)`);

    // 1. Authenticate Super Admin
    const adminLoginRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin', password: 'AdminPassword123!' })
    });
    const adminLogin = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
    const adminToken = adminLogin.token;
    console.log('  ✓ Admin authenticated successfully');

    // 2. Authenticate Parent (mobile: 9876543210 -> Aarav Sharma [id 1] & Ananya Sharma [id 2])
    const parentLoginRes = await fetch(`${BASE}/auth/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' })
    });
    const parentLogin = await parentLoginRes.json();
    assert.strictEqual(parentLoginRes.status, 200, 'Parent login failed');
    const parentToken = parentLogin.token;
    assert.ok(parentLogin.students.length >= 2, 'Expected multi-child account with at least 2 children');
    console.log(`  ✓ Parent authenticated with ${parentLogin.students.length} linked children (Multi-child verified)`);

    // ------------------------------------------------------------------------
    // TEST 1: CRITICAL PERMISSION RULE: Super Admin MUST NOT BE ABLE TO PAY FEES
    // ------------------------------------------------------------------------
    const adminPayAttempt = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 5000,
        paymentMode: 'ONLINE_UPI'
      })
    });
    const adminPayData = await adminPayAttempt.json();
    assert.strictEqual(adminPayAttempt.status, 403, 'Super Admin fee payment MUST be rejected with 403 Forbidden');
    assert.strictEqual(adminPayData.success, false);
    assert.ok(adminPayData.error.includes('unauthorized to make fee payments'), 'Expected error message regarding Super Admin unauthorized to make fee payments');
    console.log('  ✓ Test 1 Passed: Super Admin payment attempt blocked with 403 Forbidden (Critical Permission Rule Enforced)');

    // ------------------------------------------------------------------------
    // TEST 2: Parent checks child fee details (Aarav Sharma, class 3 -> total ₹54,000)
    // ------------------------------------------------------------------------
    const feeRes = await fetch(`${BASE}/fees?studentId=1`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const feeData = await feeRes.json();
    assert.strictEqual(feeRes.status, 200);
    assert.strictEqual(feeData.summary.paidAmount, 0);
    assert.strictEqual(feeData.summary.pendingAmount, 54000);
    assert.strictEqual(feeData.summary.minSplitPayment, 16200); // 30% of 54,000 = 16,200
    console.log('  ✓ Test 2 Passed: Dynamic fee summary fetched for Aarav (Outstanding: ₹54,000, Min Split 30%: ₹16,200)');

    // ------------------------------------------------------------------------
    // SPLIT PAYMENT SPECIFICATION TESTS (Cases 1 - 6)
    // Let's create a known baseline for student 1: Total fee = 10,000
    // We update class fee structure or insert a custom test student/structure
    // ------------------------------------------------------------------------
    // For exact case matching:
    // Case 1: Outstanding = ₹10,000, Payment = ₹2,999 -> REJECT (<30%)
    // Let's test on student 1 with simulated pending balance
    // ------------------------------------------------------------------------

    // First: Record initial payment so outstanding is exactly ₹10,000
    // Total is 54,000. So pay 44,000 (which is > 30% of 54,000) to leave exactly ₹10,000 outstanding!
    const initPay = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 44000,
        paymentType: 'SPLIT',
        paymentMode: 'ONLINE_UPI'
      })
    });
    const initPayData = await initPay.json();
    assert.strictEqual(initPay.status, 201, 'Initial split payment to set ₹10,000 balance');
    assert.strictEqual(initPayData.payment.pendingAmount, 10000, 'Outstanding should now be exactly ₹10,000');
    console.log('  ✓ Prepared baseline: Aarav outstanding balance = ₹10,000');

    // CASE 1: Outstanding = ₹10,000, Payment = ₹2,999 -> REJECT
    const case1Res = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 2999,
        paymentType: 'SPLIT',
        paymentMode: 'ONLINE_UPI'
      })
    });
    const case1Data = await case1Res.json();
    assert.strictEqual(case1Res.status, 400, 'Case 1 (<30%) must be rejected with 400');
    assert.strictEqual(case1Data.success, false);
    assert.strictEqual(case1Data.error, 'Minimum split payment is 30% of the outstanding fee.');
    assert.strictEqual(case1Data.minSplitAmount, 3000);
    console.log('  ✓ Test Case 1 Passed: Payment ₹2,999 on ₹10,000 outstanding REJECTED (Exact message: "Minimum split payment is 30% of the outstanding fee.")');

    // CASE 5: Outstanding = ₹10,000, Payment = ₹10,001 -> REJECT (> Outstanding)
    const case5Res = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 10001,
        paymentType: 'FULL',
        paymentMode: 'ONLINE_UPI'
      })
    });
    const case5Data = await case5Res.json();
    assert.strictEqual(case5Res.status, 400, 'Case 5 (>outstanding) must be rejected with 400');
    assert.strictEqual(case5Data.success, false);
    assert.ok(case5Data.error.includes('cannot exceed outstanding fee balance'));
    console.log('  ✓ Test Case 5 Passed: Payment ₹10,001 on ₹10,000 outstanding REJECTED (Cannot exceed outstanding)');

    // CASE 2: Outstanding = ₹10,000, Payment = ₹3,000 -> ALLOW (30% exactly)
    // To leave ₹6,000 for Case 6, let's test Case 2 on Student 2 (Ananya) or test progression!
    // If on student 1: pay 4,000 (ALLOW) -> outstanding becomes ₹6,000!
    // Let's test Case 2 (Pay ₹3,000 on ₹10,000 -> leaves ₹7,000):
    // Wait, requirement says:
    // Total fee = ₹10,000, Already paid = ₹4,000, Outstanding = ₹6,000, Minimum next split = ₹1,800.
    // Let's test Case 3: pay ₹4,000 on ₹10,000 -> leaves outstanding = ₹6,000!
    const case3Res = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 4000,
        paymentType: 'SPLIT',
        paymentMode: 'ONLINE_UPI'
      })
    });
    const case3Data = await case3Res.json();
    assert.strictEqual(case3Res.status, 201, 'Payment ₹4,000 (>=30%) must be accepted');
    assert.strictEqual(case3Data.payment.pendingAmount, 6000, 'New outstanding must be exactly ₹6,000');
    console.log('  ✓ Test Case 3 Passed: Payment ₹4,000 on ₹10,000 outstanding ALLOWED (New outstanding: ₹6,000)');

    // CASE 6: Dynamic calculation on Outstanding = ₹6,000
    // Minimum next split payment = 30% of 6,000 = ₹1,800!
    // Trying to pay ₹1,799 -> MUST REJECT
    const case6Reject = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 1799,
        paymentType: 'SPLIT',
        paymentMode: 'ONLINE_UPI'
      })
    });
    const case6RejectData = await case6Reject.json();
    assert.strictEqual(case6Reject.status, 400);
    assert.strictEqual(case6RejectData.error, 'Minimum split payment is 30% of the outstanding fee.');
    assert.strictEqual(case6RejectData.minSplitAmount, 1800);
    console.log('  ✓ Test Case 6a Passed: Payment ₹1,799 on ₹6,000 outstanding REJECTED (Min required: ₹1,800)');

    // Pay ₹1,800 on ₹6,000 -> MUST ALLOW
    const case6Allow = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 1800,
        paymentType: 'SPLIT',
        paymentMode: 'ONLINE_UPI'
      })
    });
    const case6AllowData = await case6Allow.json();
    assert.strictEqual(case6Allow.status, 201);
    assert.strictEqual(case6AllowData.payment.pendingAmount, 4200);
    console.log('  ✓ Test Case 6b Passed: Dynamic 30% calculation verified! Payment ₹1,800 ALLOWED (New outstanding: ₹4,200)');

    // CASE 4: Full Payment remaining (Pay ₹4,200 on ₹4,200) -> ALLOW FULL PAYMENT
    const case4Res = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 4200,
        paymentType: 'FULL',
        paymentMode: 'ONLINE_UPI'
      })
    });
    const case4Data = await case4Res.json();
    assert.strictEqual(case4Res.status, 201);
    assert.strictEqual(case4Data.payment.pendingAmount, 0);
    assert.strictEqual(case4Data.payment.paymentType, 'FULL');
    assert.ok(case4Data.payment.receiptNo.startsWith('REC-'));
    console.log('  ✓ Test Case 4 Passed: Full payment ₹4,200 settled with receipt ' + case4Data.payment.receiptNo);

    // ------------------------------------------------------------------------
    // TEST 3: Multi-Child Isolation: Parent trying to pay for someone else's child
    // Student 3 (Rohan Menon) is NOT Rajesh Sharma's child!
    // ------------------------------------------------------------------------
    const unauthorizedPay = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 3,
        amount: 5000,
        paymentType: 'SPLIT'
      })
    });
    const unauthorizedPayData = await unauthorizedPay.json();
    assert.strictEqual(unauthorizedPay.status, 403, 'Paying for unlinked child must return 403');
    assert.ok(unauthorizedPayData.error.includes('only initiate fee payments for your own registered children'));
    console.log('  ✓ Test 3 Passed: Parent unauthorized fee payment for other student blocked with 403 Forbidden');

    // ------------------------------------------------------------------------
    // TEST 4: Super Admin Fee Dashboard & Filters
    // ------------------------------------------------------------------------
    const adminFeesRes = await fetch(`${BASE}/fees`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminFeesData = await adminFeesRes.json();
    assert.strictEqual(adminFeesRes.status, 200);
    assert.ok(adminFeesData.overview.totalFees > 0);
    assert.ok(adminFeesData.overview.totalCollected > 0);
    assert.ok(adminFeesData.overview.paidStudents >= 1);
    assert.ok(adminFeesData.students.length > 0);
    console.log(`  ✓ Test 4 Passed: Super Admin Fee Dashboard returned ${adminFeesData.overview.totalStudents} students (Collected: ₹${adminFeesData.overview.totalCollected}, Paid: ${adminFeesData.overview.paidStudents})`);

    // Test filter by status=UNPAID
    const unpaidFilterRes = await fetch(`${BASE}/fees?status=UNPAID`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const unpaidData = await unpaidFilterRes.json();
    assert.strictEqual(unpaidFilterRes.status, 200);
    assert.ok(unpaidData.students.every(s => s.status === 'UNPAID'));
    console.log(`  ✓ Test 4b Passed: Super Admin fee filter (status=UNPAID) returned ${unpaidData.students.length} unpaid students`);

    // ------------------------------------------------------------------------
    // TEST 5: Super Admin Fee Reminder (Individual & Bulk)
    // ------------------------------------------------------------------------
    // Unpaid reminder for student 3 (Rohan Menon)
    const reminderRes = await fetch(`${BASE}/fees/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ studentId: 3 })
    });
    const reminderData = await reminderRes.json();
    assert.strictEqual(reminderRes.status, 200);
    assert.strictEqual(reminderData.success, true);
    assert.strictEqual(reminderData.sentCount, 1);
    assert.ok(reminderData.dispatched[0].message.includes('Fee Payment Reminder'));
    console.log('  ✓ Test 5 Passed: Super Admin fee reminder dispatched (Message: "' + reminderData.dispatched[0].message.substring(0, 50) + '...")');

    // Bulk reminder for all unpaid
    const bulkReminderRes = await fetch(`${BASE}/fees/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ filter: 'UNPAID' })
    });
    const bulkData = await bulkReminderRes.json();
    assert.strictEqual(bulkReminderRes.status, 200);
    assert.ok(bulkData.sentCount >= 1);
    console.log(`  ✓ Test 5b Passed: Bulk reminder dispatched to ${bulkData.sentCount} unpaid parents`);

    // ------------------------------------------------------------------------
    // TEST 6: Super Admin Bus Management (Add Bus, Edit Bus, Assign)
    // ------------------------------------------------------------------------
    db.run(`DELETE FROM buses WHERE bus_number = 'Bus #09' OR vehicle_no = 'TN-43-C-9909'`);

    const newBusRes = await fetch(`${BASE}/transport/bus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        busNumber: 'Bus #09',
        vehicleNo: 'TN-43-C-9909',
        model: 'Force Traveller School Special (24-Seater)',
        capacity: 24,
        status: 'ACTIVE',
        driverId: 1,
        routeId: 1
      })
    });
    const newBusData = await newBusRes.json();
    assert.strictEqual(newBusRes.status, 201);
    const addedBusId = newBusData.bus.id;
    console.log(`  ✓ Test 6 Passed: Super Admin added new bus ${newBusData.bus.busNumber} (ID: ${addedBusId})`);

    // Edit Bus
    const editBusRes = await fetch(`${BASE}/transport/bus/${addedBusId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        capacity: 28,
        status: 'ACTIVE'
      })
    });
    assert.strictEqual(editBusRes.status, 200);
    console.log('  ✓ Test 6b Passed: Super Admin edited bus capacity to 28');

    // ------------------------------------------------------------------------
    // TEST 7: Demo Live Tracking Controller (Start, Step, Stop)
    // ------------------------------------------------------------------------
    const startDemoRes = await fetch(`${BASE}/transport/demo-tracking/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        busId: 1,
        routeId: 1,
        speedMultiplier: 2
      })
    });
    const startDemoData = await startDemoRes.json();
    assert.strictEqual(startDemoRes.status, 200);
    assert.strictEqual(startDemoData.mode, 'DEMO');
    console.log('  ✓ Test 7 Passed: Super Admin started Demo Tracking on Bus 1 (Route 02)');

    // Step simulation
    const stepDemoRes = await fetch(`${BASE}/transport/demo-tracking/step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ busId: 1 })
    });
    const stepDemoData = await stepDemoRes.json();
    assert.strictEqual(stepDemoRes.status, 200);
    assert.ok(stepDemoData.state.latitude > 11.0);
    assert.ok(stepDemoData.state.longitude > 76.0);
    console.log(`  ✓ Test 7b Passed: Demo bus stepped smoothly along route waypoints (Lat: ${stepDemoData.state.latitude}, Lng: ${stepDemoData.state.longitude}, Next: ${stepDemoData.state.next_stop_name})`);

    // ------------------------------------------------------------------------
    // TEST 8: Parent Live Bus Tracking & Strict Security Isolation
    // ------------------------------------------------------------------------
    // Parent 1 queries assigned bus for Aarav (assigned to Bus 1)
    const parentBusRes = await fetch(`${BASE}/transport/my-bus?studentId=1`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentBusData = await parentBusRes.json();
    assert.strictEqual(parentBusRes.status, 200);
    assert.strictEqual(parentBusData.hasAssignment, true);
    assert.strictEqual(parentBusData.tracking.busId, 1);
    assert.strictEqual(parentBusData.tracking.trackingMode, 'DEMO');
    assert.strictEqual(parentBusData.tracking.trackingModeLabel, 'Demo Tracking');
    assert.strictEqual(parentBusData.tracking.isDemoActive, true);
    assert.ok(parentBusData.tracking.routeStops.length >= 4);
    console.log(`  ✓ Test 8 Passed: Parent viewed child's moving demo bus (Bus: ${parentBusData.tracking.busNumber}, Mode: ${parentBusData.tracking.trackingModeLabel}, Stops: ${parentBusData.tracking.routeStops.length})`);

    // Parent 1 attempts to track unassigned bus (e.g. addedBusId)
    const unauthorizedBusRes = await fetch(`${BASE}/transport/bus/${addedBusId}/tracking`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const unauthorizedBusData = await unauthorizedBusRes.json();
    assert.strictEqual(unauthorizedBusRes.status, 403, 'Parent unauthorized bus tracking MUST be blocked with 403');
    assert.ok(unauthorizedBusData.error.includes('unauthorized to view tracking for a bus not assigned to your registered child'));
    console.log('  ✓ Test 8b Passed: Parent attempt to track unassigned bus blocked with 403 Forbidden (Parent Bus Security Enforced)');

    // Stop Demo tracking
    const stopDemoRes = await fetch(`${BASE}/transport/demo-tracking/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ busId: 1 })
    });
    assert.strictEqual(stopDemoRes.status, 200);
    console.log('  ✓ Test 8c Passed: Super Admin stopped Demo Tracking');

    console.log('\n🎉 ALL FEES, SPLIT PAYMENT, SUPER ADMIN PERMISSION & BUS TRACKING QA TESTS PASSED WITH 100% SUCCESS!\n');

  } catch (err) {
    console.error('❌ QA Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runSplitPaymentAndBusTests();
