const app = require('./backend/app');
const config = require('./backend/config/env');
const db = require('./backend/database/db');
const seedDatabase = require('./backend/database/seed');

// Verify initial database seed
try {
  const userCount = db.get(`SELECT COUNT(*) as count FROM users`);
  if (!userCount || userCount.count === 0) {
    console.log('Database empty. Running initial seed...');
    seedDatabase();
  }
} catch (e) {
  console.log('Running setup seed...');
  seedDatabase();
}

const homeworkService = require('./backend/services/homeworkService');

const server = app.listen(config.port, () => {
  console.log('================================================================');
  console.log(`🚀 Rex Senior Secondary School Management Platform`);
  console.log(`🌐 Server running at: http://localhost:${config.port}`);
  console.log(`📡 API Base URL:       http://localhost:${config.port}/api`);
  console.log(`🛡️  Role Access:        Super Admin, Teacher (OTP), Parent`);
  console.log(`💾 Database:           SQLite (Relational, Foreign Keys ON)`);
  console.log(`⏰ Timezone:           ${config.schoolTimezone} (5 PM Auto-Send active)`);
  console.log('================================================================');

  // Start background auto-send scheduler
  homeworkService.startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  homeworkService.stopScheduler();
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = server;
