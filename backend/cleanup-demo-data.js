const fs = require('fs');
const path = require('path');
const db = require('./database/db');

console.log('🧹 Starting cleanup of legacy demo records for empty school workspaces...');

// 1. Create a safe backup before cleanup
const dbFile = path.resolve(__dirname, '../database.sqlite');
const backupFile = path.resolve(__dirname, `../database.sqlite.backup-cleanup-${Date.now()}`);
fs.copyFileSync(dbFile, backupFile);
console.log(`  ✓ Backup created at: ${backupFile}`);

// Get existing tables
const existingTables = new Set(
  db.query("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name)
);

function safeDelete(tableName, condition = '') {
  if (existingTables.has(tableName)) {
    const sql = condition ? `DELETE FROM ${tableName} WHERE ${condition}` : `DELETE FROM ${tableName}`;
    db.exec(sql);
    console.log(`  ✓ Cleared table: ${tableName}${condition ? ' (' + condition + ')' : ''}`);
  }
}

// 2. Perform cleanup in a transaction
db.transaction(() => {
  db.exec('PRAGMA foreign_keys = OFF;');

  safeDelete('student_transport_assignments');
  safeDelete('student_parents');
  safeDelete('attendance');
  safeDelete('fee_payments');
  safeDelete('homework');
  safeDelete('visitors');
  safeDelete('notifications');
  safeDelete('notification_recipients');
  safeDelete('events');
  safeDelete('library_books');
  safeDelete('inventory_items');
  safeDelete('admissions');
  safeDelete('students');

  safeDelete('parents');
  safeDelete('teacher_assignments');
  safeDelete('teachers');

  safeDelete('school_registrations');
  safeDelete('schools', 'id > 1');

  // Keep School 1 Super Admin (id: 1) and Platform Admin
  safeDelete('users', "role NOT IN ('PLATFORM_ADMIN') AND id != 1");

  // Reset School 1 name to Grexotix Demonstration Campus
  db.exec(`
    UPDATE schools SET
      name = 'Grexotix Demonstration Campus',
      display_name = 'Grexotix Demonstration Campus',
      email = 'admin@grexotix.school',
      phone = '+91 80 4000 1234',
      status = 'ACTIVE'
    WHERE id = 1;

    UPDATE school_settings SET
      school_name = 'Grexotix Demonstration Campus',
      email = 'admin@grexotix.school'
    WHERE school_id = 1;
  `);

  db.exec('PRAGMA foreign_keys = ON;');
});

const studentCount = db.get("SELECT COUNT(*) as cnt FROM students")?.cnt || 0;
const teacherCount = db.get("SELECT COUNT(*) as cnt FROM teachers")?.cnt || 0;
const schoolCount = db.get("SELECT COUNT(*) as cnt FROM schools")?.cnt || 0;
const users = db.query("SELECT id, username, role, school_id FROM users");

console.log(`\n✅ CLEANUP COMPLETE:`);
console.log(`  - Active Schools: ${schoolCount}`);
console.log(`  - Students in database: ${studentCount} (Clean empty workspace ready)`);
console.log(`  - Teachers in database: ${teacherCount}`);
console.log(`  - Remaining users: ${users.length}`);
users.forEach(u => console.log(`    • ${u.username} (${u.role}, School ID: ${u.school_id})`));
