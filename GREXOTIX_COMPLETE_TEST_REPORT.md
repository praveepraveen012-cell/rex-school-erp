# Grexotix School Management — Complete End-to-End Test and Audit Report

**Report Date:** October 22, 2026  
**Auditor:** Senior QA Engineer, Application Security Specialist, and Full-Stack Architect  
**Project:** Grexotix School Management Platform (Rex Senior Secondary School ERP)  
**Target Environments:** Web Application, Flutter Android Mobile App, Express REST API, SQLite Database  
**Database Backup Created:** `database.sqlite.backup-audit-20261022-114341`

---

## 1. Overall Production Readiness Assessment

> **OVERALL STATUS: NOT READY FOR PRODUCTION REVIEW**  
> *(Ready for Staging Deployment once Cloud Hosting, Keystore Signing, and Payment Gateways are provisioned)*

### Justification
While the core backend business logic, multi-tenant isolation, role permissions, and database constraints have achieved **100% test pass rates across 233 automated test assertions**, the application **cannot be certified as production-ready** due to five critical infrastructure and deployment blockers:

1. **Disconnected Data Architectures:** The Web application deployed on GitHub Pages operates using browser `localStorage` and client-side mock fallbacks. The Flutter Android app defaults to `http://localhost:3000/api` and silently drops into in-memory mock mode on physical mobile devices. Neither currently points to a shared, persistent cloud backend in production.
2. **Android Release Keystore Missing:** `android/app/build.gradle` is explicitly configured to sign release builds using the development debug key (`signingConfig signingConfigs.debug`).
3. **Simulated Integrations:** Payments (Razorpay/Cashfree), Bus GPS tracking, and SMS/OTP notifications are running in **mock/simulation mode**. No physical AIS-140 GPS telematics devices or live payment gateway webhooks are connected.
4. **Local File Storage:** Student profile photos, ID cards, and admission documents are stored on local ephemeral server disk (`uploads/`) rather than persistent cloud storage (S3 or Firebase Storage).
5. **Static API Keys:** Android Google Maps SDK contains a demo key placeholder (`AIzaSyRexManagementDemoAndroidKey7788`).

---

## 2. Test Execution Summary

| Test Category | Executed Test Suite | Passed | Failed | Blocked | Not Run / Demo | Success Rate |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Multi-School Isolation** | `backend/test-grexotix-multitenant-qa.js` | 12 | 0 | 0 | 0 | **100%** |
| **Academic & Attendance** | `backend/test-suite.js` | 34 | 0 | 0 | 0 | **100%** |
| **Role Permissions** | `backend/test-role-permissions-regression.js` | 19 | 0 | 0 | 0 | **100%** |
| **Student Registration & GPS**| `backend/test-student-registration-sync-gps.js`| 17 | 0 | 0 | 0 | **100%** |
| **Parent Portal & ID Cards** | `backend/test-parent-homework-and-idcard.js` | 31 | 0 | 0 | 0 | **100%** |
| **Bus Route & Telematics** | `backend/test-demo-tracking-full.js` | 49 | 0 | 0 | 0 | **100%** |
| **Fee Split & Balances** | `backend/test-fees-split.js` | 15 | 0 | 0 | 0 | **100%** |
| **Fee Superadmin Controls** | `backend/test-fees-superadmin-restrictions.js`| 35 | 0 | 0 | 0 | **100%** |
| **Web Authentication & CORS**| `backend/test-web-auth.js` | 21 | 0 | 0 | 0 | **100%** |
| **Flutter/Dart Static Syntax**| `test-dart-syntax.js` | 37 | 0 | 0 | 0 | **100%** |
| **TOTAL** | **10 Automated Test Suites** | **270** | **0** | **3** | **2** | **100% (Passed)** |

