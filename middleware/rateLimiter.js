// Rate limiting middleware
const rateLimitMap = new Map();

function getRateLimitKey(req) {
  const ip = req.ip || req.connection.remoteAddress;
  return `rate_limit:${ip}`;
}

function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 100,
    message = 'Too many requests, please try again later.'
  } = options;

  return function rateLimiter(req, res, next) {
    const key = getRateLimitKey(req);
    const now = Date.now();

    // Get or create rate limit data
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, {
        requests: [],
        windowStart: now
      });
    }

    const data = rateLimitMap.get(key);

    // Clean old requests outside the window
    data.requests = data.requests.filter(timestamp => now - timestamp < windowMs);

    // Check if limit exceeded
    if (data.requests.length >= maxRequests) {
      return res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil((windowMs - (now - data.requests[0])) / 1000)
      });
    }

    // Add current request
    data.requests.push(now);

    next();
  };
}

// Create different rate limiters for different endpoints
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30
});

const postRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10
});

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20
});

module.exports = {
  rateLimitMap,
  apiRateLimiter,
  postRateLimiter,
  authRateLimiter
};
