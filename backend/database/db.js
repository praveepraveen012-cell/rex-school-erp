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

// Ensure Multi-Child Transport & Student-Parent relationships are initialized
try {
  // 1. Bus 2 (Bus #04)
  db.exec(`
    INSERT OR IGNORE INTO buses (id, bus_number, vehicle_no, model, capacity, status)
    VALUES (2, 'Bus #04', 'TN-43-B-3104', 'Eicher Skyline Pro (36-Seater Fleet)', 36, 'ACTIVE');

    INSERT OR IGNORE INTO drivers (id, name, mobile, license_no, assigned_bus_id, status)
    VALUES (2, 'R. Kumaravel', '9842177420', 'TN43-2015-00892', 2, 'ACTIVE');

    INSERT OR IGNORE INTO bus_routes (id, route_code, name, assigned_bus_id, start_point, end_point, eta_minutes, live_status)
    VALUES (2, 'ROUTE-04', 'Kotagiri - Ooty Road - Botanical Garden - Rex SSS', 2, 'Kotagiri Bus Stand', 'Rex SSS Campus Gate', 18, 'En Route');

    INSERT OR IGNORE INTO bus_stops (id, route_id, stop_name, stop_order, pickup_time, drop_time, distance_meters)
    VALUES (2, 2, 'Botanical Garden Road Junction', 2, '07:42 AM', '04:12 PM', 650);

    -- Ensure Ananya Sharma (student_id: 2) is assigned to Bus 2 (Bus #04)
    INSERT OR IGNORE INTO student_transport_assignments (student_id, bus_id, route_id, pickup_stop_id)
    VALUES (2, 2, 2, 2);

    -- Ensure Aarav Sharma (student_id: 1) is assigned to Bus 1 (Route 02)
    INSERT OR IGNORE INTO student_transport_assignments (student_id, bus_id, route_id, pickup_stop_id)
    VALUES (1, 1, 1, 1);

    -- Ensure Ananya Sharma is linked to Parent 1 (Rajesh Sharma) in student_parents
    INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary)
    VALUES (2, 1, 'Parent', 1);
  `);
} catch (transportErr) {
  console.warn('Transport seed notice:', transportErr.message);
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
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  /**
   * Run a query that returns a single row
   * @param {string} sql
   * @param {Array} params
   * @returns {Object|null}
   */
  get(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.get(...params) || null;
  },

  /**
   * Run an INSERT/UPDATE/DELETE query
   * @param {string} sql
   * @param {Array} params
   * @returns {{ changes: number, lastInsertRowid: number|bigint }}
   */
  run(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
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
