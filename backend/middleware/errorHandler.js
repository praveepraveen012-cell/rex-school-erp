const config = require('../config/env');

/**
 * Global Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  // Default error status & message
  const status = err.status || err.statusCode || 500;
  const message = err.isOperational || config.isDev
    ? err.message || 'An error occurred while processing your request.'
    : 'Internal server error. Please try again later.';

  res.status(status).json({
    success: false,
    error: message,
    ...(config.isDev && err.stack ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
