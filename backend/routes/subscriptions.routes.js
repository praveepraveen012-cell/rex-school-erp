/**
 * Grexotix School Management Platform - Subscription & Billing Routes
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const emailService = require('../services/emailService');
const reminderScheduler = require('../services/reminderScheduler');
const auditService = require('../services/auditService');

const PLANS = [
  {
    id: 'STARTER',
    name: 'Grexotix Starter Plan',
    priceMonthly: 2499,
    priceAnnual: 23990,
    maxStudents: 300,
    features: [
      'Student & Staff Information Directory',
      'Daily Attendance Recording & Reports',
      'Digital Diary & Daily Homework',
      'Flexible Fee Ledgers & Split-Payment Enforcement (30% Min)',
      'Digital Student ID Cards with Scannable QR'
    ]
  },
  {
    id: 'GROWTH',
    name: 'Grexotix Growth Plan',
    priceMonthly: 4999,
    priceAnnual: 47990,
    maxStudents: 1000,
    features: [
      'All Starter Plan Features',
      'Fleet Bus GPS Tracking & Proximity Alerts',
      'Automated Parent SMS & Email Notifications',
      'Two-Step Homework Approval Workflow',
      'Multi-Child Parent Portal Switching',
      'Gradebook & Periodic Report Cards'
    ]
  },
  {
    id: 'ENTERPRISE',
    name: 'Grexotix Enterprise Platform',
    priceMonthly: 9999,
    priceAnnual: 95990,
    maxStudents: 5000,
    features: [
      'All Growth Plan Features',
      'Multi-Campus Centralized Administration',
      'Dedicated Account Manager & Training',
      'Priority Telecom DLT Route Allocation',
      'Custom White-Label Branding & Domain',
      '99.9% Uptime Guarantee & 24/7 SLA'
    ]
  }
];

// ============================================================================
// 1. PUBLIC: Get Subscription Plans & Pricing
// ============================================================================
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    currency: 'INR',
    currencySymbol: '₹',
    plans: PLANS
  });
});

// All following routes require authentication
router.use(authenticate);

// ============================================================================
// 2. GET /api/subscriptions/status - School Trial & Subscription Status
// ============================================================================
router.get('/status', (req, res) => {
  const schoolId = req.user.school_id || 1;
  const school = db.get(
    `SELECT id, code, name, display_name, email, phone, trial_starts_at, trial_ends_at,
            subscription_status, selected_plan, subscription_starts_at, subscription_ends_at,
            verified_payment_ref, billing_cycle
     FROM schools WHERE id = ?`,
    [schoolId]
  );

  if (!school) {
    return res.status(404).json({ success: false, error: 'School record not found.' });
  }

  const simulatedTime = req.headers['x-simulated-time'] || req.query.simulatedTime;
  const now = simulatedTime ? new Date(simulatedTime) : new Date();

  let daysRemaining = 0;
  let hoursRemaining = 0;
  let isTrialActive = false;
  let isTrialExpired = false;

  if (school.trial_ends_at) {
    const trialEnd = new Date(school.trial_ends_at);
    const msRemaining = trialEnd.getTime() - now.getTime();
    if (msRemaining > 0) {
      daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
      isTrialActive = true;
    } else {
      daysRemaining = 0;
      hoursRemaining = 0;
      isTrialExpired = true;
    }
  }

  // Derive dynamic effective status
  let effectiveStatus = school.subscription_status || 'TRIAL_ACTIVE';
  if (effectiveStatus !== 'ACTIVE_SUBSCRIPTION') {
    if (isTrialExpired) {
      effectiveStatus = 'TRIAL_EXPIRED';
    } else if (daysRemaining <= 3) {
      effectiveStatus = 'TRIAL_EXPIRING';
    } else {
      effectiveStatus = 'TRIAL_ACTIVE';
    }
  }

  // Fetch recent subscription history & invoices
  const invoices = db.query(
    `SELECT * FROM school_subscriptions WHERE school_id = ? ORDER BY created_at DESC LIMIT 10`,
    [schoolId]
  );

  // Fetch recent reminder emails sent
  const reminderLogs = db.query(
    `SELECT id, email_type, subject, delivery_status, sent_at
     FROM email_logs WHERE school_id = ? ORDER BY sent_at DESC LIMIT 10`,
    [schoolId]
  );

  res.json({
    success: true,
    schoolId: school.code || `SCH-${school.id}`,
    schoolName: school.name,
    subscriptionStatus: effectiveStatus,
    trial: {
      startsAt: school.trial_starts_at,
      endsAt: school.trial_ends_at,
      daysRemaining,
      hoursRemaining,
      isActive: isTrialActive && effectiveStatus !== 'ACTIVE_SUBSCRIPTION',
      isExpired: isTrialExpired && effectiveStatus !== 'ACTIVE_SUBSCRIPTION'
    },
    subscription: {
      planId: school.selected_plan || 'TRIAL',
      startsAt: school.subscription_starts_at,
      endsAt: school.subscription_ends_at,
      billingCycle: school.billing_cycle || 'MONTHLY',
      isPaid: effectiveStatus === 'ACTIVE_SUBSCRIPTION',
      verifiedPaymentRef: school.verified_payment_ref
    },
    invoices,
    reminderLogs
  });
});

// ============================================================================
// 3. POST /api/subscriptions/checkout - Initiate Plan Checkout
// ============================================================================
router.post('/checkout', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SCHOOL_ADMIN' && req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only School Administrators can manage subscriptions.' });
  }

  const { planId, billingCycle } = req.body;
  const cycle = (billingCycle || 'MONTHLY').toUpperCase();
  const plan = PLANS.find(p => p.id === (planId || '').toUpperCase());

  if (!plan) {
    return res.status(400).json({ success: false, error: 'Invalid subscription plan selected.' });
  }

  const amount = cycle === 'ANNUAL' ? plan.priceAnnual : plan.priceMonthly;
  const schoolId = req.user.school_id || 1;
  const school = db.get(`SELECT code, name FROM schools WHERE id = ?`, [schoolId]);

  const orderId = `SUB-ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  res.json({
    success: true,
    orderId,
    planId: plan.id,
    planName: plan.name,
    billingCycle: cycle,
    amount,
    currency: 'INR',
    schoolId: school?.code || `SCH-${schoolId}`,
    schoolName: school?.name || 'School Campus',
    gateway: 'SANDBOX',
    message: 'Subscription checkout session initiated. Submit transaction reference to verify.'
  });
});

// ============================================================================
// 4. POST /api/subscriptions/verify - Verify & Activate Paid Subscription
// ============================================================================
router.post('/verify', async (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SCHOOL_ADMIN' && req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only School Administrators can verify payments.' });
  }

  const { planId, billingCycle, transactionRef, paymentMethod } = req.body;
  const cycle = (billingCycle || 'MONTHLY').toUpperCase();
  const plan = PLANS.find(p => p.id === (planId || '').toUpperCase());

  if (!plan) {
    return res.status(400).json({ success: false, error: 'Invalid plan selected for verification.' });
  }

  const schoolId = req.user.school_id || 1;
  const school = db.get(`SELECT * FROM schools WHERE id = ?`, [schoolId]);
  if (!school) {
    return res.status(404).json({ success: false, error: 'School not found.' });
  }

  const now = new Date();
  const daysToAdd = cycle === 'ANNUAL' ? 365 : 30;
  const validUntil = new Date(now.getTime() + daysToAdd * 24 * 3600 * 1000);

  const amount = cycle === 'ANNUAL' ? plan.priceAnnual : plan.priceMonthly;
  const txRef = transactionRef || `TXN-SANDBOX-${Date.now()}`;
  const invoiceNo = `INV-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Update School Subscription State
  db.run(
    `UPDATE schools SET
      subscription_status = 'ACTIVE_SUBSCRIPTION',
      selected_plan = ?,
      billing_cycle = ?,
      subscription_starts_at = CURRENT_TIMESTAMP,
      subscription_ends_at = ?,
      verified_payment_ref = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [plan.id, cycle, validUntil.toISOString().replace('T', ' ').slice(0, 19), txRef, schoolId]
  );

  // 2. Insert into school_subscriptions record
  db.run(
    `INSERT INTO school_subscriptions (
      school_id, school_id_code, plan_id, plan_name, billing_cycle, amount, currency,
      status, subscription_starts_at, subscription_ends_at, payment_gateway,
      transaction_ref, payment_status, invoice_number, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'ACTIVE', CURRENT_TIMESTAMP, ?, ?, ?, 'PAID', ?, CURRENT_TIMESTAMP)`,
    [
      schoolId,
      school.code || `SCH-${school.id}`,
      plan.id,
      plan.name,
      cycle,
      amount,
      validUntil.toISOString().replace('T', ' ').slice(0, 19),
      paymentMethod || 'SANDBOX_GATEWAY',
      txRef,
      invoiceNo
    ]
  );

  // 3. Dispatch Email Receipt & Invoice
  await emailService.sendPaymentReceipt({
    schoolId: school.code || `SCH-${school.id}`,
    schoolDbId: school.id,
    schoolName: school.name,
    adminName: req.user.username,
    adminEmail: req.user.email || school.email,
    planName: plan.name,
    amount,
    invoiceNo,
    validUntil
  });

  auditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'SUBSCRIPTION_ACTIVATED',
    module: 'SUBSCRIPTION',
    recordId: schoolId,
    details: `Subscription activated for plan "${plan.name}" (${cycle}). Invoice: ${invoiceNo}`,
    ipAddress: req.ip
  });

  res.json({
    success: true,
    message: `Subscription successfully activated! Your school operations are fully unlocked until ${validUntil.toISOString().slice(0, 10)}.`,
    status: 'ACTIVE_SUBSCRIPTION',
    subscriptionStatus: 'ACTIVE_SUBSCRIPTION',
    planName: plan.name,
    invoiceNo,
    invoiceNumber: invoiceNo,
    validUntil: validUntil.toISOString(),
    transactionRef: txRef
  });
});

// ============================================================================
// 5. POST /api/subscriptions/run-reminders - Trigger Scheduled Reminders
// ============================================================================
router.all('/run-reminders', async (req, res) => {
  // Allow platform admin, school admin, or test suite to trigger
  const { simulatedTime } = req.body || req.query || {};
  const result = await reminderScheduler.runDailyReminderJob(simulatedTime ? new Date(simulatedTime) : null);
  res.json({
    success: true,
    jobResult: result,
    results: result?.details || []
  });
});

module.exports = router;
