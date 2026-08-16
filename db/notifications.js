// Notifications database module
const db = require('./connection');

// Create a new notification
exports.createNotification = (userId, type, sourceUserId, postId, message) => {
  const stmt = db.prepare(`
    INSERT INTO notifications (user_id, type, source_user_id, post_id, message)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  return stmt.run(userId, type, sourceUserId, postId, message);
};

// Get unread notifications for a user
exports.getUnreadNotifications = (userId) => {
  const stmt = db.prepare(`
    SELECT n.*, u.username as source_username, p.body as post_body
    FROM notifications n
    LEFT JOIN users u ON n.source_user_id = u.id
    LEFT JOIN posts p ON n.post_id = p.id
    WHERE n.user_id = ? AND n.is_read = FALSE
    ORDER BY n.created_at DESC
  `);
  
  return stmt.all(userId);
};

// Get all notifications for a user (paginated)
exports.getNotifications = (userId, limit = 20, offset = 0) => {
  const stmt = db.prepare(`
    SELECT n.*, u.username as source_username, p.body as post_body
    FROM notifications n
    LEFT JOIN users u ON n.source_user_id = u.id
    LEFT JOIN posts p ON n.post_id = p.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  return stmt.all(userId, limit, offset);
};

// Mark a notification as read
exports.markAsRead = (notificationId) => {
  const stmt = db.prepare(`
    UPDATE notifications 
    SET is_read = TRUE 
    WHERE id = ?
  `);
  
  return stmt.run(notificationId);
};

// Mark all notifications for a user as read
exports.markAllAsRead = (userId) => {
  const stmt = db.prepare(`
    UPDATE notifications 
    SET is_read = TRUE 
    WHERE user_id = ? AND is_read = FALSE
  `);
  
  return stmt.run(userId);
};

// Get notification count for a user
exports.getNotificationCount = (userId) => {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM notifications 
    WHERE user_id = ? AND is_read = FALSE
  `);
  
  const result = stmt.get(userId);
  return result.count;
};