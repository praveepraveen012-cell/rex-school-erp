/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces allowed roles for protected routes
 * @param {string|string[]} roles - Allowed role or array of allowed roles
 */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Insufficient permissions for role: ${req.user.role}`,
        allowedRoles: allowed
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireSuperAdmin: requireRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN']),
  requireSchoolAdmin: requireRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN']),
  requireTeacher: requireRole('TEACHER'),
  requireParent: requireRole('PARENT'),
  requireStaff: requireRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN', 'TEACHER'])
};
