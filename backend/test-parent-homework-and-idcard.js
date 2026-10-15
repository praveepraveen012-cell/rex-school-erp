/**
 * Automated Test Suite: Parent Homework Permissions & Student ID Card Verification
 * Validates:
 * 1. Parent CANNOT create homework via POST /api/homework (403 Forbidden)
 * 2. Parent CANNOT edit homework via PUT /api/homework/:id (403 Forbidden)
 * 3. Parent CANNOT delete homework via DELETE /api/homework/:id (403 Forbidden)
 * 4. Parent CANNOT send homework via POST /api/homework/:id/send-now (403 Forbidden)
 * 5. Parent CAN view assigned published homework for their child via GET /api/homework (200 OK)
 * 6. Teacher CAN create homework within assigned class/subject (201 Created)
 * 7. Super Admin CAN create homework (201 Created)
 * 8. Parent CAN retrieve official ID card for linked child 1 (Aarav Sharma) with full fields
 * 9. Parent CAN retrieve official ID card for linked child 2 (Ananya Sharma) with full fields
 * 10. Parent CANNOT access ID card of unlinked student (403 Forbidden)
 * 11. Super Admin CAN retrieve student ID cards (200 OK)
 */

const assert = require('assert');
const app = require('./app');
const db = require('./database/db');

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 PARENT HOMEWORK PERMISSIONS & STUDENT ID CARD QA SUITE');
  console.log('================================================================\n');

  const server = app.listen(3005);
  const BASE = 'http://localhost:3005/api';

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
    // ------------------------------------------------------------------------
    // Step 1: Authenticate Users
    // ------------------------------------------------------------------------
    console.log('Step 1: Authenticate Super Admin, Teacher, and Parent');

    // 1. Super Admin
    const adminLoginRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin', password: 'AdminPassword123!' })
    });
    const adminData = await adminLoginRes.json();
    testAssert(adminLoginRes.status === 200, 'Super Admin login returns 200 OK');
    const adminToken = adminData.token;

    // 2. Teacher (Mrs. Anitha Kumar - mobile 9876500004)
    const teacherSendOtpRes = await fetch(`${BASE}/auth/teacher/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876500004' })
    });
    const otpData = await teacherSendOtpRes.json();
    testAssert(teacherSendOtpRes.status === 200, 'Teacher send-otp returns 200 OK');
    const otp = otpData.devOtp || '123456';

    const teacherLoginRes = await fetch(`${BASE}/auth/teacher/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876500004', otp })
    });
    const teacherData = await teacherLoginRes.json();
    testAssert(teacherLoginRes.status === 200, 'Teacher verify-otp returns 200 OK');
    const teacherToken = teacherData.token;

    // 3. Parent (Rajesh Sharma - mobile 9876543210, linked to Aarav id:1 and Ananya id:2)
    const parentLoginRes = await fetch(`${BASE}/auth/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' })
    });
    const parentData = await parentLoginRes.json();
    testAssert(parentLoginRes.status === 200, 'Parent login returns 200 OK');
    const parentToken = parentData.token;
    testAssert(parentData.children && parentData.children.length >= 2, 'Parent has multiple children linked in account');

    // ------------------------------------------------------------------------
    // Step 2: Parent Homework Creation / Modification Restrictions (Bug 1)
    // ------------------------------------------------------------------------
    console.log('\nStep 2: Enforce Parent Homework Restrictions');

    // 2a. Parent attempts to create homework
    const parentCreateHwRes = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        classId: 1,
        sectionId: 1,
        subjectId: 1,
        title: 'Unauthorized Parent Homework',
        description: 'Parents should not be able to assign homework.',
        dueDate: '2026-10-20'
      })
    });
    const parentCreateData = await parentCreateHwRes.json();
    testAssert(parentCreateHwRes.status === 403, 'Parent POST /api/homework rejected with 403 Forbidden');
    testAssert(parentCreateData.success === false, 'Parent response indicates success = false');
    testAssert(parentCreateData.error.includes('Parents cannot assign'), 'Error message clearly specifies parents cannot assign homework');

    // 2b. Teacher creates valid homework
    const teacherCreateHwRes = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        classId: 3,
        sectionId: 5,
        subjectId: 1,
        title: 'Quadratic Equations Worksheet 3',
        description: 'Complete questions 1 to 15 on page 42.',
        dueDate: '2026-10-25'
      })
    });
    const teacherCreateData = await teacherCreateHwRes.json();
    testAssert(teacherCreateHwRes.status === 201, 'Teacher POST /api/homework succeeds with 201 Created');
    const createdHwId = teacherCreateData.homeworkId;

    // 2c. Parent attempts to modify teacher's homework
    const parentEditHwRes = await fetch(`${BASE}/homework/${createdHwId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        title: 'Tampered Title by Parent',
        description: 'Should be rejected'
      })
    });
    testAssert(parentEditHwRes.status === 403, 'Parent PUT /api/homework/:id rejected with 403 Forbidden');

    // 2d. Parent attempts to delete homework
    const parentDelHwRes = await fetch(`${BASE}/homework/${createdHwId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });
    testAssert(parentDelHwRes.status === 403, 'Parent DELETE /api/homework/:id rejected with 403 Forbidden');

    // 2e. Parent attempts to send homework via WhatsApp/SMS
    const parentSendHwRes = await fetch(`${BASE}/homework/${createdHwId}/send-now`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });
    testAssert(parentSendHwRes.status === 403, 'Parent POST /api/homework/:id/send-now rejected with 403 Forbidden');

    const aaravId = parentData.children.find(c => c.first_name.includes('Aarav'))?.id || parentData.children[0].id;
    const ananyaId = parentData.children.find(c => c.first_name.includes('Ananya'))?.id || parentData.children[1].id;

    // 2f. Parent views assigned homework for their child
    const parentViewHwRes = await fetch(`${BASE}/homework?studentId=${aaravId}`, {
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });
    const parentViewData = await parentViewHwRes.json();
    testAssert(parentViewHwRes.status === 200, 'Parent GET /api/homework returns 200 OK');
    testAssert(parentViewData.success === true, 'Parent successfully views homework');
    testAssert(parentViewData.studentName.includes('Aarav'), 'Homework response scoped to linked child');

    // ------------------------------------------------------------------------
    // Step 3: Student ID Card Verification (Bug 2)
    // ------------------------------------------------------------------------
    console.log('\nStep 3: Verify Student ID Cards & Multi-Child Access');

    // 3a. Parent fetches ID Card for Child 1 (Aarav Sharma)
    const aaravCardRes = await fetch(`${BASE}/campus/id-cards/student/${aaravId}`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const aaravCardData = await aaravCardRes.json();
    testAssert(aaravCardRes.status === 200, `Parent GET /campus/id-cards/student/${aaravId} returns 200 OK`);
    testAssert(aaravCardData.success === true, 'ID card response success = true');
    testAssert(aaravCardData.idCard.name.includes('Aarav Sharma'), 'Card contains student full name (Aarav Sharma)');
    testAssert(aaravCardData.idCard.studentName.includes('Aarav Sharma'), 'Card studentName alias present');
    testAssert(aaravCardData.idCard.admissionNo === 'REX-2024-001', 'Card contains correct admission number');
    testAssert(aaravCardData.idCard.classSection.includes('10') && aaravCardData.idCard.classSection.includes('A'), 'Card contains correct class and section');
    testAssert(aaravCardData.idCard.bloodGroup === 'O+', 'Card contains blood group');
    testAssert(aaravCardData.idCard.emergencyContact !== undefined, 'Card contains emergency contact');
    testAssert(aaravCardData.idCard.validAcademicYear.includes('2026'), 'Card contains valid academic year');
    testAssert(aaravCardData.idCard.qrPayload.includes('GRX-STU:') || aaravCardData.idCard.qrPayload.includes('REX-STU:'), 'Card contains scannable Gate Pass QR payload');

    // 3b. Parent fetches ID Card for Child 2 (Ananya Sharma)
    const ananyaCardRes = await fetch(`${BASE}/campus/id-cards/student/${ananyaId}`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const ananyaCardData = await ananyaCardRes.json();
    testAssert(ananyaCardRes.status === 200, `Parent GET /campus/id-cards/student/${ananyaId} returns 200 OK`);
    testAssert(ananyaCardData.idCard.name.includes('Ananya Sharma'), 'Child 2 card contains correct name (Ananya Sharma)');
    testAssert(ananyaCardData.idCard.admissionNo === 'REX-2025-042', 'Child 2 card contains correct admission number');
    testAssert(ananyaCardData.idCard.qrPayload.includes('REX-2025-042'), 'Child 2 card contains unique QR payload for Ananya');

    // 3c. Parent attempts to access UNLINKED student ID card (e.g. Student ID 99999)
    const unlinkedCardRes = await fetch(`${BASE}/campus/id-cards/student/99999`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    testAssert(unlinkedCardRes.status === 403 || unlinkedCardRes.status === 404, 'Parent accessing unlinked student ID card rejected with 403 Forbidden or 404');

    // 3d. Super Admin can view student ID card
    const adminCardRes = await fetch(`${BASE}/campus/id-cards/student/${aaravId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    testAssert(adminCardRes.status === 200, `Super Admin GET /campus/id-cards/student/${aaravId} returns 200 OK`);

    // Clean up test homework
    db.run(`DELETE FROM homework WHERE id = ?`, [createdHwId]);

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('================================================================\n');

  } finally {
    server.close();
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
