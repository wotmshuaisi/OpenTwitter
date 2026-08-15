// Middleware to set current user in req object
function currentUser(req, res, next) {
  const sessionId = req.session.id;
  const user = require('../db/users').findBySession(sessionId);
  
  if (user) {
    req.user = user;
  }
  
  next();
}

module.exports = currentUser;
