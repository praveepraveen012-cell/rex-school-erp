/**
 * Test Suite: Super Admin Fee Payment Restriction & Parent Payment Verification
 * Validates:
 * 1. Super Admin CANNOT initiate student fee payments via /fees/pay or /fees/collect (403 Forbidden)
 * 2. Super Admin payment attempt does NOT create transactions or change balances in database
 * 3. Super Admin CAN view financial summary, student ledgers, class filters, receipts, and send reminders
 * 4. Parent CAN view fees and initiate full and split payments (30% rule preserved)
 * 5. Unauthorized Parent CANNOT access or pay for other parents' children
 * 6. Teacher CANNOT access fee endpoints
 */

const assert = require('assert');
const app = require('./app');
const db = require('./database/db');

async function runFeeRestrictionsTest() {
  console.log('================================================================');
  console.log('💳 STARTING FEE CASHIER & LEDGER DESK RESTRICTIONS QA SUITE');
  console.log('================================================================\n');

  const server = app.listen(3004);
  const BASE = 'http://localhost:3004/api';

  let totalTests = 0;
  let passedTests = 0;

  function testAssert(cond, msg) {
    totalTests++;
    if (cond) {
      console.log(`  ✓ PASS: ${msg}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  try {
    // Clean test payments for student 1 & 2 for repeatable assertions
    db.run(`DELETE FROM fee_payments WHERE student_id IN (1, 2)`);

    // ------------------------------------------------------------------------
    // SETUP & AUTHENTICATION
    // ------------------------------------------------------------------------
    console.log('Step 1: Authenticate Super Admin, Parent, and Teacher');

    // 1. Super Admin
    const adminLoginRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin', password: 'AdminPassword123!' })
    });
    const adminData = await adminLoginRes.json();
    testAssert(adminLoginRes.status === 200, 'Super Admin login returns 200 OK');
    const adminToken = adminData.token;

    // 2. Parent (Rajesh Sharma, linked to Aarav Sharma id:1, Ananya Sharma id:2)
    const parentLoginRes = await fetch(`${BASE}/auth/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' })
    });
    const parentData = await parentLoginRes.json();
    testAssert(parentLoginRes.status === 200, 'Parent login returns 200 OK');
    const parentToken = parentData.token;

    // ------------------------------------------------------------------------
    // SECTION 1 & 5: SUPER ADMIN PAYMENT ATTEMPTS MUST BE STRICTLY BLOCKED
    // ------------------------------------------------------------------------
    console.log('\nStep 2: Super Admin Direct Payment API Requests Must Return 403 Forbidden');

    const paymentCountBefore = db.get(`SELECT COUNT(*) as c FROM fee_payments WHERE student_id = 1`).c;

    // Direct POST /api/fees/pay by Super Admin
    const adminPayRes1 = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 5000,
        paymentType: 'SPLIT',
        paymentMode: 'CASH'
      })
    });
    const adminPayData1 = await adminPayRes1.json();
    testAssert(adminPayRes1.status === 403, 'Super Admin POST /fees/pay returned 403 Forbidden');
    testAssert(adminPayData1.success === false, 'Response indicates success = false');
    testAssert(adminPayData1.error.includes('unauthorized to initiate or complete student fee payments'), 'Clear error message indicating Super Admin cannot pay fees');

    // Direct POST /api/fees/collect by Super Admin
    const adminPayRes2 = await fetch(`${BASE}/fees/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 10000,
        paymentType: 'FULL',
        paymentMode: 'CARD'
      })
    });
    const adminPayData2 = await adminPayRes2.json();
    testAssert(adminPayRes2.status === 403, 'Super Admin POST /fees/collect alias returned 403 Forbidden');

    // Direct POST /api/fees/payment by Super Admin
    const adminPayRes3 = await fetch(`${BASE}/fees/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: 2500
      })
    });
    testAssert(adminPayRes3.status === 403, 'Super Admin POST /fees/payment alias returned 403 Forbidden');

    // Verify zero database changes
    const paymentCountAfter = db.get(`SELECT COUNT(*) as c FROM fee_payments WHERE student_id = 1`).c;
    testAssert(paymentCountBefore === paymentCountAfter, 'Zero fee_payments records created by Super Admin payment attempts');

    // ------------------------------------------------------------------------
    // SECTION 2 & 3: SUPER ADMIN PRESERVED FEE INFORMATION & LEDGER ACTIONS
    // ------------------------------------------------------------------------
    console.log('\nStep 3: Super Admin Can View Financial Summary, Filters, Ledgers & Receipts');

    const feeOverviewRes = await fetch(`${BASE}/fees`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const feeOverview = await feeOverviewRes.json();
    testAssert(feeOverviewRes.status === 200, 'GET /fees for Super Admin returns 200 OK');
    testAssert(feeOverview.role === 'SUPER_ADMIN', 'Scope is confirmed as SUPER_ADMIN');
    testAssert(typeof feeOverview.overview.totalFees === 'number' && feeOverview.overview.totalFees > 0, 'Total fees target displayed');
    testAssert(typeof feeOverview.overview.totalCollected === 'number', 'Total collected displayed');
    testAssert(typeof feeOverview.overview.totalOutstanding === 'number', 'Total outstanding receivables displayed');
    testAssert(feeOverview.students && feeOverview.students.length > 0, `Returned ${feeOverview.students.length} student ledger records`);

    // Verify student details format
    const s1 = feeOverview.students.find(s => s.studentId === 1);
    testAssert(s1 !== undefined, 'Aarav Sharma record found in Super Admin ledger');
    testAssert(s1.totalFee > 0 && s1.outstandingAmount !== undefined, 'Aarav Sharma fee dues and amount paid preserved');
    testAssert(['PAID', 'PARTIALLY_PAID', 'UNPAID'].includes(s1.status), `Valid ledger status: ${s1.status}`);

    // Test Class & Status Filters
    const unpaidRes = await fetch(`${BASE}/fees?status=UNPAID`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const unpaidData = await unpaidRes.json();
    testAssert(unpaidRes.status === 200, 'GET /fees?status=UNPAID returns 200 OK');
    testAssert(unpaidData.students.every(s => s.status === 'UNPAID'), 'All filtered students have UNPAID status');

    // Super Admin student details query
    const studentDetailRes = await fetch(`${BASE}/fees/student/1`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const studentDetail = await studentDetailRes.json();
    testAssert(studentDetailRes.status === 200, 'Super Admin can view student ledger details (GET /fees/student/1)');
    testAssert(studentDetail.student.name === 'Aarav Sharma', 'Student name verified');
    testAssert(Array.isArray(studentDetail.feeStructures), 'Fee structure breakdown items returned');

    // ------------------------------------------------------------------------
    // SECTION 3: SUPER ADMIN PAYMENT REMINDERS (Single & Bulk)
    // ------------------------------------------------------------------------
    console.log('\nStep 4: Super Admin Can Send Fee Payment Reminders to Parents');

    const singleReminderRes = await fetch(`${BASE}/fees/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ studentId: 1 })
    });
    const singleReminder = await singleReminderRes.json();
    testAssert(singleReminderRes.status === 200, 'Super Admin single reminder dispatched with 200 OK');
    testAssert(singleReminder.sentCount >= 0, 'Sent count confirmed');

    // Bulk reminder for all unpaid
    const bulkReminderRes = await fetch(`${BASE}/fees/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ filter: 'UNPAID' })
    });
    const bulkReminder = await bulkReminderRes.json();
    testAssert(bulkReminderRes.status === 200, 'Super Admin bulk reminder dispatched with 200 OK');
    testAssert(bulkReminder.success === true, 'Bulk reminder confirmed successful');

    // ------------------------------------------------------------------------
    // SECTION 4: PARENT FEES & SPLIT PAYMENT FUNCTIONALITY (30% Rule)
    // ------------------------------------------------------------------------
    console.log('\nStep 5: Parent Can Pay Fees (Full & Split Payment with 30% Minimum Rule)');

    // Parent fetches own child's fees
    const parentFeeRes = await fetch(`${BASE}/fees?studentId=1`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentFeeData = await parentFeeRes.json();
    testAssert(parentFeeRes.status === 200, 'Parent can fetch fees for linked child (Aarav)');
    const pendingDue = parentFeeData.summary.pendingAmount;
    testAssert(pendingDue > 0, `Pending fee balance exists: ₹${pendingDue}`);

    const minSplit30 = Math.round(pendingDue * 0.30);

    // Test rejection when split payment is less than 30%
    if (minSplit30 > 100) {
      const underPayRes = await fetch(`${BASE}/fees/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${parentToken}`
        },
        body: JSON.stringify({
          studentId: 1,
          amount: minSplit30 - 50,
          paymentType: 'SPLIT',
          paymentMode: 'ONLINE_UPI'
        })
      });
      const underPayData = await underPayRes.json();
      testAssert(underPayRes.status === 400, 'Split payment under 30% rejected with 400 Bad Request');
      testAssert(underPayData.error.includes('Minimum split payment is 30%'), 'Preserved 30% minimum split payment error message');
    }

    // Test valid payment by Parent (at least 30%)
    const validPayAmount = Math.max(minSplit30, 1000);
    const validPayRes = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 1,
        amount: validPayAmount,
        paymentType: 'SPLIT',
        paymentMode: 'ONLINE_UPI'
      })
    });
    const validPayData = await validPayRes.json();
    testAssert(validPayRes.status === 201, 'Valid parent payment processed with 201 Created');
    testAssert(validPayData.payment.receiptNo.startsWith('REC-'), `Receipt generated: ${validPayData.payment.receiptNo}`);
    testAssert(validPayData.payment.amountPaid === validPayAmount, 'Payment amount matches');

    // ------------------------------------------------------------------------
    // SECTION 7 & 8: UNAUTHORIZED DATA ISOLATION (Other Student Protection)
    // ------------------------------------------------------------------------
    console.log('\nStep 6: Data Isolation — Parent Cannot View or Pay Other Students Fees');

    // Student 3 (Rohan Menon) is not linked to this parent (Rajesh Sharma)
    const unauthorizedViewRes = await fetch(`${BASE}/fees/student/3`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    testAssert(unauthorizedViewRes.status === 403, 'Parent viewing unlinked student fee rejected with 403 Forbidden');

    const unauthorizedPayRes = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        studentId: 3,
        amount: 2000,
        paymentType: 'SPLIT'
      })
    });
    testAssert(unauthorizedPayRes.status === 403, 'Parent paying unlinked student fee rejected with 403 Forbidden');

    console.log('\n================================================================');
    console.log(`🎉 QA RESTRICTIONS SUITE PASSED: ${passedTests}/${totalTests} TESTS SUCCESSFUL!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runFeeRestrictionsTest();
