const session = require('express-session');

// Middleware to get current user from session
function requireAuth(req, res, next) {
  const sessionId = req.session.id;
  const user = require('../db/users').findBySession(sessionId);
  
  if (!user) {
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  
  req.user = user;
  next();
}

module.exports = requireAuth;
