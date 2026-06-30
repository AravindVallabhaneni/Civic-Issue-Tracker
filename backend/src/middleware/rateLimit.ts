import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * Rate limiter for report submission — prevent spam.
 * 10 reports per 15 minutes per IP by default.
 */
export const reportRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many reports submitted. Please wait before trying again.',
    code: 'RATE_LIMITED',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000 / 60),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * General API rate limit — more lenient
 */
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: 'Too many requests. Please slow down.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
