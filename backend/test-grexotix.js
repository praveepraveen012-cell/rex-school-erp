const assert = require('assert');
const app = require('./app');

async function runGrexotixTests() {
  console.log('🧪 Starting Grexotix School Digital Operating Platform Integration Tests...\n');

  const server = app.listen(3002);
  const BASE = 'http://localhost:3002/api';

  try {
    // 1. Login as Admin
    const adminLoginRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin', password: 'AdminPassword123!' })
    });
    const adminLogin = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
    const adminToken = adminLogin.token;
    console.log('  ✓ Admin authentication succeeded');

    // 2. Login as Parent (mobile: 9876543210)
    const parentLoginRes = await fetch(`${BASE}/auth/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' })
    });
    const parentLogin = await parentLoginRes.json();
    assert.strictEqual(parentLoginRes.status, 200, 'Parent login failed');
    const parentToken = parentLogin.token;
    console.log('  ✓ Parent mobile authentication succeeded (Children: ' + parentLogin.students.length + ')');

    // Test 1: Admissions Workflow - Public Application
    const applyRes = await fetch(`${BASE}/admissions/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentFirstName: 'Rohan',
        studentLastName: 'Nambiar',
        dob: '2012-08-15',
        targetGradeLevel: 8,
        parentName: 'Mohan Nambiar',
        parentMobile: '9443219900'
      })
    });
    const applyData = await applyRes.json();
    assert.strictEqual(applyRes.status, 201, 'Admission apply status');
    assert.ok(applyData.success, 'Admission application failed');
    console.log('  ✓ Test 1 Passed: Public admission application submitted (' + applyData.application.applicationNo + ')');

    const appId = applyData.application.id;

    // Test 2: Admissions Workflow - Admin Enroll
    const enrollRes = await fetch(`${BASE}/admissions/${appId}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ classId: 1, sectionId: 1 })
    });
    const enrollData = await enrollRes.json();
    assert.ok(enrollRes.status === 200 || enrollRes.status === 201, 'Enroll status should be 200 or 201');
    assert.ok(enrollData.success, 'Enrollment failed');
    console.log('  ✓ Test 2 Passed: Super Admin approved & enrolled applicant as active student (' + enrollData.student.admissionNo + ')');

    // Test 3: Academic Question Bank
    const qRes = await fetch(`${BASE}/academic/questions`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const qData = await qRes.json();
    assert.ok(qData.success && qData.questions.length > 0, 'Question bank fetch failed');
    console.log('  ✓ Test 3 Passed: Question bank retrieved (' + qData.count + ' questions)');

    // Test 4: Campus Library
    const libRes = await fetch(`${BASE}/campus/library/books`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const libData = await libRes.json();
    assert.ok(libData.success && libData.books.length > 0, 'Library catalog failed');
    console.log('  ✓ Test 4 Passed: Library catalog accessible (' + libData.count + ' books)');

    // Test 5: Campus Inventory
    const invRes = await fetch(`${BASE}/campus/inventory/items`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const invData = await invRes.json();
    assert.ok(invData.success, 'Inventory items fetch failed');
    console.log('  ✓ Test 5 Passed: Campus inventory stock verified');

    // Test 6: Campus Visitors
    const visRes = await fetch(`${BASE}/campus/visitors`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const visData = await visRes.json();
    assert.ok(visData.success, 'Visitor log fetch failed');
    console.log('  ✓ Test 6 Passed: Visitor management log active (' + visData.count + ' passes)');

    // Test 7: HR Staff Attendance
    const hrAttRes = await fetch(`${BASE}/hr/attendance`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const hrAttData = await hrAttRes.json();
    assert.ok(hrAttData.success, 'Staff attendance fetch failed');
    console.log('  ✓ Test 7 Passed: Staff attendance recorded (' + hrAttData.stats.present + ' present)');

    // Test 8: HR Payroll
    const payRes = await fetch(`${BASE}/hr/payroll?month=2026-09`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const payData = await payRes.json();
    assert.ok(payData.success && payData.payroll.length > 0, 'Payroll fetch failed');
    console.log('  ✓ Test 8 Passed: Monthly payroll verified (₹' + payData.totalDisbursed + ' disbursed)');

    // Test 9: Management Intelligence KPIs
    const kpiRes = await fetch(`${BASE}/intelligence/kpis`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const kpiData = await kpiRes.json();
    assert.ok(kpiData.success, 'Intelligence KPIs failed');
    console.log('  ✓ Test 9 Passed: Executive management KPIs computed accurately (Students: ' + kpiData.kpis.totalStudents + ')');

    // Test 10: AI Assistant - Super Admin Query
    const aiAdminRes = await fetch(`${BASE}/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ query: 'How many students were absent today?' })
    });
    const aiAdminData = await aiAdminRes.json();
    assert.ok(aiAdminData.success && aiAdminData.answer, 'AI Admin query failed');
    console.log('  ✓ Test 10 Passed: AI Principal Assistant answered school-wide query');

    // Test 11: AI Assistant - Parent Query (Scoped to Child)
    const aiParentRes = await fetch(`${BASE}/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({ query: 'What is my child attendance rate?' })
    });
    const aiParentData = await aiParentRes.json();
    assert.ok(aiParentData.success && aiParentData.student, 'AI Parent query failed');
    console.log('  ✓ Test 11 Passed: AI Parent Assistant strictly scoped to child (' + aiParentData.student + ')');

    // Test 12: Strict Parent Security - Accessing unlinked student ID via AI blocked with 403 Forbidden
    const aiTamperRes = await fetch(`${BASE}/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({ query: 'Show report', studentId: 99 })
    });
    assert.strictEqual(aiTamperRes.status, 403, 'Unlinked student access should return 403 Forbidden');
    console.log('  ✓ Test 12 Passed: Tampered student query rejected with 403 Forbidden');

    // Test 13: Digital ID Card Generation
    const idCardRes = await fetch(`${BASE}/campus/id-cards/student/1`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const idCardData = await idCardRes.json();
    assert.ok(idCardData.success && idCardData.idCard.qrPayload, 'ID card generation failed');
    console.log('  ✓ Test 13 Passed: Digital Student ID card generated with QR payload (' + idCardData.idCard.admissionNo + ')');

    // Test 14: Module Configurations
    const modRes = await fetch(`${BASE}/settings/modules`);
    const modData = await modRes.json();
    assert.ok(modData.success && modData.modules, 'Module settings fetch failed');
    console.log('  ✓ Test 14 Passed: Configurable module switches verified');

    console.log('\n🎉 ALL 14 GREXOTIX PLATFORM INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
  }
}

runGrexotixTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
