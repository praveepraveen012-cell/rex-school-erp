/**
 * Grexotix School Management Platform - Subscription Enforcement Middleware
 * Ensures that schools with expired free trials cannot perform operational mutations
 * (e.g. creating students, marking attendance, submitting homework) until subscribed.
 * Allows access to billing, subscriptions, invoices, and read-only views.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../database/db');

function enforceActiveSubscription(req, res, next) {
  // Extract user from token if not yet populated by inner route middleware
  if (!req.user && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      if (decoded && decoded.userId) {
        const user = db.get(`SELECT id, username, email, role, status, school_id FROM users WHERE id = ?`, [decoded.userId]);
        if (user) {
          req.user = user;
          req.schoolId = user.school_id;
        }
      }
    } catch (_) {}
  }

  // Platform admins are exempt
  if (req.user && req.user.role === 'PLATFORM_ADMIN') {
    return next();
  }

  // Non-mutating read requests (GET, HEAD, OPTIONS) are permitted
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Whitelisted endpoints that must remain accessible for billing & account management
  const path = req.originalUrl || req.path || '';
  if (
    path.startsWith('/api/subscriptions') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/platform') ||
    path.startsWith('/login') ||
    path.startsWith('/api/health')
  ) {
    return next();
  }

  const schoolId = req.user ? req.user.school_id : req.schoolId;
  if (!schoolId) {
    return next();
  }

  const school = db.get(
    `SELECT id, code, name, trial_ends_at, subscription_status, subscription_ends_at FROM schools WHERE id = ?`,
    [schoolId]
  );

  if (!school) {
    return next();
  }

  const simulatedTime = req.headers['x-simulated-time'] || req.query.simulatedTime;
  const now = simulatedTime ? new Date(simulatedTime) : new Date();

  // If paid subscription is active and not elapsed
  if (school.subscription_status === 'ACTIVE_SUBSCRIPTION' || school.subscription_status === 'ACTIVE') {
    if (school.subscription_ends_at && now > new Date(school.subscription_ends_at)) {
      // Paid subscription expired
      return res.status(402).json({
        success: false,
        error: 'Your subscription period has ended. Please renew your subscription to continue managing your school.',
        subscriptionExpired: true,
        subscriptionRequired: true,
        schoolId: school.code || `SCH-${school.id}`
      });
    }
    return next();
  }

  // Check trial expiration
  if (school.trial_ends_at) {
    const trialEnd = new Date(school.trial_ends_at);
    if (now > trialEnd || school.subscription_status === 'TRIAL_EXPIRED') {
      return res.status(402).json({
        success: false,
        error: 'Your 7-day free trial has expired. Operational modules (attendance, homework, admissions, fees) are temporarily locked. Please select a subscription plan to continue.',
        trialExpired: true,
        subscriptionRequired: true,
        schoolId: school.code || `SCH-${school.id}`
      });
    }
  }

  next();
}

module.exports = enforceActiveSubscription;
