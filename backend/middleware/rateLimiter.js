/**
 * In-memory sliding window rate limiter
 * Protects authentication and OTP endpoints against abuse
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 50, message = 'Too many requests. Please try again later.' }) {
  const requests = new Map();

  // Periodic cleanup of stale entries
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requests.entries()) {
      const active = timestamps.filter(t => now - t < windowMs);
      if (active.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, active);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const timestamps = requests.get(ip) || [];

    const recent = timestamps.filter(t => now - t < windowMs);

    // Generous limits for local testing/dev
    const effectiveMax = (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') ? 500 : max;

    if (recent.length >= effectiveMax) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterMinutes: Math.ceil(windowMs / (60 * 1000))
      });
    }

    recent.push(now);
    requests.set(ip, recent);
    next();
  };
}

module.exports = {
  authLimiter: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 attempts per 5 mins
    message: 'Too many authentication attempts. Please try again after 5 minutes.'
  }),
  otpLimiter: createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 10, // 10 OTP requests per 5 mins
    message: 'Too many OTP requests. Please wait before requesting another OTP.'
  })
};
