// CSRF Protection middleware
const crypto = require('crypto');

let csrfTokenStore = new Map();

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function validateCsrfToken(req, res, next) {
  // Skip CSRF check for GET requests and API routes
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }

  // Check for CSRF token in header or form field
  const token = req.headers['x-csrf-token'] || 
                (req.body && req.body['csrf_token']) ||
                (req.query && req.query.csrf_token);

  if (!token) {
    // Generate a new token and set it in the response for subsequent requests
    const newToken = generateCsrfToken();
    res.setHeader('x-csrf-token', newToken);
    
    // Store token temporarily (valid for 5 minutes)
    csrfTokenStore.set(req.sessionId, {
      token: newToken,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    return next();
  }

  // Validate token
  const stored = csrfTokenStore.get(req.sessionId);
  
  if (!stored || Date.now() > stored.expiresAt) {
    return res.status(403).json({ error: 'CSRF token expired' });
  }

  if (stored.token !== token) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

// Middleware to inject CSRF token into views
function injectCsrfToken(req, res, next) {
  // Set CSRF token in session
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  // Pass CSRF token to view
  res.locals.csrfToken = req.session.csrfToken;
  
  next();
}

module.exports = {
  validateCsrfToken,
  injectCsrfToken,
  csrfTokenStore,
  generateCsrfToken
};
