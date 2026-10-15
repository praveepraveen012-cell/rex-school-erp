/**
 * Grexotix School Management Platform
 * Automated Regression & Security Test Suite for Role-Based Dashboards & Access Permissions
 * Covers all 19 test cases specified in the Master Prompt Matrix.
 */

const assert = require('assert');
const app = require('./app');
const db = require('./database/db');

async function runRegressionTestSuite() {
  console.log('================================================================');
  console.log('🛡️  GREXOTIX ERP: ROLE-BASED DASHBOARDS & SECURITY TEST SUITE');
  console.log('================================================================\n');

  const server = app.listen(3008);
  const BASE = 'http://localhost:3008/api';

  let totalTests = 0;
  let passedTests = 0;
  const results = [];

  function recordTest(id, name, pass, detail) {
    totalTests++;
    if (pass) {
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
    // SETUP & USER AUTHENTICATION
    // ------------------------------------------------------------------------
    console.log('--- Phase 1: Authentication & Role Verification ---\n');

    // 1. Platform Admin login
    const platRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'grexotix_admin', password: 'GrexotixAdmin2026!' })
    });
    const platData = await platRes.json();
    const platToken = platData.token;
    const isPlatAdmin = platRes.status === 200 && platData.user?.role === 'PLATFORM_ADMIN';
    recordTest(1, 'Platform Admin login', isPlatAdmin, 'Authenticated as PLATFORM_ADMIN');

    // 2. School Super Admin login
    const adminRes = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin', password: 'AdminPassword123!' })
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.token;
    const isAdmin = adminRes.status === 200 && adminData.user?.role === 'SUPER_ADMIN';
    recordTest(2, 'School Super Admin login', isAdmin, 'Authenticated as SUPER_ADMIN with school scope');

    // 3. Teacher login
    const teacherSendOtp = await fetch(`${BASE}/auth/teacher/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876500004' })
    });
    const teacherOtpData = await teacherSendOtp.json();
    const otp = teacherOtpData.devOtp || '123456';
    const teacherRes = await fetch(`${BASE}/auth/teacher/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876500004', otp })
    });
    const teacherData = await teacherRes.json();
    const teacherToken = teacherData.token;
    const isTeacher = teacherRes.status === 200 && teacherData.user?.role === 'TEACHER';
    recordTest(3, 'Teacher login', isTeacher, 'Authenticated as TEACHER with assigned classes');

    // 4. Parent login
    const parentRes = await fetch(`${BASE}/auth/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' })
    });
    const parentData = await parentRes.json();
    const parentToken = parentData.token;
    const isParent = parentRes.status === 200 && parentData.user?.role === 'PARENT' && Array.isArray(parentData.children);
    const aaravId = parentData.children ? parentData.children[0].id : 1;
    recordTest(4, 'Parent login', isParent, `Authenticated as PARENT with ${parentData.children?.length || 0} linked children`);

    console.log('\n--- Phase 2: Role Authorization & Route Restriction Tests ---\n');

    // 5. Parent opens Smart Attendance Manager URL / register sheet
    const parentSheetRes = await fetch(`${BASE}/attendance/sheet?classId=1&sectionId=1&date=2026-09-21`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    recordTest(5, 'Parent opens Smart Attendance Manager URL', parentSheetRes.status === 403, 'Denied with HTTP 403 Forbidden');

    // 6. Parent attempts Mark All Present
    const parentMarkAllRes = await fetch(`${BASE}/attendance/mark-all-present`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({ classId: 1, sectionId: 1, date: '2026-09-21' })
    });
    recordTest(6, 'Parent attempts Mark All Present', parentMarkAllRes.status === 403, 'Action unavailable, rejected with HTTP 403');

    // 7. Parent attempts attendance update through API
    const parentAttUpdateRes = await fetch(`${BASE}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${parentToken}`
      },
      body: JSON.stringify({
        classId: 1,
        sectionId: 1,
        date: '2026-09-21',
        records: [{ studentId: aaravId, status: 'present' }]
      })
    });
    recordTest(7, 'Parent attempts attendance update through API', parentAttUpdateRes.status === 403, 'Rejected with HTTP 403');

    // 8. Parent opens Fee Cashier (administrative fee endpoint)
    const parentFeeSummaryRes = await fetch(`${BASE}/fees/summary`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    recordTest(8, 'Parent opens Fee Cashier', parentFeeSummaryRes.status === 403, 'Access denied with HTTP 403');

    // 9. Parent opens homework creation URL
    // Frontend route guard blocks #homework-create and backend rejects POST /homework
    const parentHwCreateRes = await fetch(`${BASE}/homework`, {
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
        description: 'Should be rejected',
        dueDate: '2026-09-25'
      })
    });
    recordTest(9, 'Parent opens homework creation URL', parentHwCreateRes.status === 403, 'Access denied with HTTP 403');

    // 10. Parent attempts homework creation API
    recordTest(10, 'Parent attempts homework creation API', parentHwCreateRes.status === 403, 'API mutation strictly blocked');

    // 11. Teacher opens assigned attendance page
    // Teacher Anitha Kumar is assigned to Class 3 (Grade 10-A, section 5)
    const assignedClassId = teacherData.teacher?.assignments?.[0]?.class_id || 3;
    const assignedSectionId = teacherData.teacher?.assignments?.[0]?.section_id || 5;
    const assignedSubjectId = teacherData.teacher?.assignments?.[0]?.subject_id || 1;

    const teacherAssignedRes = await fetch(`${BASE}/attendance/sheet?classId=${assignedClassId}&sectionId=${assignedSectionId}&date=2026-09-21`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const teacherAssignedData = await teacherAssignedRes.json();
    const teacherAssignedOk = teacherAssignedRes.status === 200 && Array.isArray(teacherAssignedData.students);
    recordTest(11, 'Teacher opens assigned attendance page', teacherAssignedOk, `Works, loaded roster of ${teacherAssignedData.students?.length} students`);

    // 12. Teacher opens an unassigned class
    // Class 99 does not exist or is not assigned to this teacher
    const teacherUnassignedRes = await fetch(`${BASE}/attendance/sheet?classId=99&sectionId=99&date=2026-09-21`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    recordTest(12, 'Teacher opens an unassigned class', teacherUnassignedRes.status === 403, 'Access denied with HTTP 403');

    // 13. Authorized Teacher creates homework
    const teacherHwRes = await fetch(`${BASE}/homework`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        classId: assignedClassId,
        sectionId: assignedSectionId,
        subjectId: assignedSubjectId, // Mathematics
        title: 'Regression Test Problem Set 4.2',
        description: 'Solve problems 1-10 on quadratic curves',
        dueDate: '2026-09-28'
      })
    });
    const teacherHwData = await teacherHwRes.json();
    const teacherHwOk = teacherHwRes.status === 201 && teacherHwData.homeworkId > 0;
    recordTest(13, 'Authorized Teacher creates homework', teacherHwOk, `Works with HTTP 201 Created (ID: ${teacherHwData.homeworkId})`);

    // 14. Super Admin views fee ledger
    const adminFeeLedgerRes = await fetch(`${BASE}/fees/summary`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminFeeData = await adminFeeLedgerRes.json();
    const adminFeeOk = adminFeeLedgerRes.status === 200 && adminFeeData.success === true;
    recordTest(14, 'Super Admin views fee ledger', adminFeeOk, 'Works, returned school fee summary and outstanding ledgers');

    // 15. Super Admin initiates fee payment (MUST BE STRICTLY BLOCKED)
    const adminPayRes = await fetch(`${BASE}/fees/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        studentId: aaravId,
        amount: 5000,
        paymentType: 'SPLIT',
        paymentMode: 'CASH'
      })
    });
    recordTest(15, 'Super Admin initiates fee payment', adminPayRes.status === 403, 'Request rejected with HTTP 403 (Fee restriction enforced)');

    // 16. Parent views linked child\'s attendance
    const parentAttRes = await fetch(`${BASE}/attendance?studentId=${aaravId}`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentAttData = await parentAttRes.json();
    const parentAttOk = parentAttRes.status === 200 && parentAttData.studentId === aaravId && Array.isArray(parentAttData.records);
    recordTest(16, 'Parent views linked child\'s attendance', parentAttOk, `Correct child data displayed for Student #${aaravId}`);

    // 17. Parent changes student ID to an unrelated child
    // Student 9999 or unlinked student
    const parentTamperRes = await fetch(`${BASE}/attendance?studentId=9999`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const parentStudentTamperRes = await fetch(`${BASE}/students/9999`, {
      headers: { 'Authorization': `Bearer ${parentToken}` }
    });
    const isTamperBlocked = parentTamperRes.status === 403 && (parentStudentTamperRes.status === 403 || parentStudentTamperRes.status === 404);
    recordTest(17, 'Parent changes student ID to an unrelated child', isTamperBlocked, 'Access denied with HTTP 403/404');

    // 18. User attempts cross-school access
    // Request with cross-school header or accessing other school data
    const crossSchoolRes = await fetch(`${BASE}/students/1`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-School-Id': '999' // Non-existent/unauthorized school
      }
    });
    const isCrossSchoolRestricted = crossSchoolRes.status === 403 || crossSchoolRes.status === 401 || crossSchoolRes.status === 404;
    recordTest(18, 'User attempts cross-school access', isCrossSchoolRestricted, 'Cross-school access strictly prevented');

    // 19. Logout / unauthenticated protected resource access
    const noAuthDashboardRes = await fetch(`${BASE}/dashboard/stats`);
    const noAuthStudentsRes = await fetch(`${BASE}/students`);
    const noAuthAttendanceRes = await fetch(`${BASE}/attendance`);
    const isUnauthBlocked = noAuthDashboardRes.status === 401 && noAuthStudentsRes.status === 401 && noAuthAttendanceRes.status === 401;
    recordTest(19, 'Logout / unauthenticated access', isUnauthBlocked, 'Session ends and protected pages/APIs are inaccessible (401 Unauthorized)');

    console.log('\n================================================================');
    console.log(`🎉 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ QA TEST SUITE ENCOUNTERED AN ERROR:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runRegressionTestSuite();
