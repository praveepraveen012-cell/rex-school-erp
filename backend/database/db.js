const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

// Ensure database directory exists
const dbDir = path.dirname(config.dbFile);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to SQLite DatabaseSync
const db = new DatabaseSync(config.dbFile);

// Enable Foreign Keys and Performance Settings
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Execute DDL schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Ensure homework schema has all approval, 5 PM lock, and auto-send fields
try {
  const hwColumns = db.prepare('PRAGMA table_info(homework)').all().map(c => c.name);
  if (!hwColumns.includes('send_mode')) {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(`
      CREATE TABLE IF NOT EXISTS homework_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        attachment_url TEXT,
        assigned_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status TEXT DEFAULT 'READY_FOR_REVIEW' CHECK(status IN ('DRAFT', 'READY_FOR_REVIEW', 'SCHEDULED', 'SENT', 'EDIT_LOCKED', 'FAILED', 'published', 'draft', 'archived')),
        send_mode TEXT DEFAULT 'MANUAL' CHECK(send_mode IN ('MANUAL', 'AUTO_5PM')),
        auto_send_enabled INTEGER DEFAULT 0 CHECK(auto_send_enabled IN (0, 1)),
        scheduled_send_at DATETIME,
        sent_at DATETIME,
        sent_by INTEGER REFERENCES users(id),
        edit_locked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.exec(`
      INSERT INTO homework_migrated (id, class_id, section_id, subject_id, teacher_id, title, description, attachment_url, assigned_date, due_date, status, created_at, updated_at)
      SELECT id, class_id, section_id, subject_id, teacher_id, title, description, attachment_url, assigned_date, due_date,
             CASE WHEN status = 'published' THEN 'SENT' ELSE UPPER(status) END,
             created_at, updated_at FROM homework;
    `);
    db.exec('DROP TABLE homework;');
    db.exec('ALTER TABLE homework_migrated RENAME TO homework;');
    db.exec('CREATE INDEX IF NOT EXISTS idx_homework_class_section ON homework(class_id, section_id, due_date);');
    db.exec('PRAGMA foreign_keys = ON;');
  }
} catch (migErr) {
  console.warn('Homework schema migration notice:', migErr.message);
}

// Ensure homework_automation_settings exists and has default row
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS homework_automation_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      auto_send_enabled INTEGER DEFAULT 1 CHECK(auto_send_enabled IN (0, 1)),
      auto_send_time TEXT DEFAULT '17:00',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      send_method TEXT DEFAULT 'WhatsApp',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO homework_automation_settings (id, auto_send_enabled, auto_send_time, timezone, send_method)
    VALUES (1, 1, '17:00', 'Asia/Kolkata', 'WhatsApp');
  `);
} catch (settingErr) {
  console.warn('Settings table init notice:', settingErr.message);
}

// Ensure Multi-Child Transport, Demo Tracking & Fee Schema Extensions
try {
  // 1. Fee Payments columns migration
  const feeCols = db.prepare('PRAGMA table_info(fee_payments)').all().map(c => c.name);
  if (!feeCols.includes('payment_type')) {
    try { db.exec("ALTER TABLE fee_payments ADD COLUMN payment_type TEXT DEFAULT 'FULL' CHECK(payment_type IN ('FULL', 'SPLIT'));"); } catch (_) {}
  }
  if (!feeCols.includes('previously_paid')) {
    try { db.exec("ALTER TABLE fee_payments ADD COLUMN previously_paid REAL DEFAULT 0;"); } catch (_) {}
  }
  if (!feeCols.includes('parent_id')) {
    try { db.exec("ALTER TABLE fee_payments ADD COLUMN parent_id INTEGER REFERENCES parents(id);"); } catch (_) {}
  }
  if (!feeCols.includes('created_by')) {
    try { db.exec("ALTER TABLE fee_payments ADD COLUMN created_by INTEGER REFERENCES users(id);"); } catch (_) {}
  }

  // 2. Bus Stops columns migration (latitude, longitude)
  const stopCols = db.prepare('PRAGMA table_info(bus_stops)').all().map(c => c.name);
  if (!stopCols.includes('latitude')) {
    try { db.exec("ALTER TABLE bus_stops ADD COLUMN latitude REAL;"); } catch (_) {}
  }
  if (!stopCols.includes('longitude')) {
    try { db.exec("ALTER TABLE bus_stops ADD COLUMN longitude REAL;"); } catch (_) {}
  }

  // 3. Ensure bus_tracking_state table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS bus_tracking_state (
      bus_id INTEGER PRIMARY KEY REFERENCES buses(id) ON DELETE CASCADE,
      route_id INTEGER REFERENCES bus_routes(id) ON DELETE SET NULL,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      tracking_mode TEXT DEFAULT 'DEMO' CHECK(tracking_mode IN ('DEMO', 'LIVE_GPS')),
      is_active INTEGER DEFAULT 0,
      speed_multiplier INTEGER DEFAULT 1,
      current_stop_index INTEGER DEFAULT 0,
      progress_percent REAL DEFAULT 0.0,
      latitude REAL,
      longitude REAL,
      current_stop_name TEXT,
      next_stop_name TEXT,
      eta_minutes INTEGER DEFAULT 15,
      status_text TEXT DEFAULT 'Stationary',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Ensure Buses and Drivers
  db.exec(`
    INSERT OR IGNORE INTO buses (id, bus_number, vehicle_no, model, capacity, status)
    VALUES (1, 'Route 02', 'TN-43-A-2015', 'Ashok Leyland Lynx 36-Seater Fleet', 36, 'ACTIVE');

    INSERT OR IGNORE INTO buses (id, bus_number, vehicle_no, model, capacity, status)
    VALUES (2, 'Bus #04', 'TN-43-B-3104', 'Eicher Skyline Pro (36-Seater Fleet)', 36, 'ACTIVE');

    INSERT OR IGNORE INTO drivers (id, name, mobile, license_no, assigned_bus_id, status)
    VALUES (1, 'Joseph Selvaraj', '9443210045', 'TN43-2012-00412', 1, 'ACTIVE');

    INSERT OR IGNORE INTO drivers (id, name, mobile, license_no, assigned_bus_id, status)
    VALUES (2, 'R. Kumaravel', '9842177420', 'TN43-2015-00892', 2, 'ACTIVE');

    INSERT OR IGNORE INTO bus_routes (id, route_code, name, assigned_bus_id, start_point, end_point, eta_minutes, live_status)
    VALUES (1, 'ROUTE-02', 'Coonoor - Wellington - Charring Cross - Rex SSS', 1, 'Coonoor Stand', 'Rex SSS Campus Gate', 12, 'Approaching Gate');

    INSERT OR IGNORE INTO bus_routes (id, route_code, name, assigned_bus_id, start_point, end_point, eta_minutes, live_status)
    VALUES (2, 'ROUTE-04', 'Kotagiri - Ooty Road - Botanical Garden - Rex SSS', 2, 'Kotagiri Bus Stand', 'Rex SSS Campus Gate', 18, 'En Route');
  `);

  // 5. Populate sequential stops with coordinates for Route 1 (Route 02)
  db.exec(`
    DELETE FROM bus_stops WHERE route_id = 1;
    INSERT INTO bus_stops (id, route_id, stop_name, stop_order, pickup_time, drop_time, distance_meters, latitude, longitude)
    VALUES
      (101, 1, 'Coonoor Stand', 1, '07:15 AM', '04:45 PM', 8200, 11.3530, 76.7959),
      (102, 1, 'Wellington Barracks', 2, '07:30 AM', '04:22 PM', 5100, 11.3688, 76.7865),
      (103, 1, 'Charring Cross Junction', 3, '07:48 AM', '04:05 PM', 480, 11.4116, 76.7088),
      (104, 1, 'Rex SSS Campus Gate', 4, '08:15 AM', '03:45 PM', 0, 11.4168, 76.6963);
  `);

  // 6. Populate sequential stops with coordinates for Route 2 (Route 04)
  db.exec(`
    DELETE FROM bus_stops WHERE route_id = 2;
    INSERT INTO bus_stops (id, route_id, stop_name, stop_order, pickup_time, drop_time, distance_meters, latitude, longitude)
    VALUES
      (201, 2, 'Kotagiri Bus Stand', 1, '07:10 AM', '04:50 PM', 14500, 11.4239, 76.8778),
      (202, 2, 'Dodabetta Tea Factory', 2, '07:30 AM', '04:30 PM', 6200, 11.4140, 76.7420),
      (203, 2, 'Botanical Garden Road Junction', 3, '07:42 AM', '04:12 PM', 650, 11.4190, 76.7118),
      (204, 2, 'Commercial Road Market', 4, '07:55 AM', '04:00 PM', 350, 11.4105, 76.7032),
      (205, 2, 'Rex SSS Campus Gate', 5, '08:15 AM', '03:45 PM', 0, 11.4168, 76.6963);
  `);

  // 7. Student transport assignments & Parent relations (if demo students exist)
  const hasDemoStudent = db.prepare('SELECT id FROM students WHERE id = 1').get();
  if (hasDemoStudent) {
    db.exec(`
      INSERT OR REPLACE INTO student_transport_assignments (id, student_id, bus_id, route_id, pickup_stop_id)
      VALUES (1, 1, 1, 1, 103);

      INSERT OR REPLACE INTO student_transport_assignments (id, student_id, bus_id, route_id, pickup_stop_id)
      VALUES (2, 2, 2, 2, 203);

      INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary)
      VALUES (1, 1, 'Parent', 1);
      INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary)
      VALUES (2, 1, 'Parent', 1);

      INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary)
      VALUES (3, 2, 'Parent', 1);
    `);
  }

  // 8. Initialize bus_tracking_state for both buses
  db.exec(`
    INSERT OR IGNORE INTO bus_tracking_state (bus_id, route_id, driver_id, tracking_mode, is_active, speed_multiplier, current_stop_index, progress_percent, latitude, longitude, current_stop_name, next_stop_name, eta_minutes, status_text)
    VALUES (1, 1, 1, 'DEMO', 0, 1, 0, 0.0, 11.3530, 76.7959, 'Coonoor Stand', 'Wellington Barracks', 12, 'Stationary (Demo Ready)');

    INSERT OR IGNORE INTO bus_tracking_state (bus_id, route_id, driver_id, tracking_mode, is_active, speed_multiplier, current_stop_index, progress_percent, latitude, longitude, current_stop_name, next_stop_name, eta_minutes, status_text)
    VALUES (2, 2, 2, 'DEMO', 0, 1, 0, 0.0, 11.4239, 76.8778, 'Kotagiri Bus Stand', 'Dodabetta Tea Factory', 18, 'Stationary (Demo Ready)');
  `);

  // 9. Ensure Fee Structures for Class 1 (8th), Class 2 (9th), Class 3 (10th)
  db.exec(`
    INSERT OR IGNORE INTO fee_structures (id, academic_year_id, class_id, term_name, total_amount, due_date)
    VALUES (10, 1, 1, 'Annual Tuition & Lab Fees (Grade 8)', 48000, '2026-10-15');

    INSERT OR IGNORE INTO fee_structures (id, academic_year_id, class_id, term_name, total_amount, due_date)
    VALUES (11, 1, 2, 'Annual Tuition & Lab Fees (Grade 9)', 51000, '2026-10-15');

    INSERT OR IGNORE INTO fee_structures (id, academic_year_id, class_id, term_name, total_amount, due_date)
    VALUES (12, 1, 3, 'Annual Tuition & Lab Fees (Grade 10)', 54000, '2026-10-15');
  `);

  // 10. Ensure Student Complete EMIS Registration Fields
  const studentCols = db.prepare('PRAGMA table_info(students)').all().map(c => c.name);
  const newStudentColumns = [
    { name: 'middle_name', type: 'TEXT' },
    { name: 'aadhaar_no', type: 'TEXT' },
    { name: 'mother_tongue', type: 'TEXT' },
    { name: 'nationality', type: "TEXT DEFAULT 'Indian'" },
    { name: 'house', type: 'TEXT' },
    { name: 'identification_marks', type: 'TEXT' },
    { name: 'religion', type: 'TEXT' },
    { name: 'community', type: 'TEXT' },
    { name: 'door_no', type: 'TEXT' },
    { name: 'street', type: 'TEXT' },
    { name: 'village_town', type: 'TEXT' },
    { name: 'district', type: 'TEXT' },
    { name: 'state', type: 'TEXT' },
    { name: 'pin_code', type: 'TEXT' },
    { name: 'permanent_address', type: 'TEXT' },
    { name: 'communication_address', type: 'TEXT' },
    { name: 'father_name', type: 'TEXT' },
    { name: 'mother_name', type: 'TEXT' },
    { name: 'guardian_name', type: 'TEXT' },
    { name: 'guardian_relationship', type: 'TEXT' },
    { name: 'alternate_mobile', type: 'TEXT' },
    { name: 'father_qualification', type: 'TEXT' },
    { name: 'mother_qualification', type: 'TEXT' },
    { name: 'father_occupation', type: 'TEXT' },
    { name: 'mother_occupation', type: 'TEXT' },
    { name: 'annual_income', type: 'TEXT' },
    { name: 'class_admitted', type: 'TEXT' },
    { name: 'previous_school', type: 'TEXT' },
    { name: 'bank_name', type: 'TEXT' },
    { name: 'account_holder_name', type: 'TEXT' },
    { name: 'account_no', type: 'TEXT' },
    { name: 'ifsc_code', type: 'TEXT' },
    { name: 'branch_name', type: 'TEXT' },
    { name: 'transport_required', type: 'INTEGER DEFAULT 0' },
    { name: 'bus_id', type: 'INTEGER REFERENCES buses(id)' },
    { name: 'route_id', type: 'INTEGER REFERENCES bus_routes(id)' },
    { name: 'pickup_stop_id', type: 'INTEGER REFERENCES bus_stops(id)' }
  ];

  for (const col of newStudentColumns) {
    if (!studentCols.includes(col.name)) {
      try {
        db.exec(`ALTER TABLE students ADD COLUMN ${col.name} ${col.type};`);
      } catch (_) {}
    }
  }
} catch (transportErr) {
  console.warn('Transport and fee seed notice:', transportErr.message);
}

// ============================================================================
// Multi-Tenant SaaS Architecture Migration & Platform Admin Seeding
// ============================================================================
try {
  const bcrypt = require('bcryptjs');

  // 1. Ensure PLATFORM_ADMIN role exists
  db.exec(`
    INSERT OR IGNORE INTO roles (name, description) VALUES
      ('PLATFORM_ADMIN', 'Grexotix Platform Administrator managing multi-school registrations, approvals, and platform operations');
  `);

  // 2. Multi-tenant columns migration
  const tenantTables = [
    'users', 'classes', 'sections', 'subjects', 'academic_years', 'teachers',
    'parents', 'students', 'homework', 'attendance', 'fee_structures', 'fee_payments',
    'buses', 'bus_routes', 'school_settings', 'audit_logs', 'notifications', 'events',
    'library_books', 'inventory_items', 'visitors', 'hostels'
  ];

  for (const table of tenantTables) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!cols.includes('school_id')) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;`);
      }
    } catch (_) {}
  }

  // 3. Ensure default school exists for existing data
  const schoolCount = db.prepare("SELECT COUNT(*) as count FROM schools").get();
  if (!schoolCount || schoolCount.count === 0) {
    db.exec(`
      INSERT INTO schools (
        id, code, name, display_name, email, phone, address, city, state, postal_code, country,
        website, logo_url, affiliation_board, affiliation_number, school_type, approx_students, status
      ) VALUES (
        1, 'SCH-001', 'Default Campus', 'Default School Campus',
        'office@school.edu', '+91 423 244 1234', 'Campus Main Road', 'Ootacamund',
        'Tamil Nadu', '643001', 'India', 'https://grexotix.com', 'assets/logo.png',
        'CBSE', '1930000', 'Secondary', 450, 'ACTIVE'
      );
    `);

    // Backfill legacy tables with school_id = 1
    for (const table of tenantTables) {
      try {
        db.exec(`UPDATE ${table} SET school_id = 1 WHERE school_id IS NULL;`);
      } catch (_) {}
    }
  }

  // 4. Ensure Grexotix Platform Administrator Account exists
  const platformAdmin = db.prepare("SELECT id FROM users WHERE role = 'PLATFORM_ADMIN'").get();
  if (!platformAdmin) {
    const hash = bcrypt.hashSync('GrexotixAdmin2026!', 10);
    db.prepare(`
      INSERT INTO users (username, email, mobile, password_hash, role, status, school_id)
      VALUES (?, ?, ?, ?, 'PLATFORM_ADMIN', 'active', NULL)
    `).run('grexotix_admin', 'admin@grexotix.com', '9999900001', hash);
  } else {
    db.prepare("UPDATE users SET school_id = NULL WHERE role = 'PLATFORM_ADMIN'").run();
  }

  // Ensure legacy records have school_id = 1
  for (const table of tenantTables) {
    try {
      db.prepare(`UPDATE ${table} SET school_id = 1 WHERE school_id IS NULL`).run();
    } catch (_) {}
  }
  db.prepare(`UPDATE users SET school_id = 1 WHERE school_id IS NULL AND role != 'PLATFORM_ADMIN'`).run();

  // Enforce fee restriction: Super Admin must NEVER possess fees.pay permission
  try {
    db.prepare("DELETE FROM role_permissions WHERE role = 'SUPER_ADMIN' AND permission_code = 'fees.pay'").run();
    const platPerms = ['platform.manage', 'platform.schools', 'platform.registrations', 'platform.settings', 'platform.audit', 'platform.dashboard'];
    for (const p of platPerms) {
      db.prepare("INSERT OR IGNORE INTO permissions (code, module, description) VALUES (?, 'PLATFORM', ?)").run(p, 'Platform Management');
      db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission_code) VALUES ('PLATFORM_ADMIN', ?)").run(p);
    }
  } catch (_) {}
} catch (tenantErr) {
  console.warn('Multi-tenant schema initialization notice:', tenantErr.message);
}

// ============================================================================
// SaaS PLATFORM EXTENSIONS: 7-Day Trial, Subscriptions, Email Reminders & Homework Approval
// ============================================================================
try {
  // 1. Roles: Ensure PLATFORM_ADMIN and SCHOOL_ADMIN exist
  db.exec(`
    INSERT OR IGNORE INTO roles (name, description) VALUES ('PLATFORM_ADMIN', 'Platform owner with SaaS-wide administration privileges');
    INSERT OR IGNORE INTO roles (name, description) VALUES ('SCHOOL_ADMIN', 'School administrator with full school tenant operational privileges');
    INSERT OR IGNORE INTO roles (name, description) VALUES ('SUPER_ADMIN', 'School super admin with administrative privileges');
    INSERT OR IGNORE INTO roles (name, description) VALUES ('TEACHER', 'Teacher with assigned class attendance and homework drafting privileges');
    INSERT OR IGNORE INTO roles (name, description) VALUES ('PARENT', 'Parent with linked student viewing privileges');
  `);

  // 2. Schools Table Columns Migration
  const schoolCols = db.prepare('PRAGMA table_info(schools)').all().map(c => c.name);
  if (!schoolCols.includes('trial_starts_at')) {
    try { db.exec("ALTER TABLE schools ADD COLUMN trial_starts_at DATETIME;"); } catch (_) {}
  }
  if (!schoolCols.includes('trial_ends_at')) {
    try { db.exec("ALTER TABLE schools ADD COLUMN trial_ends_at DATETIME;"); } catch (_) {}
  }
  if (!schoolCols.includes('subscription_status')) {
    try { db.exec("ALTER TABLE schools ADD COLUMN subscription_status TEXT DEFAULT 'TRIAL_ACTIVE';"); } catch (_) {}
  }
  if (!schoolCols.includes('selected_plan')) {
    try { db.exec("ALTER TABLE schools ADD COLUMN selected_plan TEXT DEFAULT 'TRIAL';"); } catch (_) {}
  }
  if (!schoolCols.includes('subscription_starts_at')) {
    try { db.exec("ALTER TABLE schools ADD COLUMN subscription_starts_at DATETIME;"); } catch (_) {}
  }
  if (!schoolCols.includes('subscription_ends_at')) {
    try { db.exec("ALTER TABLE schools ADD COLUMN subscription_ends_at DATETIME;"); } catch (_) {}
  }
  if (!schoolCols.includes('verified_payment_ref')) {
    try { db.exec("ALTER TABLE schools ADD COLUMN verified_payment_ref TEXT;"); } catch (_) {}
  }
  if (!schoolCols.includes('billing_cycle')) {
    try { db.exec("ALTER TABLE schools ADD COLUMN billing_cycle TEXT DEFAULT 'MONTHLY';"); } catch (_) {}
  }

  // Populate default 7-day trial for existing schools if null
  db.exec(`
    UPDATE schools
    SET trial_starts_at = COALESCE(trial_starts_at, created_at, CURRENT_TIMESTAMP),
        trial_ends_at = COALESCE(trial_ends_at, datetime(COALESCE(created_at, CURRENT_TIMESTAMP), '+7 days')),
        subscription_status = COALESCE(subscription_status, 'TRIAL_ACTIVE'),
        selected_plan = COALESCE(selected_plan, 'TRIAL')
    WHERE trial_ends_at IS NULL;
  `);

  // 3. School Subscriptions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      billing_cycle TEXT DEFAULT 'MONTHLY' CHECK(billing_cycle IN ('MONTHLY', 'ANNUAL')),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT NOT NULL,
      trial_starts_at DATETIME,
      trial_ends_at DATETIME,
      subscription_starts_at DATETIME,
      subscription_ends_at DATETIME,
      payment_gateway TEXT DEFAULT 'SANDBOX',
      transaction_ref TEXT,
      payment_status TEXT DEFAULT 'PENDING',
      invoice_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_school_subs_school ON school_subscriptions(school_id);
    CREATE INDEX IF NOT EXISTS idx_school_subs_status ON school_subscriptions(status);
  `);

  const subCols = db.prepare('PRAGMA table_info(school_subscriptions)').all().map(c => c.name);
  if (!subCols.includes('plan_name')) {
    try { db.exec("ALTER TABLE school_subscriptions ADD COLUMN plan_name TEXT;"); } catch (_) {}
  }
  if (!subCols.includes('billing_cycle')) {
    try { db.exec("ALTER TABLE school_subscriptions ADD COLUMN billing_cycle TEXT DEFAULT 'MONTHLY';"); } catch (_) {}
  }
  if (!subCols.includes('subscription_starts_at')) {
    try { db.exec("ALTER TABLE school_subscriptions ADD COLUMN subscription_starts_at DATETIME;"); } catch (_) {}
  }
  if (!subCols.includes('subscription_ends_at')) {
    try { db.exec("ALTER TABLE school_subscriptions ADD COLUMN subscription_ends_at DATETIME;"); } catch (_) {}
  }
  if (!subCols.includes('invoice_number')) {
    try { db.exec("ALTER TABLE school_subscriptions ADD COLUMN invoice_number TEXT;"); } catch (_) {}
  }
  if (!subCols.includes('trial_starts_at')) {
    try { db.exec("ALTER TABLE school_subscriptions ADD COLUMN trial_starts_at DATETIME;"); } catch (_) {}
  }

  // 4. Email Reminders & Notification Logs Table
  const emailLogCols = db.prepare('PRAGMA table_info(email_logs)').all().map(c => c.name);
  if (!emailLogCols.includes('email_type')) {
    try { db.exec("ALTER TABLE email_logs ADD COLUMN email_type TEXT;"); } catch (_) {}
    try { db.exec("UPDATE email_logs SET email_type = template_name WHERE email_type IS NULL AND template_name IS NOT NULL;"); } catch (_) {}
  }
  if (!emailLogCols.includes('delivery_status')) {
    try { db.exec("ALTER TABLE email_logs ADD COLUMN delivery_status TEXT DEFAULT 'SENT';"); } catch (_) {}
    try { db.exec("UPDATE email_logs SET delivery_status = status WHERE delivery_status IS NULL AND status IS NOT NULL;"); } catch (_) {}
  }
  if (!emailLogCols.includes('provider')) {
    try { db.exec("ALTER TABLE email_logs ADD COLUMN provider TEXT DEFAULT 'SIMULATED';"); } catch (_) {}
  }
  if (!emailLogCols.includes('content_preview')) {
    try { db.exec("ALTER TABLE email_logs ADD COLUMN content_preview TEXT;"); } catch (_) {}
  }
  if (!emailLogCols.includes('provider_message_id')) {
    try { db.exec("ALTER TABLE email_logs ADD COLUMN provider_message_id TEXT;"); } catch (_) {}
  }
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_email_logs_school ON email_logs(school_id, email_type);");
    db.exec("CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);");
  } catch (_) {}

  // 5. Homework Schema Extensions for Approval Workflow
  const hwCols = db.prepare('PRAGMA table_info(homework)').all().map(c => c.name);
  if (!hwCols.includes('submitted_at')) {
    try { db.exec("ALTER TABLE homework ADD COLUMN submitted_at DATETIME;"); } catch (_) {}
  }
  if (!hwCols.includes('approved_by')) {
    try { db.exec("ALTER TABLE homework ADD COLUMN approved_by INTEGER REFERENCES users(id);"); } catch (_) {}
  }
  if (!hwCols.includes('approved_at')) {
    try { db.exec("ALTER TABLE homework ADD COLUMN approved_at DATETIME;"); } catch (_) {}
  }
  if (!hwCols.includes('rejected_by')) {
    try { db.exec("ALTER TABLE homework ADD COLUMN rejected_by INTEGER REFERENCES users(id);"); } catch (_) {}
  }
  if (!hwCols.includes('rejected_at')) {
    try { db.exec("ALTER TABLE homework ADD COLUMN rejected_at DATETIME;"); } catch (_) {}
  }
  if (!hwCols.includes('rejection_reason')) {
    try { db.exec("ALTER TABLE homework ADD COLUMN rejection_reason TEXT;"); } catch (_) {}
  }

  // 6. Homework Audit Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS homework_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      homework_id INTEGER NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
      school_id INTEGER REFERENCES schools(id),
      user_id INTEGER REFERENCES users(id),
      user_role TEXT,
      action TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_hw_audit_hw_id ON homework_audit_logs(homework_id);
  `);

  // 7. Password Reset Tokens Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0 CHECK(used IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token);
  `);

} catch (saasErr) {
  console.warn('SaaS schema initialization notice:', saasErr.message);
}

