/**
 * Rex School ERP - Web Authentication & Login Audit Test Suite
 * Validates backend endpoints:
 *   - POST /api/auth/login
 *   - POST /login
 *   - Role-specific login methods (Super Admin, Teacher OTP & Password, Parent Mobile & Password)
 *   - Invalid credentials handling
 *   - Token generation & payload integrity
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAuthTests() {
  console.log('🧪 Starting RexManagementApp Web Authentication Test Suite...\n');
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
    // 1. Health check
    const healthRes = await makeRequest('/api/health', 'GET');
    assert(healthRes.status === 200 && (healthRes.body.status === 'ok' || healthRes.body.status === 'healthy'), 'Backend health check returns 200 OK and healthy status');

    // 2. Super Admin Login via /login (unified)
    const adminLoginRes = await makeRequest('/login', 'POST', {
      username: 'admin',
      password: 'AdminPassword123!'
    });
    assert(adminLoginRes.status === 200, 'POST /login with admin credentials returns 200');
    assert(adminLoginRes.body.token && adminLoginRes.body.user && adminLoginRes.body.user.role === 'SUPER_ADMIN', 'POST /login returns valid JWT and role SUPER_ADMIN');

    // 3. Super Admin Login via /api/auth/login with email
    const adminEmailRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@rex.edu',
      password: 'AdminPassword123!'
    });
    assert(adminEmailRes.status === 200 && adminEmailRes.body.user.role === 'SUPER_ADMIN', 'POST /api/auth/login with admin email returns 200 SUPER_ADMIN');

    // 4. Super Admin Invalid Password rejection
    const adminBadPassRes = await makeRequest('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'WrongPassword999!'
    });
    assert(adminBadPassRes.status === 401, 'POST /api/auth/login with wrong password correctly rejected with 401 Unauthorized');
    assert(!adminBadPassRes.body.password, 'Error response does not expose sensitive data');

    // 5. Super Admin Invalid User rejection
    const adminBadUserRes = await makeRequest('/api/auth/login', 'POST', {
      username: 'nonexistent_user',
      password: 'SomePassword123!'
    });
    assert(adminBadUserRes.status === 401, 'POST /api/auth/login with nonexistent user correctly rejected with 401');

    // 6. Teacher Login via Password (unified)
    const teacherPassRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'maths@rex.edu',
      password: 'AdminPassword123!'
    });
    assert(teacherPassRes.status === 200, 'POST /api/auth/login with teacher email & password returns 200');
    assert(teacherPassRes.body.user && teacherPassRes.body.user.role === 'TEACHER', 'Teacher password login returns role TEACHER');

    // 7. Teacher OTP flow (request OTP & verify)
    const teacherOtpReq = await makeRequest('/api/auth/teacher/request-otp', 'POST', {
      mobile_number: '9876500004'
    });
    assert(teacherOtpReq.status === 200, 'Teacher OTP request returns 200');

    const teacherOtpVerify = await makeRequest('/api/auth/teacher/verify-otp', 'POST', {
      mobile_number: '9876500004',
      otp: '123456'
    });
    assert(teacherOtpVerify.status === 200 && teacherOtpVerify.body.user.role === 'TEACHER', 'Teacher OTP verification (123456) returns 200 and role TEACHER');

    // 8. Teacher Bad OTP rejection
    const teacherBadOtp = await makeRequest('/api/auth/teacher/verify-otp', 'POST', {
      mobile_number: '9876500004',
      otp: '999999'
    });
    assert(teacherBadOtp.status === 400, 'Teacher bad OTP rejected with 400 Bad Request');

    // 9. Parent Mobile Login (standard flow)
    const parentMobileRes = await makeRequest('/api/auth/parent/login', 'POST', {
      mobile_number: '9876543210'
    });
    assert(parentMobileRes.status === 200, 'Parent login with registered mobile returns 200');
    assert(parentMobileRes.body.user && parentMobileRes.body.user.role === 'PARENT', 'Parent login returns role PARENT');
    assert(Array.isArray(parentMobileRes.body.children) && parentMobileRes.body.children.length === 2, 'Parent login returns 2 linked children (Aarav, Ananya)');

    // 10. Parent Unified Login via /login
    const parentUnifiedRes = await makeRequest('/login', 'POST', {
      mobile: '9876543210'
    });
    assert(parentUnifiedRes.status === 200 && parentUnifiedRes.body.user.role === 'PARENT', 'POST /login with mobile returns 200 PARENT');

    // 11. Parent Password Login
    const parentPassRes = await makeRequest('/login', 'POST', {
      email: 'parent.sharma@rex.edu',
      password: 'ParentPassword123!'
    });
    assert(parentPassRes.status === 200 && parentPassRes.body.user.role === 'PARENT', 'POST /login with parent email & password returns 200 PARENT');

    // 12. Parent Invalid Mobile rejection
    const parentBadMobile = await makeRequest('/api/auth/parent/login', 'POST', {
      mobile_number: '9000000000'
    });
    assert(parentBadMobile.status === 404 || parentBadMobile.status === 401, 'Parent login with unregistered mobile rejected with 404/401');

    // 13. Empty credentials validation
    const emptyLoginRes = await makeRequest('/login', 'POST', {});
    assert(emptyLoginRes.status === 400, 'Empty POST /login payload rejected with 400 Bad Request');

    // 14. CORS Headers check
    const corsRes = await makeRequest('/api/health', 'OPTIONS', null, {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type,Authorization'
    });
    assert(corsRes.status === 200 || corsRes.status === 204, 'Preflight CORS OPTIONS request succeeds');
    assert(corsRes.headers['access-control-allow-origin'] !== undefined, 'CORS Access-Control-Allow-Origin header is present');

    console.log(`\n==================================================`);
    console.log(`🎉 TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runAuthTests();
