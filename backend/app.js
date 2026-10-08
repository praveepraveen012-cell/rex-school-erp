const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth.routes');
const studentsRoutes = require('./routes/students.routes');
const teachersRoutes = require('./routes/teachers.routes');
const parentsRoutes = require('./routes/parents.routes');
const classesRoutes = require('./routes/classes.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const eventsRoutes = require('./routes/events.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');
const auditRoutes = require('./routes/audit.routes');
const smsRoutes = require('./routes/sms.routes');
const homeworkRoutes = require('./routes/homework.routes');
const feesRoutes = require('./routes/fees.routes');
const transportRoutes = require('./routes/transport.routes');
const adminRoutes = require('./routes/admin.routes');
const admissionsRoutes = require('./routes/admissions.routes');
const academicRoutes = require('./routes/academic.routes');
const campusRoutes = require('./routes/campus.routes');
const hrRoutes = require('./routes/hr.routes');
const intelligenceRoutes = require('./routes/intelligence.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// Security & Parsing Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom Secure Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Rex Senior Secondary School Management API',
    version: '2.4.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Mount REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/login', authRoutes);
app.use('/login', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/campus', campusRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler for API
app.use('/api', errorHandler);

// Serve Frontend Static Assets
const PUBLIC_DIR = path.resolve(__dirname, '..');
app.use(express.static(PUBLIC_DIR, { index: 'index.html' }));

const fs = require('fs');

// SPA Fallback for client routes
app.use((req, res) => {
  if (req.url.startsWith('/api') || req.method !== 'GET') {
    return res.status(404).json({ success: false, error: 'Endpoint not found.' });
  }
  const indexFile = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  return res.status(404).send('Not Found');
});

module.exports = app;
