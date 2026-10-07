const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');

router.use(authenticate, requireSuperAdmin);

// ----------------------------------------------------------------------------
// GET /api/audit-logs - Super Admin query audit history
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = parseInt(req.query.offset, 10) || 0;
  const { module, action } = req.query;

  let sql = `
    SELECT a.*, u.username, u.email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (module) {
    sql += ` AND a.module = ?`;
    params.push(module);
  }
  if (action) {
    sql += ` AND a.action = ?`;
    params.push(action);
  }

  sql += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const logs = db.query(sql, params);
  const totalCount = db.get(`SELECT COUNT(*) as count FROM audit_logs`).count;

  return res.json({
    success: true,
    total: totalCount,
    limit,
    offset,
    logs
  });
});

module.exports = router;
