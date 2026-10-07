const db = require('../database/db');

const auditService = {
  /**
   * Log an administrative or operational event
   * @param {Object} entry
   * @param {number|null} entry.userId
   * @param {string} entry.userRole
   * @param {string} entry.action
   * @param {string} entry.module
   * @param {string|number} [entry.recordId]
   * @param {string|Object} [entry.details]
   * @param {string} [entry.ipAddress]
   */
  log({ userId = null, userRole = 'SYSTEM', action, module, recordId = null, details = null, ipAddress = null }) {
    try {
      const detailsStr = typeof details === 'object' && details !== null ? JSON.stringify(details) : (details || '');
      db.run(
        `INSERT INTO audit_logs (user_id, user_role, action, module, record_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, userRole, action, module, recordId ? String(recordId) : null, detailsStr, ipAddress || '127.0.0.1']
      );
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  },

  /**
   * Query recent audit logs with pagination
   */
  getRecentLogs(limit = 100, offset = 0) {
    return db.query(
      `SELECT a.*, u.username, u.email
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }
};

module.exports = auditService;