/**
 * Database Query Helpers for consistent API
 */
const dbHelper = {
  raw: db,

  /**
   * Run a query that returns multiple rows
   * @param {string} sql
   * @param {Array} params
   * @returns {Array<Object>}
   */
  query(sql, params = []) {
    const safeParams = params.map(p => p === undefined ? null : p);
    const stmt = db.prepare(sql);
    return stmt.all(...safeParams);
  },

  /**
   * Run a query that returns a single row
   * @param {string} sql
   * @param {Array} params
   * @returns {Object|null}
   */
  get(sql, params = []) {
    const safeParams = params.map(p => p === undefined ? null : p);
    const stmt = db.prepare(sql);
    return stmt.get(...safeParams) || null;
  },

  /**
   * Run an INSERT/UPDATE/DELETE query
   * @param {string} sql
   * @param {Array} params
   * @returns {{ changes: number, lastInsertRowid: number|bigint }}
   */
  run(sql, params = []) {
    const safeParams = params.map(p => p === undefined ? null : p);
    const stmt = db.prepare(sql);
    return stmt.run(...safeParams);
  },

  /**
   * Execute multiple SQL statements
   * @param {string} sql
   */
  exec(sql) {
    return db.exec(sql);
  },

  /**
   * Run a function within a database transaction
   * @param {Function} callback
   * @returns {*}
   */
  transaction(callback) {
    db.exec('BEGIN TRANSACTION;');
    try {
      const result = callback();
      db.exec('COMMIT;');
      return result;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }
};

module.exports = dbHelper;
