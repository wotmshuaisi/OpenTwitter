const session = require('express-session');

// Middleware to get current user from session
function requireAuth(req, res, next) {
  console.log('[requireAuth] req.sessionID:', req.sessionID);
  console.log('[requireAuth] req cookies:', req.cookies);
  const sessionId = req.sessionID;
  const users = require('../db/users');
  const user = users.findBySession(sessionId);
  console.log('[requireAuth] user found:', !!user, user ? user.username : '');
  console.log('[requireAuth] sessionId in DB:', users.findBySession(sessionId));
  
  if (!user) {
    console.log('[requireAuth] redirecting to /login');
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  
  req.user = user;
  next();
}

module.exports = requireAuth;
