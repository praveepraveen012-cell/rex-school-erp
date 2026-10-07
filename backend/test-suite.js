const assert = require('assert');
const app = require('./app');
const config = require('./config/env');

async function runTests() {
  console.log('🧪 Starting Rex Management API Test Suite...\n');

  const server = app.listen(3001);
  const BASE = 'http://localhost:3001/api';

  try {
    // ------------------------------------------------------------------------
    // Test 1: Health Check
    // ------------------------------------------------------------------------
    console.log('Test 1: Health check');
    const healthRes = await fetch(`${BASE}/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok', 'Health status should be ok');
    console.log('✅ Health check passed\n');

    // ------------------------------------------------------------------------
    // Test 2: Super Admin Login
    // ------------------------------------------------------------------------
    console.log('Test 2: Super Admin Login');
    const adminLoginRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin', password: 'AdminPassword123!' })
    });
    const adminData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login should succeed');
    assert.ok(adminData.token, 'Should return JWT token');
    assert.strictEqual(adminData.user.role, 'SUPER_ADMIN');
    const adminToken = adminData.token;
    console.log('✅ Super Admin login succeeded (token acquired)\n');

    // ------------------------------------------------------------------------
    // Test 3: Role Mismatch Rejection (Teacher tries Admin login)
    // ------------------------------------------------------------------------
    console.log('Test 3: Reject non-admin at admin login');
    const fakeAdminRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'maths@rex.edu', password: 'AdminPassword123!' })
    });
    assert.strictEqual(fakeAdminRes.status, 403, 'Non-admin should be rejected with 403');
    console.log('✅ Non-admin login rejected properly with 403 Forbidden\n');

    // ------------------------------------------------------------------------
    // Test 4: Teacher OTP Authentication Flow
    // ------------------------------------------------------------------------
    console.log('Test 4: Teacher OTP Flow');
    const sendOtpRes = await fetch(`${BASE}/auth/teacher/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876500004' })
    });
    const sendOtpData = await sendOtpRes.json();
    assert.strictEqual(sendOtpRes.status, 200, 'Sending OTP should succeed');
    assert.ok(sendOtpData.devOtp, 'Dev OTP should be returned in development mode');

    // Verify OTP
    const verifyOtpRes = await fetch(`${BASE}/auth/teacher/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876500004', otp: sendOtpData.devOtp })
    });
    const teacherData = await verifyOtpRes.json();
    assert.strictEqual(verifyOtpRes.status, 200, 'OTP verification should succeed');
    assert.ok(teacherData.token, 'Teacher JWT token should be returned');
    assert.strictEqual(teacherData.user.role, 'TEACHER');
    assert.ok(teacherData.teacher.assignments.length > 0, 'Teacher should have assigned sections');
    const teacherToken = teacherData.token;
    console.log('✅ Teacher OTP flow succeeded (assignments loaded)\n');

    // ------------------------------------------------------------------------
    // Test 5: Parent Login Flow (with Multi-Child support)
    // ------------------------------------------------------------------------
    console.log('Test 5: Parent Login with Multi-Child verification');
    const parentLoginRes = await fetch(`${BASE}/auth/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionNo: 'REX-2024-001', parentMobile: '9876543210' })
    });
    const parentData = await parentLoginRes.json();
    assert.strictEqual(parentLoginRes.status, 200, 'Parent login should succeed');
    assert.ok(parentData.token, 'Parent JWT token should be returned');
    assert.strictEqual(parentData.user.role, 'PARENT');
    assert.ok(parentData.students.length >= 2, 'Parent should have multiple linked children (Aarav & Ananya)');
    const parentToken = parentData.token;
    console.log(`✅ Parent login succeeded (linked to ${parentData.students.length} students: ${parentData.students.map(s => s.first_name).join(', ')})\n`);

    // ------------------------------------------------------------------------
    // Test 6: Parent Data Isolation
    // ------------------------------------------------------------------------
    console.log('Test 6: Parent data isolation test');
    // Parent should NOT see audit logs
    const parentAuditRes = await fetch(`${BASE}/audit-logs`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    assert.strictEqual(parentAuditRes.status, 403, 'Parent should be forbidden from accessing audit logs');

    // Parent querying students should ONLY receive their own children
    const parentStudentsRes = await fetch(`${BASE}/students`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentStudentsData = await parentStudentsRes.json();
    assert.strictEqual(parentStudentsData.count, 2, 'Parent should strictly receive only their 2 linked students');
    console.log('✅ Parent data isolation verified (forbidden from admin resources, sees only own children)\n');

    // ------------------------------------------------------------------------
    // Test 7: Teacher Attendance Submission & Duplicate Prevention
    // ------------------------------------------------------------------------
    console.log('Test 7: Attendance Submission & Duplicate Prevention');
    const attendanceRes = await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        classId: 3, // Grade 10
        sectionId: 5, // Section A
        date: '2026-09-26',
        records: [
          { studentId: 1, status: 'present', remarks: 'On time' },
          { studentId: 2, status: 'present', remarks: 'On time' },
          { studentId: 3, status: 'absent', remarks: 'Fever' }
        ]
      })
    });
    const attData = await attendanceRes.json();
    assert.strictEqual(attendanceRes.status, 200, 'Attendance submission should succeed');

    // Query attendance back
    const getAttRes = await fetch(`${BASE}/attendance?classId=3&sectionId=5&date=2026-09-26`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const getAttData = await getAttRes.json();
    assert.ok(getAttData.records.length >= 3, 'Should retrieve stored attendance records');
    console.log('✅ Attendance marked and retrieved successfully from database\n');

    // ------------------------------------------------------------------------
    // Test 8: Super Admin Dashboard Stats
    // ------------------------------------------------------------------------
    console.log('Test 8: Super Admin Dashboard Stats');
    const statsRes = await fetch(`${BASE}/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    assert.strictEqual(statsData.role, 'SUPER_ADMIN');
    assert.ok(statsData.stats.totalStudents >= 10, 'Should return real student count');
    assert.ok(statsData.stats.totalTeachers >= 3, 'Should return real teacher count');
    console.log(`✅ Admin Dashboard Stats: ${statsData.stats.totalStudents} students, ${statsData.stats.totalTeachers} teachers, ${statsData.stats.totalParents} parents\n`);

    // ------------------------------------------------------------------------
    // Test 9: Notifications & Unread Badge Counter
    // ------------------------------------------------------------------------
    console.log('Test 9: Notifications & Unread Badge Counter');
    const badgeRes = await fetch(`${BASE}/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const badgeData = await badgeRes.json();
    assert.strictEqual(typeof badgeData.unreadCount, 'number');
    console.log(`✅ Unread notification badge count: ${badgeData.unreadCount}\n`);

    // ------------------------------------------------------------------------
    // Test 10: Automated SMS Logging and Stats Endpoint
    // ------------------------------------------------------------------------
    console.log('Test 10: Automated SMS Logging & Metrics');
    const smsLogsRes = await fetch(`${BASE}/sms/logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const smsLogsData = await smsLogsRes.json();
    assert.strictEqual(smsLogsRes.status, 200);
    assert.ok(Array.isArray(smsLogsData.logs), 'Should return list of logged SMS');
    assert.ok(smsLogsData.logs.length >= 1, 'Should have recorded at least one automated SMS');

    const smsStatsRes = await fetch(`${BASE}/sms/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const smsStatsData = await smsStatsRes.json();
    assert.strictEqual(smsStatsRes.status, 200);
    assert.ok(smsStatsData.stats.total >= 1, 'Stats total should be at least 1');
    console.log(`✅ Automated SMS Verified: ${smsStatsData.stats.total} total dispatched, provider: ${smsStatsData.stats.provider}\n`);

    // ------------------------------------------------------------------------
    // Test 11: Direct API Security: Parent cannot create, edit or delete homework
    // ------------------------------------------------------------------------
    console.log('Test 11: Parent Homework Mutation Rejection (POST/PUT/DELETE -> 403)');
    const parentPostHw = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${parentToken}` },
      body: JSON.stringify({ classId: 1, sectionId: 1, subjectId: 1, title: 'Hack HW', description: 'desc', dueDate: '2026-10-01' })
    });
    assert.strictEqual(parentPostHw.status, 403, 'Parent POST /homework must return 403 Forbidden');

    const parentPutHw = await fetch(`${BASE}/homework/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${parentToken}` },
      body: JSON.stringify({ title: 'Modified' })
    });
    assert.strictEqual(parentPutHw.status, 403, 'Parent PUT /homework/:id must return 403 Forbidden');

    const parentDelHw = await fetch(`${BASE}/homework/1`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    assert.strictEqual(parentDelHw.status, 403, 'Parent DELETE /homework/:id must return 403 Forbidden');
    console.log('✅ Parent Homework mutation rejected with 403 Forbidden for POST, PUT, and DELETE\n');

    // ------------------------------------------------------------------------
    // Test 12: Direct API Security: Parent cannot view unlinked student fees
    // ------------------------------------------------------------------------
    console.log('Test 12: Parent Unlinked Student Fee Access Rejection (GET /fees/student/:id -> 403)');
    const parentUnlinkedFee = await fetch(`${BASE}/fees/student/9999`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    assert.strictEqual(parentUnlinkedFee.status, 403, 'Parent requesting unlinked student fees must return 403 Forbidden');

    // Also test another real student not linked to this parent (e.g. Student 3 Rohan)
    const parentOtherStudentFee = await fetch(`${BASE}/fees/student/3`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    assert.strictEqual(parentOtherStudentFee.status, 403, 'Parent requesting Student 3 fees must return 403 Forbidden');
    console.log('✅ Unlinked student fee access correctly blocked with 403 Forbidden\n');

    // ------------------------------------------------------------------------
    // Test 13: Direct API Security: Parent cannot access or submit attendance
    // ------------------------------------------------------------------------
    console.log('Test 13: Parent Attendance Sheet and Submission Rejection (403)');
    const parentAttSheet = await fetch(`${BASE}/attendance/sheet?classId=3&sectionId=5&date=2026-09-26`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    assert.strictEqual(parentAttSheet.status, 403, 'Parent accessing /attendance/sheet must return 403');

    const parentAttSubmit = await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${parentToken}` },
      body: JSON.stringify({ classId: 3, sectionId: 5, date: '2026-09-26', records: [{ studentId: 1, status: 'present' }] })
    });
    assert.strictEqual(parentAttSubmit.status, 403, 'Parent POST /attendance must return 403');
    console.log('✅ Parent attendance sheet and marking rejected with 403 Forbidden\n');

    // ------------------------------------------------------------------------
    // Test 14: Direct API Security: Teacher cannot access Fee or Parent management
    // ------------------------------------------------------------------------
    console.log('Test 14: Teacher Fee & Administrative Access Rejection (403)');
    const teacherFees = await fetch(`${BASE}/fees`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    assert.strictEqual(teacherFees.status, 403, 'Teacher GET /fees must return 403 Forbidden');

    const teacherStudentFees = await fetch(`${BASE}/fees/student/1`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    assert.strictEqual(teacherStudentFees.status, 403, 'Teacher GET /fees/student/:id must return 403 Forbidden');

    const teacherParentsList = await fetch(`${BASE}/parents`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    assert.strictEqual(teacherParentsList.status, 403, 'Teacher GET /parents must return 403 Forbidden');
    console.log('✅ Teacher unauthorized access rejected with 403 Forbidden\n');

    // ------------------------------------------------------------------------
    // Test 15: Multi-Child Fee and Data Isolation
    // ------------------------------------------------------------------------
    console.log('Test 15: Multi-Child Data Isolation (Child A vs Child B)');
    const child1Fees = await fetch(`${BASE}/fees?studentId=1`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const child1Data = await child1Fees.json();
    assert.strictEqual(child1Fees.status, 200);
    assert.strictEqual(child1Data.student.id, 1, 'Child 1 data must belong to Student 1');

    const child2Fees = await fetch(`${BASE}/fees?studentId=2`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const child2Data = await child2Fees.json();
    assert.strictEqual(child2Fees.status, 200);
    assert.strictEqual(child2Data.student.id, 2, 'Child 2 data must belong to Student 2');
    // ------------------------------------------------------------------------
    // Test 16: Mandatory Attendance Regression Test (Section 4 & Section 27)
    // ------------------------------------------------------------------------
    console.log('Test 16: Mandatory Individual P/A Status & Reload Persistence Test');
    const classId = 3;
    const sectionId = 5;
    const testDate = '2026-09-29';

    // Step 1: Set 1=P, 2(3)=A, 3(4)=P, 4(5)=A, 5(6)=P
    const initialRecords = [
      { studentId: 1, status: 'P' },
      { studentId: 3, status: 'A' },
      { studentId: 4, status: 'P' },
      { studentId: 5, status: 'A' },
      { studentId: 6, status: 'P' }
    ];
    const save1 = await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ classId, sectionId, date: testDate, records: initialRecords })
    });
    assert.strictEqual(save1.status, 200, 'Save 1 should succeed');

    // Reload and verify
    const sheet1 = await fetch(`${BASE}/attendance/sheet?classId=${classId}&sectionId=${sectionId}&date=${testDate}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const sheet1Data = await sheet1.json();
    const map1 = {};
    sheet1Data.students.forEach(s => map1[s.id] = s.attendance_status);
    assert.strictEqual(map1[1], 'present', 'Student 1 must be present');
    assert.strictEqual(map1[3], 'absent', 'Student 3 must be absent');
    assert.strictEqual(map1[4], 'present', 'Student 4 must be present');
    assert.strictEqual(map1[5], 'absent', 'Student 5 must be absent');
    assert.strictEqual(map1[6], 'present', 'Student 6 must be present');
    console.log('  ✓ Step 1 verified: 1=P, 3=A, 4=P, 5=A, 6=P preserved accurately after reload');

    // Step 2: Change only Student 3=P and 5=P
    const step2Records = [
      { studentId: 1, status: 'P' },
      { studentId: 3, status: 'P' },
      { studentId: 4, status: 'P' },
      { studentId: 5, status: 'P' },
      { studentId: 6, status: 'P' }
    ];
    const save2 = await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ classId, sectionId, date: testDate, records: step2Records })
    });
    assert.strictEqual(save2.status, 200);

    const sheet2 = await fetch(`${BASE}/attendance/sheet?classId=${classId}&sectionId=${sectionId}&date=${testDate}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const sheet2Data = await sheet2.json();
    const map2 = {};
    sheet2Data.students.forEach(s => map2[s.id] = s.attendance_status);
    assert.strictEqual(map2[1], 'present');
    assert.strictEqual(map2[3], 'present', 'Student 3 must now be present');
    assert.strictEqual(map2[4], 'present');
    assert.strictEqual(map2[5], 'present', 'Student 5 must now be present');
    assert.strictEqual(map2[6], 'present');
    console.log('  ✓ Step 2 verified: All 5 students successfully marked Present');

    // Step 3: Change only Student 1=A, 4=A, 6=A
    const step3Records = [
      { studentId: 1, status: 'A' },
      { studentId: 3, status: 'P' },
      { studentId: 4, status: 'A' },
      { studentId: 5, status: 'P' },
      { studentId: 6, status: 'A' }
    ];
    const save3 = await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ classId, sectionId, date: testDate, records: step3Records })
    });
    assert.strictEqual(save3.status, 200);

    const sheet3 = await fetch(`${BASE}/attendance/sheet?classId=${classId}&sectionId=${sectionId}&date=${testDate}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const sheet3Data = await sheet3.json();
    const map3 = {};
    sheet3Data.students.forEach(s => map3[s.id] = s.attendance_status);
    assert.strictEqual(map3[1], 'absent', 'Student 1 must now be absent');
    assert.strictEqual(map3[3], 'present', 'Student 3 must remain present');
    assert.strictEqual(map3[4], 'absent', 'Student 4 must now be absent');
    assert.strictEqual(map3[5], 'present', 'Student 5 must remain present');
    assert.strictEqual(map3[6], 'absent', 'Student 6 must now be absent');
    console.log('✅ Mandatory Attendance Regression Test Passed: 1=A, 3=P, 4=A, 5=P, 6=A isolated and preserved\n');

    // ------------------------------------------------------------------------
    // Test 17: Attendance Date Isolation (Section 5)
    // ------------------------------------------------------------------------
    console.log('Test 17: Attendance Date Isolation (Date A vs Date B)');
    const dateA = '2026-09-28';
    const dateB = '2026-09-29';

    // Set Date A: Student 1 is Absent
    await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ classId, sectionId, date: dateA, records: [{ studentId: 1, status: 'absent' }] })
    });

    // Set Date B: Student 1 is Present
    await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ classId, sectionId, date: dateB, records: [{ studentId: 1, status: 'present' }] })
    });

    // Reload Date A and Date B independently
    const resDateA = await fetch(`${BASE}/attendance/sheet?classId=${classId}&sectionId=${sectionId}&date=${dateA}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const resDateB = await fetch(`${BASE}/attendance/sheet?classId=${classId}&sectionId=${sectionId}&date=${dateB}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const dataDateA = await resDateA.json();
    const dataDateB = await resDateB.json();

    const stu1DateA = dataDateA.students.find(s => s.id === 1);
    const stu1DateB = dataDateB.students.find(s => s.id === 1);
    assert.strictEqual(stu1DateA.attendance_status, 'absent', 'Student 1 must remain Absent on Date A');
    assert.strictEqual(stu1DateB.attendance_status, 'present', 'Student 1 must remain Present on Date B');
    console.log('✅ Date Isolation Verified: Saving Date B does NOT overwrite Date A\n');

    // ------------------------------------------------------------------------
    // Test 18: Class and Section Isolation (Section 6)
    // ------------------------------------------------------------------------
    console.log('Test 18: Class and Section Isolation (Class 3/Sec 5 vs Class 1/Sec 2)');
    // Student 2 is in Class 1, Section 2 (Grade 8-B)
    // Mark Student 2 as Absent in Class 1-B
    await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ classId: 1, sectionId: 2, date: testDate, records: [{ studentId: 2, status: 'absent' }] })
    });

    // Verify Class 3-A students do not include Student 2
    const class3Sheet = await fetch(`${BASE}/attendance/sheet?classId=3&sectionId=5&date=${testDate}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const class3Data = await class3Sheet.json();
    assert.strictEqual(class3Data.students.some(s => s.id === 2), false, 'Student 2 must NOT appear in Class 3-A');

    // Verify Class 1-B has Student 2
    const class1Sheet = await fetch(`${BASE}/attendance/sheet?classId=1&sectionId=2&date=${testDate}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const class1Data = await class1Sheet.json();
    const stu2InClass1 = class1Data.students.find(s => s.id === 2);
    assert.ok(stu2InClass1, 'Student 2 must appear in Class 1-B');
    assert.strictEqual(stu2InClass1.attendance_status, 'absent', 'Student 2 must be Absent in Class 1-B');
    console.log('✅ Class and Section Isolation Verified: Cross-class contamination prevented\n');

    // ========================================================================
    // HOMEWORK WORKFLOW & 5 PM EDIT-LOCK SUITE (MANDATORY TESTS 1 - 9)
    // ========================================================================

    const hwClassId = 3; // Grade 10
    const hwSectionId = 5; // Section A
    const hwSubjectId = 1; // Mathematics
    const todayAssignedDate = '2026-10-07';
    const dueDate = '2026-10-10';

    // ------------------------------------------------------------------------
    // TEST 19 (MANDATORY TEST 1): Teacher creates homework at 3:00 PM
    // ------------------------------------------------------------------------
    console.log('Test 19 (MANDATORY TEST 1): Teacher creates homework at 3:00 PM');
    const time3PM = '2026-10-07T15:00:00+05:30';
    const createHwRes = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({
        classId: hwClassId,
        sectionId: hwSectionId,
        subjectId: hwSubjectId,
        title: 'Quadratic Equations Exercise 4.2',
        description: 'Complete problems 1 to 10 from NCERT textbook Chapter 4.',
        assignedDate: todayAssignedDate,
        dueDate: dueDate
      })
    });
    const createHwData = await createHwRes.json();
    assert.strictEqual(createHwRes.status, 201, 'Teacher should create homework successfully');
    assert.strictEqual(createHwData.status, 'READY_FOR_REVIEW', 'Status should be READY_FOR_REVIEW');
    const homework1Id = createHwData.homeworkId;
    assert.ok(homework1Id, 'Homework ID should be returned');

    // Verify Parent CANNOT see it yet
    const parentViewBeforeRes = await fetch(`${BASE}/homework?studentId=1`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentViewBefore = await parentViewBeforeRes.json();
    assert.strictEqual(parentViewBefore.homework.some(h => h.id === homework1Id), false, 'Parent must NOT see unpublished homework');

    // Verify Teacher can view and edit it
    const teacherViewRes = await fetch(`${BASE}/homework`, {
      headers: { 'Authorization': `Bearer ${teacherToken}`, 'x-simulated-time': time3PM }
    });
    const teacherView = await teacherViewRes.json();
    const teacherHw1 = teacherView.homework.find(h => h.id === homework1Id);
    assert.ok(teacherHw1, 'Teacher should see created homework');
    assert.strictEqual(teacherHw1.is_edit_locked, false, 'Edit should NOT be locked before 5 PM');

    // Verify Super Admin can review it
    const adminViewRes = await fetch(`${BASE}/homework`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminView = await adminViewRes.json();
    assert.ok(adminView.homework.some(h => h.id === homework1Id), 'Admin should be able to review homework');
    console.log('✅ TEST 1 Passed: Teacher created homework, parent cannot see, teacher can edit, admin can review\n');

    // ------------------------------------------------------------------------
    // TEST 20 (MANDATORY TEST 2): Teacher edits before 5 PM (4:30 PM)
    // ------------------------------------------------------------------------
    console.log('Test 20 (MANDATORY TEST 2): Teacher edits before 5 PM at 4:30 PM');
    const time430PM = '2026-10-07T16:30:00+05:30';
    const editBefore5Res = await fetch(`${BASE}/homework/${homework1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time430PM
      },
      body: JSON.stringify({
        description: 'Complete problems 1 to 15 from NCERT textbook Chapter 4 (Updated at 4:30 PM).'
      })
    });
    const editBefore5Data = await editBefore5Res.json();
    assert.strictEqual(editBefore5Res.status, 200, 'Teacher edit before 5 PM should succeed');
    assert.strictEqual(editBefore5Data.success, true);
    console.log('✅ TEST 2 Passed: Teacher edited homework description before 5 PM successfully\n');

    // ------------------------------------------------------------------------
    // TEST 21 (MANDATORY TEST 3): Teacher tries editing after 5 PM (5:01 PM)
    // ------------------------------------------------------------------------
    console.log('Test 21 (MANDATORY TEST 3): Teacher tries editing after 5 PM (5:01 PM) -> Blocked 403');
    const time501PM = '2026-10-07T17:01:00+05:30';
    const editAfter5Res = await fetch(`${BASE}/homework/${homework1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time501PM
      },
      body: JSON.stringify({
        description: 'Late edit attempted at 5:01 PM.'
      })
    });
    const editAfter5Data = await editAfter5Res.json();
    assert.strictEqual(editAfter5Res.status, 403, 'Backend must return 403 Forbidden after 5 PM');
    assert.strictEqual(editAfter5Data.error, 'Homework editing deadline has passed.', 'Error message must match exactly');
    console.log('✅ TEST 3 Passed: Edit after 5 PM blocked with 403 "Homework editing deadline has passed."\n');

    // ------------------------------------------------------------------------
    // TEST 22 (MANDATORY TEST 4): Admin Send Now
    // ------------------------------------------------------------------------
    console.log('Test 22 (MANDATORY TEST 4): Admin Send Now immediately publishes to parents');
    const sendNowRes = await fetch(`${BASE}/homework/${homework1Id}/send-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const sendNowData = await sendNowRes.json();
    assert.strictEqual(sendNowRes.status, 200, 'Send Now should succeed');
    assert.strictEqual(sendNowData.status, 'SENT', 'Homework status should change to SENT');
    assert.ok(sendNowData.sentCount > 0, 'Should deliver to parents');

    // Verify Parent CAN now see it
    const parentViewAfterRes = await fetch(`${BASE}/homework?studentId=1`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentViewAfter = await parentViewAfterRes.json();
    const sentHwForParent = parentViewAfter.homework.find(h => h.id === homework1Id);
    assert.ok(sentHwForParent, 'Parent must now see SENT homework');
    assert.strictEqual(sentHwForParent.description, 'Complete problems 1 to 15 from NCERT textbook Chapter 4 (Updated at 4:30 PM).', 'Must receive final version saved before 5 PM');

    // Verify duplicate send protection on Send Now
    const duplicateSendRes = await fetch(`${BASE}/homework/${homework1Id}/send-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(duplicateSendRes.status, 409, 'Duplicate Send Now must be prevented');

    // Verify Teacher cannot edit after Admin has sent it, even if before 5 PM (Section 25)
    const teacherEditSentRes = await fetch(`${BASE}/homework/${homework1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time430PM
      },
      body: JSON.stringify({ description: 'Attempting edit on sent homework' })
    });
    assert.strictEqual(teacherEditSentRes.status, 403, 'Teacher cannot edit homework once SENT to parents');
    console.log('✅ TEST 4 Passed: Admin Send Now delivered immediately, status=SENT, parent sees it, duplicate prevented\n');

    // ------------------------------------------------------------------------
    // TEST 23 (MANDATORY TEST 5): Auto Send OFF
    // ------------------------------------------------------------------------
    console.log('Test 23 (MANDATORY TEST 5): Auto Send OFF - Homework remains unsent at 5 PM');
    const createHw2Res = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({
        classId: hwClassId,
        sectionId: hwSectionId,
        subjectId: hwSubjectId,
        title: 'Trigonometry Homework',
        description: 'Solve heights and distances problem set.',
        assignedDate: todayAssignedDate,
        dueDate: dueDate
      })
    });
    const hw2Data = await createHw2Res.json();
    const homework2Id = hw2Data.homeworkId;

    // Admin leaves Auto Send = OFF (default auto_send_enabled = 0)
    // At 5:00 PM, scheduler runs
    const schedRun5Res = await fetch(`${BASE}/homework/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:00:00+05:30'
      }
    });
    assert.strictEqual(schedRun5Res.status, 200);

    // Homework 2 must remain unsent (READY_FOR_REVIEW)
    const adminCheckHw2 = await fetch(`${BASE}/homework`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminCheckHw2Data = await adminCheckHw2.json();
    const hw2Item = adminCheckHw2Data.homework.find(h => h.id === homework2Id);
    assert.strictEqual(hw2Item.status, 'READY_FOR_REVIEW', 'Homework must remain READY_FOR_REVIEW when Auto Send is OFF');
    console.log('✅ TEST 5 Passed: Auto Send OFF kept homework unsent at 5 PM\n');

    // ------------------------------------------------------------------------
    // TEST 24 (MANDATORY TEST 6): Auto Send ON before 5 PM -> Automatically sent at 5 PM
    // ------------------------------------------------------------------------
    console.log('Test 24 (MANDATORY TEST 6): Auto Send ON before 5 PM -> Automatically sent at 5 PM');
    const createHw3Res = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({
        classId: hwClassId,
        sectionId: hwSectionId,
        subjectId: hwSubjectId,
        title: 'Statistics Frequency Polygon',
        description: 'Plot cumulative frequency ogive curve on graph sheet.',
        assignedDate: todayAssignedDate,
        dueDate: dueDate
      })
    });
    const hw3Data = await createHw3Res.json();
    const homework3Id = hw3Data.homeworkId;

    // Admin enables Auto Send before 5 PM (at 3:30 PM)
    const enableAutoSendRes = await fetch(`${BASE}/homework/${homework3Id}/auto-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T15:30:00+05:30'
      },
      body: JSON.stringify({ autoSend: true })
    });
    const enableAutoSendData = await enableAutoSendRes.json();
    assert.strictEqual(enableAutoSendRes.status, 200);
    assert.strictEqual(enableAutoSendData.status, 'SCHEDULED');
    assert.strictEqual(enableAutoSendData.autoSendEnabled, true);

    // Test Section 12 rule: Enabling Auto Send AFTER 5 PM must be rejected
    const lateAutoSendRes = await fetch(`${BASE}/homework/${homework2Id}/auto-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:10:00+05:30'
      },
      body: JSON.stringify({ autoSend: true })
    });
    const lateAutoSendData = await lateAutoSendRes.json();
    assert.strictEqual(lateAutoSendRes.status, 400);
    assert.strictEqual(lateAutoSendData.error, 'The scheduled 5:00 PM send time has already passed. Please use Send Now.');

    // Now at exactly 5:00 PM, scheduler triggers
    const runAt5Res = await fetch(`${BASE}/homework/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:00:00+05:30'
      }
    });
    const runAt5Data = await runAt5Res.json();
    assert.strictEqual(runAt5Res.status, 200);
    assert.ok(runAt5Data.processedCount >= 1, 'Auto-send scheduler should process scheduled homework at 5 PM');

    // Verify Homework 3 status is now SENT
    const checkHw3 = await fetch(`${BASE}/homework`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const checkHw3Data = await checkHw3.json();
    const hw3Item = checkHw3Data.homework.find(h => h.id === homework3Id);
    assert.strictEqual(hw3Item.status, 'SENT', 'Homework status must be SENT');
    assert.strictEqual(hw3Item.send_mode, 'AUTO_5PM', 'Send mode must be AUTO_5PM');
    console.log('✅ TEST 6 Passed: Auto Send ON dispatched at 5 PM, status=SENT, send_mode=AUTO_5PM\n');

    // ------------------------------------------------------------------------
    // TEST 25 (MANDATORY TEST 7): Auto Send Duplicate Protection
    // ------------------------------------------------------------------------
    console.log('Test 25 (MANDATORY TEST 7): Auto Send duplicate protection when scheduler runs again');
    const rerunSchedRes = await fetch(`${BASE}/homework/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:05:00+05:30'
      }
    });
    const rerunSchedData = await rerunSchedRes.json();
    assert.strictEqual(rerunSchedRes.status, 200);
    assert.strictEqual(rerunSchedData.processedCount, 0, 'No homework should be re-sent');
    console.log('✅ TEST 7 Passed: Duplicate protection verified, zero duplicate dispatches\n');

    // ------------------------------------------------------------------------
    // TEST 26 (MANDATORY TEST 8): Parent Filtering
    // ------------------------------------------------------------------------
    console.log('Test 26 (MANDATORY TEST 8): Parent data filtering - Class 10-A vs Class 8-B');
    const parentStu1Res = await fetch(`${BASE}/homework?studentId=1`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentStu1Data = await parentStu1Res.json();
    assert.ok(parentStu1Data.homework.some(h => h.id === homework1Id), 'Child in 10-A must see 10-A homework');

    const parentStu2Res = await fetch(`${BASE}/homework?studentId=2`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentStu2Data = await parentStu2Res.json();
    assert.strictEqual(parentStu2Data.homework.some(h => h.id === homework1Id), false, 'Child in 8-B must NOT receive 10-A homework');
    console.log('✅ TEST 8 Passed: Parent filtering strictly enforces child class & section boundary\n');

    // ------------------------------------------------------------------------
    // TEST 27 (MANDATORY TEST 9): WhatsApp Failure Fallback and Logging
    // ------------------------------------------------------------------------
    console.log('Test 27 (MANDATORY TEST 9): WhatsApp failure simulation and delivery log');
    const createHw4Res = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({
        classId: hwClassId,
        sectionId: hwSectionId,
        subjectId: hwSubjectId,
        title: 'Probability Lab Activity',
        description: 'Card and dice probability experimental simulation.',
        assignedDate: todayAssignedDate,
        dueDate: dueDate
      })
    });
    const hw4Data = await createHw4Res.json();
    const homework4Id = hw4Data.homeworkId;

    const failSendRes = await fetch(`${BASE}/homework/${homework4Id}/send-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ forceFailWhatsApp: true })
    });
    const failSendData = await failSendRes.json();
    assert.strictEqual(failSendRes.status, 500, 'Failed send must return server error status');
    assert.strictEqual(failSendData.success, false);
    assert.ok(failSendData.failedCount > 0, 'Failed count should be recorded');

    const deliveryLogsRes = await fetch(`${BASE}/homework/${homework4Id}/deliveries`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deliveryLogsData = await deliveryLogsRes.json();
    assert.strictEqual(deliveryLogsRes.status, 200);
    assert.strictEqual(deliveryLogsData.stats.sent, 0, 'Sent count should be 0');
    assert.ok(deliveryLogsData.stats.failed > 0, 'Failed count should be recorded');
    assert.ok(deliveryLogsData.deliveries[0].error_message, 'Actual error message must be stored');
    console.log(`✅ TEST 9 Passed: WhatsApp failure logged (Failed: ${deliveryLogsData.stats.failed}), error stored: "${deliveryLogsData.deliveries[0].error_message}"\n`);

    // ------------------------------------------------------------------------
    // TEST 28 (Section 24 Test A): Auto OFF Setting -> No Automatic Message
    // ------------------------------------------------------------------------
    console.log('Test 28 (Section 24 Test A): Automatic Sending = OFF -> No message sent at 5 PM');
    // Set auto_send_enabled = false
    const setOffRes = await fetch(`${BASE}/admin/homework-automation/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ auto_send_enabled: 0, auto_send_time: '17:00' })
    });
    const setOffData = await setOffRes.json();
    assert.strictEqual(setOffRes.status, 200);
    assert.strictEqual(setOffData.settings.auto_send_enabled, false);

    // Create eligible homework
    const hwAutoOffRes = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({
        classId: hwClassId,
        sectionId: hwSectionId,
        subjectId: hwSubjectId,
        title: 'Auto OFF Test Assignment',
        description: 'Verify no message sent when automation is disabled.',
        assignedDate: todayAssignedDate,
        dueDate: dueDate
      })
    });
    const hwAutoOffData = await hwAutoOffRes.json();
    const hwAutoOffId = hwAutoOffData.homeworkId;

    // Enable auto-send on this homework
    await fetch(`${BASE}/homework/${hwAutoOffId}/auto-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({ autoSend: true })
    });

    // Run scheduler at 5:05 PM
    const schedOffRunRes = await fetch(`${BASE}/homework/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:05:00+05:30'
      }
    });
    const schedOffRunData = await schedOffRunRes.json();
    assert.strictEqual(schedOffRunData.processedCount, 0, 'Zero messages sent when global auto-send is OFF');
    console.log('✅ TEST 28 Passed: When Auto Send = OFF, zero automatic messages sent at 5 PM\n');

    // ------------------------------------------------------------------------
    // TEST 29 (Section 24 Test B): Auto ON Setting -> Messages Sent Automatically
    // ------------------------------------------------------------------------
    console.log('Test 29 (Section 24 Test B): Automatic Sending = ON, Time = 5:00 PM -> Message sent');
    // Re-enable auto-send
    await fetch(`${BASE}/admin/homework-automation/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ auto_send_enabled: 1, auto_send_time: '17:00' })
    });

    // Run scheduler at 5:05 PM
    const schedOnRunRes = await fetch(`${BASE}/homework/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:05:00+05:30'
      }
    });
    const schedOnRunData = await schedOnRunRes.json();
    assert.ok(schedOnRunData.processedCount > 0, 'Eligible homework must be sent when Auto Send = ON');
    console.log('✅ TEST 29 Passed: When Auto Send = ON, message automatically sent at 5:00 PM\n');

    // ------------------------------------------------------------------------
    // TEST 30 (Section 24 Test C): Send Now -> Before 5 PM, No duplicate at 5 PM
    // ------------------------------------------------------------------------
    console.log('Test 30 (Section 24 Test C): Send Now before 5 PM -> No duplicate at 5 PM');
    const hwSendNowRes = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({
        classId: hwClassId,
        sectionId: hwSectionId,
        subjectId: hwSubjectId,
        title: 'Send Now Override Test',
        description: 'Verify instant delivery and duplicate prevention.',
        assignedDate: todayAssignedDate,
        dueDate: dueDate
      })
    });
    const hwSendNowData = await hwSendNowRes.json();
    const hwSendNowId = hwSendNowData.homeworkId;

    // Admin clicks Send Now via /api/admin/homework/:id/send at 4:30 PM
    const adminSendNowRes = await fetch(`${BASE}/admin/homework/${hwSendNowId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T16:30:00+05:30'
      }
    });
    const adminSendNowData = await adminSendNowRes.json();
    assert.strictEqual(adminSendNowRes.status, 200);
    assert.strictEqual(adminSendNowData.success, true);
    assert.strictEqual(adminSendNowData.status, 'SENT');

    // At 5:00 PM, scheduler must not send duplicate
    const schedNoDupRes = await fetch(`${BASE}/homework/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:05:00+05:30'
      }
    });
    const schedNoDupData = await schedNoDupRes.json();
    assert.strictEqual(schedNoDupData.processedCount, 0, 'No duplicate messages sent');
    console.log('✅ TEST 30 Passed: Send Now sent immediately, duplicate send at 5 PM prevented\n');

    // ------------------------------------------------------------------------
    // TEST 31 (Section 24 Test D): Configurable Time Change -> 5:00 PM to 5:30 PM
    // ------------------------------------------------------------------------
    console.log('Test 31 (Section 24 Test D): Change send time 5:00 PM -> 5:30 PM');
    const updateTimeRes = await fetch(`${BASE}/admin/homework-automation/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ auto_send_time: '17:30' })
    });
    const updateTimeData = await updateTimeRes.json();
    assert.strictEqual(updateTimeRes.status, 200);
    assert.strictEqual(updateTimeData.settings.auto_send_time, '17:30');
    assert.strictEqual(updateTimeData.settings.auto_send_time_display, '5:30 PM');

    // Create homework scheduled for 5:30 PM
    const hw530Res = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({
        classId: hwClassId,
        sectionId: hwSectionId,
        subjectId: hwSubjectId,
        title: '5:30 PM Scheduled Homework',
        description: 'Should trigger at 5:30 PM, not 5:00 PM.',
        assignedDate: todayAssignedDate,
        dueDate: dueDate
      })
    });
    const hw530Data = await hw530Res.json();
    const hw530Id = hw530Data.homeworkId;

    await fetch(`${BASE}/homework/${hw530Id}/auto-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({ autoSend: true })
    });

    // Run scheduler at 5:15 PM (after 5:00 PM, before 5:30 PM) -> should NOT trigger yet!
    const sched515Res = await fetch(`${BASE}/homework/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:15:00+05:30'
      }
    });
    const sched515Data = await sched515Res.json();
    assert.strictEqual(sched515Data.processedCount, 0, 'Should NOT send at 5:15 PM when scheduled for 5:30 PM');

    // Run scheduler at 5:35 PM (after 5:30 PM) -> should trigger!
    const sched535Res = await fetch(`${BASE}/homework/scheduler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': '2026-10-07T17:35:00+05:30'
      }
    });
    const sched535Data = await sched535Res.json();
    assert.strictEqual(sched535Data.processedCount, 1, 'Should trigger at 5:35 PM after 5:30 PM threshold');

    // Reset back to 17:00
    await fetch(`${BASE}/admin/homework-automation/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ auto_send_time: '17:00' })
    });
    console.log('✅ TEST 31 Passed: Configurable time successfully respected (5:30 PM used instead of 5:00 PM)\n');

    // ------------------------------------------------------------------------
    // TEST 32 (Section 24 Test E): Test Message Feature
    // ------------------------------------------------------------------------
    console.log('Test 32 (Section 24 Test E): Send test message via messaging provider');
    const testMsgRes = await fetch(`${BASE}/admin/messaging/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        mobile: '9876543210',
        message: 'School Management App automated verification test.'
      })
    });
    const testMsgData = await testMsgRes.json();
    assert.strictEqual(testMsgRes.status, 200);
    assert.strictEqual(testMsgData.success, true);
    assert.ok(testMsgData.provider, 'Provider must be returned');
    console.log(`✅ TEST 32 Passed: Test message dispatched successfully (Provider: ${testMsgData.provider})\n`);

    // ------------------------------------------------------------------------
    // TEST 33: Cancel Scheduled Send
    // ------------------------------------------------------------------------
    console.log('Test 33: Cancel scheduled send reverts to manual send');
    const hwCancelRes = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({
        classId: hwClassId,
        sectionId: hwSectionId,
        subjectId: hwSubjectId,
        title: 'Cancel Schedule Test Assignment',
        description: 'Verify cancellation of scheduled auto-send.',
        assignedDate: todayAssignedDate,
        dueDate: dueDate
      })
    });
    const hwCancelData = await hwCancelRes.json();
    const hwCancelId = hwCancelData.homeworkId;

    // Enable auto send
    await fetch(`${BASE}/homework/${hwCancelId}/auto-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'x-simulated-time': time3PM
      },
      body: JSON.stringify({ autoSend: true })
    });

    // Cancel scheduled send via /api/admin/homework/:id/cancel-scheduled-send
    const cancelRes = await fetch(`${BASE}/admin/homework/${hwCancelId}/cancel-scheduled-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelData.success, true);
    assert.strictEqual(cancelData.status, 'READY_FOR_REVIEW');
    assert.strictEqual(cancelData.autoSendEnabled, false);
    console.log('✅ TEST 33 Passed: Scheduled send cancelled; status reverted to READY_FOR_REVIEW\n');

    // ------------------------------------------------------------------------
    // TEST 34 (Requirement 19): Strict Super Admin Access Authorization
    // ------------------------------------------------------------------------
    console.log('Test 34 (Requirement 19): Strict Super Admin authorization on automation controls');
    const teacherAccessRes = await fetch(`${BASE}/admin/homework-automation/settings`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    assert.strictEqual(teacherAccessRes.status, 403, 'Teacher must receive 403 Forbidden on admin settings');

    const parentAccessRes = await fetch(`${BASE}/admin/homework-automation/settings`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    assert.strictEqual(parentAccessRes.status, 403, 'Parent must receive 403 Forbidden on admin settings');
    console.log('✅ TEST 34 Passed: Strict Super Admin RBAC enforced, unauthorized roles rejected with 403\n');

    console.log('🎉 ALL 34 TESTS (INCLUDING MANDATORY TESTS 1-9 & TESTS A-E) PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = runTests;
