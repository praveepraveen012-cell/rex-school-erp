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
  log(arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    try {
      let userId = null;
      let userRole = 'SYSTEM';
      let action = 'GENERAL';
      let module = 'general';
      let recordId = null;
      let details = null;
      let ipAddress = '127.0.0.1';

      if (typeof arg1 === 'object' && arg1 !== null) {
        userId = arg1.userId || null;
        userRole = arg1.userRole || 'SYSTEM';
        action = arg1.action || 'GENERAL';
        module = arg1.module || 'general';
        recordId = arg1.recordId || null;
        details = arg1.details || null;
        ipAddress = arg1.ipAddress || '127.0.0.1';
      } else {
        userId = arg1 || null;
        userRole = arg2 || 'SYSTEM';
        action = arg3 || 'GENERAL';
        module = arg4 || 'general';
        recordId = arg5 || null;
        details = arg6 || null;
        ipAddress = arg7 || '127.0.0.1';
      }

      const detailsStr = typeof details === 'object' && details !== null ? JSON.stringify(details) : (details || '');
      db.run(
        `INSERT INTO audit_logs (user_id, user_role, action, module, record_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, userRole, action, module, recordId ? String(recordId) : null, detailsStr, ipAddress]
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
