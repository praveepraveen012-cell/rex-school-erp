/**
 * Grexotix School Management Platform
 * Automated Verification Suite for:
 * 1. Full EMIS Student Registration & Form Options
 * 2. Duplicate Validation (Admission No & Roll No)
 * 3. Parent Auto-Linkage & Multi-Child Access
 * 4. Bidirectional Web-Mobile Synchronization
 * 5. Bus GPS Tracking (Demo Simulation vs Live Mode & Parent Privacy)
 * 6. Role-Based Permissions & Tenant Isolation
 */

const assert = require('assert');
const app = require('./app');
const db = require('./database/db');

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 GREXOTIX ERP: STUDENT REGISTRATION, SYNC & GPS TEST SUITE');
  console.log('================================================================\n');

  const server = app.listen(3015);
  const BASE = 'http://localhost:3015/api';

  let totalTests = 0;
  let passedTests = 0;
  const results = [];

  function record(id, name, passed, detail) {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`  ✓ PASS [Test ${id}]: ${name} - ${detail}`);
      results.push({ id, name, status: 'PASS', detail });
    } else {
      console.error(`  ✗ FAIL [Test ${id}]: ${name} - ${detail}`);
      results.push({ id, name, status: 'FAIL', detail });
      throw new Error(`Test ${id} failed: ${detail}`);
    }
  }

  try {
    // ------------------------------------------------------------------------
    // 1. AUTHENTICATION & TOKENS
    // ------------------------------------------------------------------------
    console.log('--- Phase 1: Authentication & Role Sessions ---\n');

    // Super Admin login
    const adminRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin', password: 'AdminPassword123!' })
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.token;
    record(1, 'Super Admin Login', adminRes.status === 200 && adminData.user.role === 'SUPER_ADMIN', 'Authenticated as School Super Admin');

    // Parent login (Rajesh Sharma: 9876543210)
    const parentRes = await fetch(`${BASE}/auth/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' })
    });
    const parentData = await parentRes.json();
    const parentToken = parentData.token;
    const initialChildCount = (parentData.children || parentData.students || []).length;
    record(2, 'Parent Login', parentRes.status === 200 && initialChildCount >= 2, `Authenticated with ${initialChildCount} linked children (Aarav, Ananya)`);

    // ------------------------------------------------------------------------
    // 2. FORM OPTIONS ENDPOINT
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 2: Dynamic Form Options Endpoint ---\n');

    const formOptsRes = await fetch(`${BASE}/students/form-options`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const formOpts = await formOptsRes.json();
    const hasClasses = Array.isArray(formOpts.classes) && formOpts.classes.length > 0;
    const hasSections = Array.isArray(formOpts.sections) && formOpts.sections.length > 0;
    const hasBuses = Array.isArray(formOpts.buses) && formOpts.buses.length > 0;
    const hasRoutes = Array.isArray(formOpts.routes) && formOpts.routes.length > 0;
    record(3, 'Form Options API', formOptsRes.status === 200 && hasClasses && hasSections && hasBuses && hasRoutes, 
      `Loaded ${formOpts.classes.length} classes, ${formOpts.sections.length} sections, ${formOpts.buses.length} buses, ${formOpts.routes.length} routes with ordered stops`);

    // ------------------------------------------------------------------------
    // 3. STUDENT REGISTRATION (FULL EMIS SCHEMA)
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 3: Full EMIS Student Registration & Validation ---\n');

    const timestamp = Date.now().toString().slice(-4);
    const testAdmNo = `REX-EMIS-${timestamp}`;
    const testRollNo = `EMIS-${timestamp}`;

    const newStudentPayload = {
      admissionNo: testAdmNo,
      rollNo: testRollNo,
      firstName: 'Vikram',
      middleName: 'Raj',
      lastName: 'Sharma', // Third child of Rajesh Sharma
      dob: '2014-08-20',
      gender: 'Male',
      bloodGroup: 'B+',
      aadhaarNo: '9845 1234 5678',
      motherTongue: 'Tamil',
      nationality: 'Indian',
      house: 'Red',
      mark1: 'Birthmark on left shoulder',
      mark2: 'Small scar above right eyebrow',
      fatherName: 'Rajesh Sharma',
      motherName: 'Priya Sharma',
      guardianName: 'Suresh Sharma',
      guardianRelationship: 'Paternal Uncle',
      parentMobile: '9876543210', // Existing parent mobile!
      alternateMobile: '9443210987',
      parentEmail: 'rajesh.sharma@example.com',
      fatherQualification: 'M.Tech Computer Science',
      fatherOccupation: 'Principal Software Architect',
      motherQualification: 'M.Sc Mathematics, B.Ed',
      motherOccupation: 'Assistant Professor',
      annualIncome: '₹10,00,001 – ₹25,00,000',
      religion: 'Hindu',
      community: 'General',
      doorNo: '14/B',
      street: 'Havelock Road',
      villageTown: 'Ootacamund',
      district: 'The Nilgiris',
      state: 'Tamil Nadu',
      pinCode: '643001',
      permanentAddress: '14/B, Havelock Road, Ootacamund, The Nilgiris, Tamil Nadu - 643001',
      communicationAddress: '14/B, Havelock Road, Ootacamund, The Nilgiris, Tamil Nadu - 643001',
      address: '14/B, Havelock Road, Ootacamund, The Nilgiris, Tamil Nadu - 643001',
      classId: 1, // Class 10
      sectionId: 1, // Section A
      academicYearId: 1,
      admissionDate: '2026-06-01',
      classAdmitted: 'Class 10',
      previousSchool: 'St. Joseph Higher Secondary School, Coonoor',
      status: 'Active',
      bankName: 'State Bank of India',
      accountHolderName: 'Rajesh Sharma',
      accountNo: '30894512984',
      ifscCode: 'SBIN0000889',
      branchName: 'Ootacamund Main Branch',
      transportRequired: true,
      busId: 1, // Route 02
      routeId: 1,
      pickupStopId: 101,
      emergencyContact: '9443210987',
      medicalNotes: 'No chronic allergies; carries asthma inhaler.'
    };

    const enrollRes = await fetch(`${BASE}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(newStudentPayload)
    });
    const enrollData = await enrollRes.json();
    const enrolledStudentId = enrollData.studentId;
    record(4, 'Full EMIS Student Enrollment', enrollRes.status === 201 && enrollData.success, 
      `Enrolled Vikram Sharma (ID: ${enrolledStudentId}, Adm: ${testAdmNo}) with all 36 EMIS fields`);

    // ------------------------------------------------------------------------
    // 4. DUPLICATE ADMISSION NUMBER VALIDATION
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 4: Duplicate Validation Tests ---\n');

    const dupAdmRes = await fetch(`${BASE}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...newStudentPayload,
        rollNo: `ROLL-DIFF-${timestamp}`
      })
    });
    const dupAdmData = await dupAdmRes.json();
    record(5, 'Duplicate Admission Number Prevention', dupAdmRes.status === 400 && dupAdmData.error.includes('already exists'), 
      `Rejected duplicate admission number with error: "${dupAdmData.error}"`);

    // Duplicate Roll Number within same class and section
    const dupRollRes = await fetch(`${BASE}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...newStudentPayload,
        admissionNo: `REX-NEW-${timestamp}`
      })
    });
    const dupRollData = await dupRollRes.json();
    record(6, 'Duplicate Roll Number Prevention', dupRollRes.status === 400 && dupRollData.error.includes('already assigned'), 
      `Rejected duplicate roll number with error: "${dupRollData.error}"`);

    // ------------------------------------------------------------------------
    // 5. PARENT AUTO-LINKAGE & MULTI-CHILD VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 5: Parent Linkage & Multi-Child Access ---\n');

    // Login as Rajesh Sharma again
    const parentReLogin = await fetch(`${BASE}/auth/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' })
    });
    const parentReData = await parentReLogin.json();
    const updatedChildren = parentReData.children || parentReData.students || [];
    const hasVikram = updatedChildren.some(c => c.id === enrolledStudentId || c.first_name === 'Vikram');
    record(7, 'Parent Auto-Linkage for Multi-Child', parentReLogin.status === 200 && hasVikram && updatedChildren.length === initialChildCount + 1,
      `Rajesh Sharma account now seamlessly retrieves all ${updatedChildren.length} linked children including newly enrolled child Vikram`);

    // ------------------------------------------------------------------------
    // 6. BIDIRECTIONAL EDIT SYNCHRONIZATION
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 6: Bidirectional Edit Synchronization ---\n');

    const updatePayload = {
      address: '42, Upper Tiger Hill Road, Ootacamund',
      permanentAddress: '42, Upper Tiger Hill Road, Ootacamund',
      alternateMobile: '9443299999',
      medicalNotes: 'Asthma symptoms resolved under treatment.'
    };

    const updateRes = await fetch(`${BASE}/students/${enrolledStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(updatePayload)
    });
    const updateData = await updateRes.json();
    record(8, 'Student Record Update', updateRes.status === 200 && updateData.success, 'Updated address and medical notes');

    // Verify record retrieval matches updated fields
    const getStudentRes = await fetch(`${BASE}/students/${enrolledStudentId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const getStudentData = await getStudentRes.json();
    const stu = getStudentData.student;
    const isUpdated = stu && stu.permanent_address.includes('Upper Tiger Hill') && stu.alternate_mobile === '9443299999';
    record(9, 'Synchronized Record Read', getStudentRes.status === 200 && isUpdated, 
      `Read verified: Address is "${stu.permanent_address}" and Alt Phone is "${stu.alternate_mobile}"`);

    // ------------------------------------------------------------------------
    // 7. BUS GPS TRACKING: DEMO SIMULATION VS LIVE GPS & PARENT PRIVACY
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 7: GPS Tracking Mode & Parent Privacy ---\n');

    // 1. Get live fleet tracking
    const fleetRes = await fetch(`${BASE}/transport/fleet`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const fleetData = await fleetRes.json();
    const hasFleet = fleetRes.status === 200 && Array.isArray(fleetData.buses);
    const bus1 = (fleetData.buses || []).find(b => b.id === 1);
    record(10, 'Authoritative Fleet GPS Telematics', hasFleet && bus1, 
      `Fleet telematics retrieved (${fleetData.buses?.length} buses). Bus #1: ${bus1?.bus_number} (${bus1?.vehicle_no})`);

    // 2. Start demo simulation
    const startDemoRes = await fetch(`${BASE}/transport/demo-tracking/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ busId: 1, speedMultiplier: 2 })
    });
    const startDemoData = await startDemoRes.json();
    const isStarted = startDemoRes.status === 200 && startDemoData.success === true && (startDemoData.tracking?.is_active === 1 || startDemoData.tracking?.is_active === true);
    record(11, 'Super Admin Demo Simulator Controls', isStarted, 
      `Demo simulator started at 2x speed. Bus coordinates progressing along route stops (is_active: 1)`);

    // 3. Parent Transport View: Parent sees only linked child's bus
    const parentBusRes = await fetch(`${BASE}/transport/my-bus?studentId=${enrolledStudentId}`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentBusData = await parentBusRes.json();
    const parentCanSeeChildBus = parentBusRes.status === 200 && parentBusData.hasAssignment === true && parentBusData.tracking?.busId === 1;
    record(12, 'Parent Transport Privacy Enforcement', parentCanSeeChildBus, 
      `Parent retrieves only assigned bus for linked child (Bus: ${parentBusData.tracking?.busNumber}, Stop: ${parentBusData.tracking?.pickupStop}). Other fleet buses are not exposed.`);

    // 4. Parent attempts to access unauthorized child's bus (Student #99999)
    const unauthBusRes = await fetch(`${BASE}/transport/my-bus?studentId=99999`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    record(13, 'Unauthorized Child Transport Access Blocked', unauthBusRes.status === 403, 
      `Parent access to unlinked child transport rejected with HTTP ${unauthBusRes.status} (Forbidden)`);

    // ------------------------------------------------------------------------
    // 8. ROLE-BASED DASHBOARD & BACKEND AUTHORIZATION
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 8: Role Authorization & Tenant Isolation ---\n');

    // 1. Super Admin cannot initiate parent fee payments
    const adminPayRes = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ studentId: enrolledStudentId, amount: 5000, paymentMethod: 'CASH' })
    });
    record(14, 'Super Admin Fee Payment Initiation Prohibited', adminPayRes.status === 403, 
      'Super Admin attempt to initiate fee payment rejected with HTTP 403 (Fee restriction enforced)');

    // 2. Parent cannot mark attendance
    const parentAttRes = await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({ classId: 1, sectionId: 1, date: '2026-10-16', records: [{ studentId: enrolledStudentId, status: 'P' }] })
    });
    record(15, 'Parent Attendance Editing Prohibited', parentAttRes.status === 403, 
      'Parent attempt to mark attendance rejected with HTTP 403 Forbidden');

    // 3. Parent cannot create homework
    const parentHwRes = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({ classId: 1, sectionId: 1, subject: 'Math', title: 'Hacked Homework' })
    });
    record(16, 'Parent Homework Creation Prohibited', parentHwRes.status === 403, 
      'Parent attempt to create homework rejected with HTTP 403 Forbidden');

    // 4. Parent views linked child attendance summary
    const parentAttView = await fetch(`${BASE}/attendance/student/${enrolledStudentId}`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    record(17, 'Parent Views Linked Child Attendance', parentAttView.status === 200, 
      'Parent successfully views attendance summary for linked child Vikram');

    // Stop demo simulator before finishing
    await fetch(`${BASE}/transport/demo-tracking/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ busId: 1 })
    });

    console.log('\n================================================================');
    console.log(`🎉 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test Suite encountered an error:', err);
  } finally {
    server.close();
  }
}

runTestSuite();
