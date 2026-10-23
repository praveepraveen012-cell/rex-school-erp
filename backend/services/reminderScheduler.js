/**
 * Grexotix School Management Platform - Automated Reminder Scheduler
 * Checks all tenant schools for:
 *  - 3-day trial expiry
 *  - 1-day trial expiry
 *  - Trial expiration & automatic status lockdown
 *  - Subscription renewal alerts
 * Operates on the server independently of browser or mobile clients.
 */

const db = require('../database/db');
const emailService = require('./emailService');

class ReminderScheduler {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
  }

  /**
   * Run the full reminder & lifecycle evaluation job
   * @param {Date} [simulatedNow] Optional custom timestamp for testing/verification
   */
  async runDailyReminderJob(simulatedNow = null) {
    if (this.isRunning) {
      return { skipped: true, reason: 'Job already running' };
    }
    this.isRunning = true;

    const now = simulatedNow ? new Date(simulatedNow) : new Date();
    const results = {
      timestamp: now.toISOString(),
      schoolsEvaluated: 0,
      remindersSent: 0,
      remindersSkipped: 0,
      statusUpdatedCount: 0,
      details: []
    };

    try {
      const schools = db.query(
        `SELECT s.id, s.code, s.name, s.email, s.trial_starts_at, s.trial_ends_at,
                s.subscription_status, s.selected_plan, s.subscription_ends_at,
                u.email as admin_email, u.username as admin_username, u.mobile as admin_mobile
         FROM schools s
         LEFT JOIN users u ON u.school_id = s.id AND u.role IN ('SCHOOL_ADMIN', 'SUPER_ADMIN')
         WHERE s.status = 'ACTIVE'
         GROUP BY s.id`
      );

      results.schoolsEvaluated = schools.length;

      for (const school of schools) {
        const adminEmail = school.admin_email || school.email;
        const adminName = school.admin_username || 'School Administrator';
        const schoolCode = school.code || `SCH-${school.id}`;

        // 1. Check Paid Active Subscription Expiry
        if (school.subscription_status === 'ACTIVE_SUBSCRIPTION') {
          if (school.subscription_ends_at) {
            const subEnd = new Date(school.subscription_ends_at);
            if (now > subEnd) {
              db.run(
                `UPDATE schools SET subscription_status = 'SUBSCRIPTION_EXPIRED' WHERE id = ?`,
                [school.id]
              );
              results.statusUpdatedCount++;
              results.details.push({
                schoolId: schoolCode,
                action: 'SUBSCRIPTION_EXPIRED'
              });
            }
          }
          continue; // School has paid status (or just expired paid subscription)
        }

        // 2. Check Trial Countdown
        if (!school.trial_ends_at) {
          continue;
        }

        const trialEnd = new Date(school.trial_ends_at);
        const msRemaining = trialEnd.getTime() - now.getTime();
        const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);

        if (daysRemaining <= 0) {
          // Trial has EXPIRED
          if (school.subscription_status !== 'TRIAL_EXPIRED') {
            db.run(
              `UPDATE schools SET subscription_status = 'TRIAL_EXPIRED' WHERE id = ?`,
              [school.id]
            );
            results.statusUpdatedCount++;
          }

          const sendRes = await emailService.sendTrialExpired({
            schoolId: schoolCode,
            schoolDbId: school.id,
            schoolName: school.name,
            adminName,
            adminEmail
          });

          if (sendRes && !sendRes.skipped) {
            results.remindersSent++;
            results.details.push({ schoolId: schoolCode, type: 'TRIAL_EXPIRED', status: 'SENT' });
          } else {
            results.remindersSkipped++;
          }
        } else if (daysRemaining <= 1.0) {
          // Exactly 1 day remaining (urgent)
          if (school.subscription_status !== 'TRIAL_EXPIRING') {
            db.run(
              `UPDATE schools SET subscription_status = 'TRIAL_EXPIRING' WHERE id = ?`,
              [school.id]
            );
            results.statusUpdatedCount++;
          }

          const sendRes = await emailService.sendTrialExpiring1Day({
            schoolId: schoolCode,
            schoolDbId: school.id,
            schoolName: school.name,
            adminName,
            adminEmail,
            trialEndsAt: school.trial_ends_at
          });

          if (sendRes && !sendRes.skipped) {
            results.remindersSent++;
            results.details.push({ schoolId: schoolCode, type: 'TRIAL_EXPIRING_1DAY', status: 'SENT' });
          } else {
            results.remindersSkipped++;
          }
        } else if (daysRemaining <= 3.0) {
          // 3 days remaining (reminder)
          if (school.subscription_status !== 'TRIAL_EXPIRING') {
            db.run(
              `UPDATE schools SET subscription_status = 'TRIAL_EXPIRING' WHERE id = ?`,
              [school.id]
            );
            results.statusUpdatedCount++;
          }

          const sendRes = await emailService.sendTrialExpiring3Days({
            schoolId: schoolCode,
            schoolDbId: school.id,
            schoolName: school.name,
            adminName,
            adminEmail,
            trialEndsAt: school.trial_ends_at
          });

          if (sendRes && !sendRes.skipped) {
            results.remindersSent++;
            results.details.push({ schoolId: schoolCode, type: 'TRIAL_EXPIRING_3DAYS', status: 'SENT' });
          } else {
            results.remindersSkipped++;
          }
        }
      }
    } catch (err) {
      console.error('Error in reminder scheduler job:', err);
      results.error = err.message;
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  /**
   * Start recurring background timer (every 6 hours)
   */
  start(intervalMs = 6 * 3600 * 1000) {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => {
      this.runDailyReminderJob().catch(e => console.error('Scheduled reminder error:', e));
    }, intervalMs);
    // Unref so process can exit cleanly during tests if needed
    if (this.intervalHandle.unref) this.intervalHandle.unref();
  }

  /**
   * Stop recurring timer
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

module.exports = new ReminderScheduler();
