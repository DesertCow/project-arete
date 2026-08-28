const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

const rateLimitedBody = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
};

const apiLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedBody,
});

// Tighter than the global limiter — these endpoints are the brute-force target.
const authLimiter = rateLimit({
  windowMs,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedBody,
});

module.exports = { apiLimiter, authLimiter };
