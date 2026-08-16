// Middleware to set current user in req object
function currentUser(req, res, next) {
  const sessionId = req.session.id;
  const users = require('../db/users');
  const notifications = require('../db/notifications');
  
  const user = users.findBySession(sessionId);
  
  if (user) {
    req.user = user;
    // Get unread notification count for the current user
    const unreadCount = notifications.getNotificationCount(user.id);
    res.locals.unreadCount = unreadCount;
  }
  
  next();
}

module.exports = currentUser;