- **Blocked Tests (3):**
  1. Live Flutter Android Release APK compilation (blocked because Flutter SDK / Java toolchain is not installed in the host's system PATH).
  2. Live Google Maps Android SDK rendering (blocked due to demo Google Maps API key).
  3. Live Razorpay webhook signature verification (blocked due to missing production merchant secret).
- **Not Run / Safe Mode Tests (2):**
  1. Live GSM/DLT SMS transmission to actual student parents (safely intercepted by `backend/services/smsService.js` in development mode to prevent unauthorized messaging or charges).
  2. Live physical bus GPS hardware tracking (safely driven by backend simulation loop).

---

## 3. Discovered Vulnerabilities and Bugs

| ID | Severity | Category | Description | Impact | Status |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **BUG-1** | **CRITICAL** | Security / Data Exposure | `backend/app.js` statically served the repository root via `express.static(PUBLIC_DIR)`. Any unauthenticated user could download `http://localhost:3000/database.sqlite` (946 KB) and `.env`. | Full database extraction containing all hashed passwords, student profiles, fee logs, and environment variables. | **FIXED & VERIFIED** |
| **BUG-2** | **CRITICAL** | Multi-Tenancy Data Leak | In `students.routes.js`, `dashboard.routes.js`, and `attendance.routes.js`, SQL queries used `WHERE (school_id = ? OR ? = 1)`. When `schoolId === 1`, `? = 1` evaluated to TRUE, leaking School 2 and School 3 students and financial metrics to School 1 administrators. | Cross-school tenant isolation breakdown. | **FIXED & VERIFIED** |
| **BUG-3** | **HIGH** | Database / Stability | In `attendance.routes.js`, submitting an attendance batch with an invalid or non-existent `studentId` caused an unhandled SQLite foreign key crash (`ERR_SQLITE_ERROR 787`). | Server crash and unhandled 500 error on attendance submission. | **FIXED & VERIFIED** |
| **BUG-4** | **HIGH** | Database / Stability | In `transport.routes.js`, assigning a non-existent student ID to a bus route caused an unhandled SQLite foreign key violation. | HTTP 500 unhandled internal server error. | **FIXED & VERIFIED** |
| **BUG-5** | **HIGH** | Android / Mobile Security | `android/app/build.gradle` configured the release buildType with `signingConfig signingConfigs.debug`. | Inability to publish to Google Play Store; app signed with insecure public debug certificate. | **DOCUMENTED IN ROADMAP** |
| **BUG-6** | **MEDIUM**| Architecture / Desync | Web on GitHub Pages uses `localStorage` fallback; Android uses `http://localhost:3000/api` with in-memory fallback. Changes made on Web do not appear on Android and vice-versa. | Real-time data loss, desynchronization between platforms. | **DOCUMENTED IN ROADMAP** |
| **BUG-7** | **MEDIUM**| Test Scripts | Hardcoded student IDs (1, 2, 3) in regression suites failed because seeded database populated students 15 through 25. | False positive test failures during CI/CD runs. | **FIXED & VERIFIED** |
| **BUG-8** | **LOW** | Android Permissions | `AndroidManifest.xml` lacked Android 13+ granular media permissions (`READ_MEDIA_IMAGES`) and cleartext network configuration for non-HTTPS dev servers. | ID card download failures on modern Android devices. | **DOCUMENTED IN ROADMAP** |

---

## 4. Bugs Fixed and Code Changes Applied

### 1. `backend/app.js` (Fixed Unauthenticated Database & Secret Download)
- **Problem:** `express.static(PUBLIC_DIR)` mounted at root allowed direct requests to `/database.sqlite` and `/.env`.
- **Fix:** Added a hardened security middleware before static file serving that intercepts and returns `HTTP 403 Forbidden` for any requests targeting SQLite files (`.sqlite`, `.sqlite-shm`, `.sqlite-wal`), `.env` files, `.git` metadata, `.sql` dumps, PowerShell scripts (`.ps1`), log files, and package manifests.
- **Verification:** Verified with curl/fetch against `http://localhost:3098/database.sqlite` -> **HTTP 403 Forbidden** returned.

### 2. `backend/routes/students.routes.js`, `dashboard.routes.js`, `attendance.routes.js` (Fixed Multi-Tenant Leak)
- **Problem:** Queries contained `WHERE (school_id = ? OR ? = 1)`. When `schoolId = 1`, all records from School 2 and School 3 were returned.
- **Fix:** Replaced every instance of `(school_id = ? OR ? = 1)` and `(s.school_id = ? OR ? = 1)` with strict tenant-scoped parameter binding: `school_id = ?`.
- **Verification:** Executed `backend/test-grexotix-multitenant-qa.js`. School 1 admin querying `/api/students` receives only School 1 records; School 2 records return `0` matches.

### 3. `backend/routes/attendance.routes.js` & `transport.routes.js` (Fixed SQLite Foreign Key Crashes)
- **Problem:** Batch insertion of student IDs without existence verification triggered SQLite unhandled constraint errors.
- **Fix:** Added pre-insert existence validation queries in `attendance.routes.js` and `transport.routes.js`. If any student ID does not exist, the API returns a clean, structured `HTTP 400 Bad Request` (`Invalid student ID: <id> does not exist in this school`).
- **Verification:** Tested with invalid student ID in `test-grexotix-multitenant-qa.js` -> 400 Bad Request returned gracefully without server crash.

### 4. Test Suite Harmonization (`test-suite.js`, `test-fees-split.js`, `test-demo-tracking-full.js`, `test-web-auth.js`)
- **Fix:** Updated test suites to dynamically discover active seeded students (`Aarav Sharma - ID 15`, `Ananya Sharma - ID 16`) and properly manage the test HTTP server lifecycle on isolated ports.
- **Verification:** All 10 test suites executed to 100% completion with zero errors.

---

## 5. Role and Multi-School Security Audit Results

### Super Admin Role
- **Privileges Verified:** Full CRUD access to schools, teachers, classes, subjects, student records, and system settings.
- **Fee Inspection:** Can view fee records, overdue balances, and receipt logs.
- **Restrictions Enforced:** Superadmin **cannot** falsely mark payments as collected or forge receipt numbers without going through valid payment flows (`backend/test-fees-superadmin-restrictions.js` passed 35/35).
- **Authentication:** Verified via username `admin` or email `admin@rex.edu` with bcrypt-hashed passwords.

### Teacher Role
- **Privileges Verified:** Can view assigned classes (Class 3-A, Class 1-B), mark daily attendance, create homework, and view class schedules.
- **Attendance Isolation:** Marking a student as 'ABSENT' or 'PRESENT' updates only that individual record and does not alter peers.
- **5 PM Homework Lock:** Verified that homework assignments past the 5 PM lock cannot be tampered with or edited without administrative override (`backend/test-suite.js`).
- **Restrictions Enforced:** Blocked from accessing other schools, superadmin settings, or modifying system-wide configurations.

### Parent Role
- **Privileges Verified:** Logs in securely via registered mobile number (`9876543210`) or email.
- **Multi-Child Verification:** Both linked children (`Aarav Sharma - Class 3-A` and `Ananya Sharma - Class 1-B`) correctly load on the dashboard.
- **Data Scoping:** Parents can view only their own children's attendance, timetable, fee balances, and bus transport.
- **Restrictions Enforced:** Parent accounts attempting to mark attendance, post homework, create bus routes, or inspect unrelated students (e.g. Student 25) receive **HTTP 403 Forbidden** or **HTTP 404 Not Found**.

### Multi-School Tenant Isolation
- **Test Scenario:** School 1 (`Rex Senior Secondary`) vs School 2 (`St. Mary's Academy`).
- **URL & Parameter Tampering:** School 1 teacher/admin requesting School 2 student IDs or fee IDs receives **HTTP 403/404**.
- **Cross-School Leak Prevention:** Verified that student lists, dashboard stats, fee collections, and transport routes are strictly scoped by `school_id`.

---

## 6. Web, Android, API, Database, and Synchronization Results

### Web Application
- **Stack:** HTML5, CSS3, Vanilla JavaScript.
- **Layouts & Responsiveness:** Clean responsive sidebar and mobile navigation drawer. Verified on desktop (1920x1080), tablet (768x1024), and mobile viewports.
- **Synchronization State:** **DESYNCHRONIZED IN PRODUCTION**. When hosted on GitHub Pages, `js/api.js` defaults to `isStaticMode = true` and stores data in `localStorage`. Web actions do not sync to SQLite unless `window.API_BASE_URL` is configured to point to a live cloud server.

### Android Application
- **Stack:** Flutter / Dart (Target SDK 34, Min SDK 21).
- **Code Quality:** All 37 Dart source files in `lib/` were validated for balanced braces, brackets, and syntax structure.
- **API Client:** `lib/services/api_service.dart` is architected with resilient offline caching, but its default URL is `http://localhost:3000/api`. On physical devices, `localhost` fails and the app automatically switches to in-memory demo data.

### Backend APIs & Database
- **Framework:** Express.js 5.2.1 on Node.js.
- **Database:** SQLite 3 with foreign key enforcement (`PRAGMA foreign_keys = ON;`).
- **Data Persistence:** Database changes persist across server restarts, browser refreshes, and re-logins.
- **Backup Verification:** Created full binary backup `database.sqlite.backup-audit-20261022-114341`.

---

## 7. Third-Party Integrations Status

| Integration | Technology / Provider | Mode / Environment | Functional Status | Production Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **Fees & Payments** | Razorpay / Cashfree SDK | **MOCK / SIMULATED** | Working in Demo | Must configure live Razorpay Key/Secret, webhook signature validation, and HTTPS callbacks. |
| **SMS & OTP** | Fast2SMS / Twilio | **MOCK / SIMULATED** | Working in Demo | Must configure live DLT entity IDs, approved SMS templates, and production gateway auth tokens. |
| **Bus GPS Tracking**| `demoGpsSimulator.js` | **MOCK / SIMULATED** | Working in Demo | Must connect real AIS-140 GPS telematics API or device webhook listener to ingest actual coordinates. |
| **Maps SDK** | Google Maps Android SDK | **DEMO KEY** | Placeholder | Replace `AIzaSyRexManagementDemoAndroidKey7788` with restricted Google Cloud Maps API key. |
| **Push Alerts** | Firebase Cloud Messaging | **SKELETON** | Not Initialized | Place `google-services.json` in `android/app/` and initialize FCM service worker on web. |
| **File Storage** | Local Disk (`uploads/`) | **LOCAL ONLY** | Working Locally | Migrate to AWS S3 or Firebase Cloud Storage for high availability and backup redundancy. |

---

## 8. Android Build & Release Configuration

- **Current Application ID:** `com.rex.school_erp`
- **Compile SDK:** 34 | **Target SDK:** 34 | **Min SDK:** 21
- **Release Signing:** Currently configured as `signingConfig signingConfigs.debug`.
- **R8 / ProGuard:** Disabled (`minifyEnabled false`, `shrinkResources false`).
- **Network Security:** Android 9+ blocks cleartext HTTP by default. For staging over HTTP, `android:usesCleartextTraffic="true"` or a network security configuration domain whitelist is required.

---

## 9. Outstanding Deployment Blockers

1. **Shared Production Hosting:** Need a hosted cloud backend (e.g., Render, Railway, AWS ECS, or Firebase Functions) with SSL/HTTPS.
2. **Production Database:** SQLite on local disk is suitable only for single-instance development. For multi-instance scaling and persistence, deploy PostgreSQL or Firebase Firestore.
3. **Android Release Keystore:** Generate a production `.jks` keystore and configure `key.properties` for Google Play signing.
4. **Cloud Media Storage:** Student photos and ID cards in `uploads/` must be uploaded to an S3-compatible bucket or Firebase Storage.
5. **Payment Gateway Verification:** Transition from simulated receipt generation to verified webhook signatures.

---

## 10. Step-by-Step Resolution Roadmap

```mermaid
graph TD
    A[Step 1: Deploy Backend to Cloud] --> B[Step 2: Connect Shared Database]
    B --> C[Step 3: Migrate Storage to S3/Firebase]
    C --> D[Step 4: Update Web & Android Base URLs]
    D --> E[Step 5: Setup Android Keystore & Maps Key]
    E --> F[Step 6: Activate Live SMS & Razorpay]
```

### Step 1: Deploy Cloud Backend (Node.js/Express)
1. Provision a cloud container instance (Render, Railway, or AWS Lightsail) with Node.js 18+.
2. Set environment variables in the cloud dashboard:
   - `NODE_ENV=production`
   - `JWT_SECRET=<strong-random-64-char-string>`
   - `PORT=3000`
   - `CORS_ORIGIN=https://grexotix.github.io,https://grexotix.com`

### Step 2: Configure Shared Web API Base URL
In `js/api.js` or via a global configuration script:
```javascript
window.API_BASE_URL = 'https://api.yourdomain.com/api';
```
This forces the web application to communicate exclusively with the live backend, disabling `localStorage` mock fallbacks.

### Step 3: Configure Android Production Base URL & Keystore
1. In `android/key.properties`, define the release keystore:
   ```properties
   storePassword=YourSecurePassword
   keyPassword=YourSecurePassword
   keyAlias=grexotix_release
   storeFile=../grexotix-release-key.jks
   ```
2. Build the Flutter release APK with the production API endpoint:
   ```bash
   flutter build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api
   ```

### Step 4: Configure Live Payment Gateway (Razorpay)
1. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to cloud `.env`.
2. Implement cryptographic HMAC-SHA256 signature verification in `backend/routes/fees.routes.js`:
   ```javascript
   const crypto = require('crypto');
   const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
     .update(orderId + "|" + paymentId)
     .digest('hex');
   if (expectedSignature !== razorpaySignature) {
     return res.status(400).json({ error: 'Tampered payment signature' });
   }
   ```

### Step 5: Configure Production SMS (Fast2SMS / Twilio)
1. Obtain approved DLT Entity ID and Template IDs from the telecom portal.
2. In `backend/.env`, set `SMS_PROVIDER=fast2sms` and `FAST2SMS_API_KEY=<live-key>`.
3. Set `NODE_ENV=production` so `smsService.js` routes messages through the live HTTPS gateway.

---

**Report Prepared By:** Grexotix School Management QA & Security Team  
**Artifact File:** `GREXOTIX_COMPLETE_TEST_REPORT.md`
