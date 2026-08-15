const db = require('./connection');

// Get recent activity for a user
function getRecentActivity(userId, limit = 10) {
  const stmt = db.prepare(`
    SELECT 
      CASE 
        WHEN e.event_type = 'post' THEN 'Posted a new message'
        WHEN e.event_type = 'follow' THEN 'Started following someone'
        WHEN e.event_type = 'message' THEN 'Sent a message'
        WHEN e.event_type = 'repost' THEN 'Reposted a message'
        ELSE e.event_type
      END as description,
      u.display_name as user_display_name,
      e.created_at
    FROM analytics_events e
    JOIN users u ON e.user_id = u.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit);
}

// Track an analytics event
function trackEvent(userId, eventType, properties) {
  const stmt = db.prepare(`
    INSERT INTO analytics_events (user_id, event_type, properties)
    VALUES (?, ?, ?)
  `);
  return stmt.run(userId, eventType, JSON.stringify(properties || {}));
}

// Get post analytics for a user
function getPostAnalytics(userId) {
  const stmt = db.prepare(`
    SELECT 
      p.id,
      p.body,
      (SELECT COUNT(*) FROM posts WHERE type = 'repost' AND repost_of_id = p.id) as reposts,
      (SELECT COUNT(*) FROM posts WHERE type = 'quote' AND repost_of_id = p.id) as likes
    FROM posts p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT 10
  `);
  return stmt.all(userId);
}

module.exports = {
  getRecentActivity,
  getPostAnalytics,
  trackEvent
};
