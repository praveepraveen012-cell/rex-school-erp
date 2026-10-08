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

  // 7. Student transport assignments & Parent relations
  db.exec(`
    -- Ensure Aarav Sharma (student_id: 1) is assigned to Bus 1 (Route 02), Stop: Charring Cross
    INSERT OR REPLACE INTO student_transport_assignments (id, student_id, bus_id, route_id, pickup_stop_id)
    VALUES (1, 1, 1, 1, 103);

    -- Ensure Ananya Sharma (student_id: 2) is assigned to Bus 2 (Bus #04), Stop: Botanical Garden
    INSERT OR REPLACE INTO student_transport_assignments (id, student_id, bus_id, route_id, pickup_stop_id)
    VALUES (2, 2, 2, 2, 203);

    -- Ensure Parent relations
    INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary)
    VALUES (1, 1, 'Parent', 1);
    INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary)
    VALUES (2, 1, 'Parent', 1);

    -- Ensure Rohan Menon (student_id: 3) linked to Parent 2 (Dr. Sunita Menon)
    INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary)
    VALUES (3, 2, 'Parent', 1);
  `);

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
} catch (transportErr) {
  console.warn('Transport and fee seed notice:', transportErr.message);
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
