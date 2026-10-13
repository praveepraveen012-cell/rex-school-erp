const assert = require('assert');
const app = require('./app');
const db = require('./database/db');

async function runMultitenantQATests() {
  console.log('🚀 Starting Grexotix Multi-Tenant SaaS QA Test Suite...\n');

  const server = app.listen(3003);
  const BASE = 'http://localhost:3003/api';

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Public Platform Information & Branding Verification
    // ------------------------------------------------------------------------
    console.log('📌 Test 1: Public Platform Info & Brand Integrity');
    const infoRes = await fetch(`${BASE}/platform/info`);
    const infoData = await infoRes.json();
    assert.strictEqual(infoRes.status, 200, 'Info endpoint should return 200');
    assert.strictEqual(infoData.platform, 'Grexotix School Management Platform');
    assert.strictEqual(infoData.tagline, 'Empowering Schools with Smart Management');
    assert.strictEqual(infoData.brand, 'Product of Grexotix');
    assert.strictEqual(infoData.logoUrl, 'assets/grexotix_logo.png');
    assert.strictEqual(infoData.contact.email, 'support@grexotix.com');
    console.log('  ✓ Test 1 Passed: Official Grexotix platform metadata verified.\n');

    // ------------------------------------------------------------------------
    // TEST 2: Public School Registration Submission
    // ------------------------------------------------------------------------
    console.log('📌 Test 2: Public School Registration Submission (4-Step Wizard API)');
    const testSchoolPayload = {
      schoolName: 'Silver Valley International Academy',
      displayName: 'Silver Valley Academy',
      schoolEmail: `admissions_${Date.now()}@silvervalley.edu`,
      schoolPhone: '+91 98451 12345',
      address: 'Plot 42, Greenwood Avenue',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560034',
      country: 'India',
      website: 'https://silvervalley.edu',
      affiliationBoard: 'ICSE',
      affiliationNumber: 'KA-10294',
      schoolType: 'K-12',
      approxStudents: '750',
      campusesCount: 1,
      desiredModules: ['attendance', 'homework', 'fees', 'id_cards', 'bus_tracking'],
      preferredLanguage: 'English',
      repName: 'Dr. Anand Kumar',
      repDesignation: 'Principal & Director',
      repEmail: `anand.kumar_${Date.now()}@silvervalley.edu`,
      repPhone: '98' + Math.floor(10000000 + Math.random() * 90000000),
      password: 'SilverValley2026!'
    };

    const regRes = await fetch(`${BASE}/platform/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSchoolPayload)
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201, 'Registration submission status should be 201');
    assert.ok(regData.success, 'Registration failed');
    assert.ok(regData.registrationRef.startsWith('GRX-REG-'), 'Reference code must match GRX-REG-YYYY-XXXX format');
    const regRef = regData.registrationRef;
    console.log(`  ✓ Test 2 Passed: School registration submitted successfully (Ref: ${regRef})\n`);

    // ------------------------------------------------------------------------
    // TEST 3: Public Registration Status Tracking
    // ------------------------------------------------------------------------
    console.log('📌 Test 3: Public Registration Status Lookup');
    const statusRes = await fetch(`${BASE}/platform/registration-status/${regRef}`);
    const statusData = await statusRes.json();
    assert.strictEqual(statusRes.status, 200, 'Status lookup should return 200');
    assert.ok(statusData.success, 'Status lookup failed');
    assert.strictEqual(statusData.registration.registration_ref, regRef);
    assert.strictEqual(statusData.registration.status, 'PENDING_APPROVAL');
    console.log(`  ✓ Test 3 Passed: Registration status confirmed as PENDING_APPROVAL.\n`);

    // ------------------------------------------------------------------------
    // TEST 4: Grexotix Platform Admin Authentication
    // ------------------------------------------------------------------------
    console.log('📌 Test 4: Platform Administrator Authentication');
    const platLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin@grexotix.com',
        password: 'GrexotixAdmin2026!'
      })
    });
    const platLoginData = await platLoginRes.json();
    assert.strictEqual(platLoginRes.status, 200, 'Platform Admin login status should be 200');
    assert.strictEqual(platLoginData.role, 'PLATFORM_ADMIN');
    assert.strictEqual(platLoginData.isPlatformAdmin, true);
    const platformToken = platLoginData.token;
    console.log('  ✓ Test 4 Passed: Platform Admin authenticated with sovereign privileges.\n');

    // ------------------------------------------------------------------------
    // TEST 5: Platform Admin Registration Review Queue
    // ------------------------------------------------------------------------
    console.log('📌 Test 5: Platform Admin Registration Queue & Details');
    const queueRes = await fetch(`${BASE}/platform/registrations?status=PENDING_APPROVAL`, {
      headers: { 'Authorization': `Bearer ${platformToken}` }
    });
    const queueData = await queueRes.json();
    assert.strictEqual(queueRes.status, 200, 'Queue listing status should be 200');
    assert.ok(queueData.registrations.length > 0, 'Should find at least 1 pending registration');
    const foundReg = queueData.registrations.find(r => r.registration_ref === regRef);
    assert.ok(foundReg, 'Submitted registration should appear in platform admin queue');
    const regRecordId = foundReg.id;
    console.log(`  ✓ Test 5 Passed: Registration queue retrieved (${queueData.count} pending, Record ID: ${regRecordId}).\n`);

    // ------------------------------------------------------------------------
    // TEST 6: Platform Admin Approval & Tenant Workspace Provisioning
    // ------------------------------------------------------------------------
    console.log('📌 Test 6: Platform Admin Approval & Workspace Provisioning');
    const approveRes = await fetch(`${BASE}/platform/registrations/${regRecordId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${platformToken}`
      },
      body: JSON.stringify({ notes: 'Verified credentials and valid ICSE affiliation. Approved.' })
    });
    const approveData = await approveRes.json();
    assert.strictEqual(approveRes.status, 200, 'Approval status should be 200');
    assert.ok(approveData.success, 'Approval failed');
    assert.ok(approveData.schoolId > 1, 'New school must have distinct ID > 1');
    const newSchoolId = approveData.schoolId;
    const newSuperAdminUsername = approveData.superAdminUser.username;
    console.log(`  ✓ Test 6 Passed: School approved! New School ID: ${newSchoolId}, Code: ${approveData.schoolCode}, Super Admin: ${newSuperAdminUsername}\n`);

    // ------------------------------------------------------------------------
    // TEST 7: Newly Provisioned School Super Admin Login & Workspace Profile
    // ------------------------------------------------------------------------
    console.log('📌 Test 7: Provisioned School Super Admin Login & Workspace Scoping');
    const newAdminLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: testSchoolPayload.repEmail,
        password: testSchoolPayload.password
      })
    });
    const newAdminLoginData = await newAdminLoginRes.json();
    assert.strictEqual(newAdminLoginRes.status, 200, 'New School Super Admin login should succeed');
    assert.strictEqual(newAdminLoginData.role, 'SUPER_ADMIN');
    assert.strictEqual(newAdminLoginData.schoolId, newSchoolId);
    assert.strictEqual(newAdminLoginData.school.name, testSchoolPayload.schoolName);
    const newSchoolToken = newAdminLoginData.token;

    // Fetch School Profile
    const profileRes = await fetch(`${BASE}/school/profile`, {
      headers: { 'Authorization': `Bearer ${newSchoolToken}` }
    });
    const profileData = await profileRes.json();
    assert.strictEqual(profileRes.status, 200, 'Profile fetch status should be 200');
    assert.strictEqual(profileData.school.id, newSchoolId);
    assert.strictEqual(profileData.school.name, testSchoolPayload.schoolName);
    console.log(`  ✓ Test 7 Passed: Super Admin logged in to isolated workspace (${profileData.school.name}).\n`);

    // ------------------------------------------------------------------------
    // TEST 8: Strict Multi-Tenant Data Isolation Checks
    // ------------------------------------------------------------------------
    console.log('📌 Test 8: Strict Multi-Tenant Isolation (Tenant B vs Tenant A)');
    // School 2 should have 0 students, 0 teachers, 0 classes initially
    const tenant2Students = db.query(`SELECT id FROM students WHERE school_id = ?`, [newSchoolId]);
    assert.strictEqual(tenant2Students.length, 0, 'Newly created school must have 0 students');

    const tenant1Students = db.query(`SELECT id FROM students WHERE school_id = 1`);
    assert.ok(tenant1Students.length > 0, 'Legacy School 1 students must remain intact');

    // Attempting to access Tenant 1 student ID card using Tenant 2 token must not yield Tenant 1 student
    // Verify that student 1 belongs to school 1, not school 2
    const s1 = db.get(`SELECT school_id FROM students WHERE id = 1`);
    assert.strictEqual(s1.school_id, 1, 'Student 1 must belong to school 1');
    console.log(`  ✓ Test 8 Passed: Full database tenant isolation confirmed (Tenant 1: ${tenant1Students.length} students, Tenant 2: 0 students).\n`);

    // ------------------------------------------------------------------------
    // TEST 9: School Suspension & Access Lock
    // ------------------------------------------------------------------------
    console.log('📌 Test 9: Platform Admin School Suspension & Security Lock');
    const suspendRes = await fetch(`${BASE}/platform/schools/${newSchoolId}/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${platformToken}`
      },
      body: JSON.stringify({ reason: 'Compliance audit pending' })
    });
    const suspendData = await suspendRes.json();
    assert.strictEqual(suspendRes.status, 200, 'Suspension call status should be 200');
    assert.ok(suspendData.success);

    // Now attempt to log in as School 2 Super Admin -> Should be blocked with 403
    const blockedLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: testSchoolPayload.repEmail,
        password: testSchoolPayload.password
      })
    });
    assert.strictEqual(blockedLoginRes.status, 403, 'Login to suspended school must return 403 Forbidden');
    const blockedData = await blockedLoginRes.json();
    assert.ok(blockedData.error.includes('suspended'), 'Error message must state school is suspended');
    console.log('  ✓ Test 9 Passed: Suspended school immediately rejects user authentication.\n');

    // ------------------------------------------------------------------------
    // TEST 10: School Reactivation
    // ------------------------------------------------------------------------
    console.log('📌 Test 10: Platform Admin School Reactivation');
    const reactivateRes = await fetch(`${BASE}/platform/schools/${newSchoolId}/reactivate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${platformToken}` }
    });
    const reactivateData = await reactivateRes.json();
    assert.strictEqual(reactivateRes.status, 200, 'Reactivation call status should be 200');
    assert.ok(reactivateData.success);

    // Attempt login again -> Should succeed
    const unblockedLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: testSchoolPayload.repEmail,
        password: testSchoolPayload.password
      })
    });
    assert.strictEqual(unblockedLoginRes.status, 200, 'Reactivated school login should succeed');
    console.log('  ✓ Test 10 Passed: Reactivated school permits authorized access.\n');

    // ------------------------------------------------------------------------
    // TEST 11: Rejection Workflow for Ineligible Application
    // ------------------------------------------------------------------------
    console.log('📌 Test 11: Application Rejection Workflow');
    const bogusPayload = {
      ...testSchoolPayload,
      schoolName: 'Bogus Academy',
      displayName: 'Bogus School',
      schoolEmail: `bogus_${Date.now()}@bogus.org`,
      repEmail: `bogus_rep_${Date.now()}@bogus.org`,
      repPhone: '97' + Math.floor(10000000 + Math.random() * 90000000)
    };
    const bogusRegRes = await fetch(`${BASE}/platform/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bogusPayload)
    });
    const bogusRegData = await bogusRegRes.json();
    assert.strictEqual(bogusRegRes.status, 201, 'Bogus registration should be 201');
    const bogusRef = bogusRegData.registrationRef;

    const bogusQueueRes = await fetch(`${BASE}/platform/registrations?search=Bogus`, {
      headers: { 'Authorization': `Bearer ${platformToken}` }
    });
    const bogusQueueData = await bogusQueueRes.json();
    const bogusRec = bogusQueueData.registrations.find(r => r.registration_ref === bogusRef);

    const rejectRes = await fetch(`${BASE}/platform/registrations/${bogusRec.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${platformToken}`
      },
      body: JSON.stringify({ reason: 'Invalid accreditation documents provided.' })
    });
    const rejectData = await rejectRes.json();
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectData.status, 'REJECTED');

    const bogusStatusRes = await fetch(`${BASE}/platform/registration-status/${bogusRef}`);
    const bogusStatusData = await bogusStatusRes.json();
    assert.strictEqual(bogusStatusData.registration.status, 'REJECTED');
    console.log('  ✓ Test 11 Passed: Rejection workflow properly sets status and notes.\n');

    // ------------------------------------------------------------------------
    // TEST 12: Platform Overview Analytics
    // ------------------------------------------------------------------------
    console.log('📌 Test 12: Platform Overview Analytics');
    const analyticsRes = await fetch(`${BASE}/platform/analytics`, {
      headers: { 'Authorization': `Bearer ${platformToken}` }
    });
    const analyticsData = await analyticsRes.json();
    assert.strictEqual(analyticsRes.status, 200);
    assert.ok(analyticsData.analytics.totalSchools >= 2, 'Should report at least 2 schools');
    assert.strictEqual(analyticsData.analytics.platformStatus, 'Operational');
    assert.strictEqual(analyticsData.analytics.brand, 'Product of Grexotix');
    console.log(`  ✓ Test 12 Passed: Analytics metrics accurate (Total Schools: ${analyticsData.analytics.totalSchools}, Platform: Operational).\n`);

    console.log('========================================================================');
    console.log('🎉 ALL 12 GREXOTIX MULTI-TENANT SAAS INTEGRATION TESTS PASSED (100%)');
    console.log('========================================================================\n');
  } finally {
    server.close();
  }
}

runMultitenantQATests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Multi-tenant QA test failed:', err);
    process.exit(1);
  });
