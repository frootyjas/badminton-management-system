const rateLimit = require('express-rate-limit');

/**
 * Creates a rate limiting middleware with flexible options.
 * @param {number} windowMs - Time frame for rate limiting in milliseconds.
 * @param {number} limit - Maximum number of requests allowed within the specified time frame.
 * @returns {function} The configured rate limiting middleware.
 */
const createRateLimiter = (windowMs, limit) => {
  return rateLimit({
    windowMs, // Time frame for rate limiting
    max: limit, // Maximum number of requests per windowMs
    standardHeaders: true, // Add the `RateLimit-*` headers to the response
    legacyHeaders: false, // Remove the `X-RateLimit-*` headers from the response
    message: {
      success: false,
      code: 429,
      message: 'Too many requests, please try again later.'
    },
    keyGenerator: (req, res) => {
      // Check if user is authenticated and has an ID
      if (req.user && req.user.id) {
        return req.user.id; // Use user ID as the key for rate limiting
      } else {
        return req.ip; // Fall back to using the IP address if user is not authenticated
      }
    }
  });
};

module.exports = {
  createRateLimiter
};
