const db = require('./connection');
const posts = require('./posts');
const follows = require('./follows');
const users = require('./users');
const messages = require('./messages');

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
      (SELECT COUNT(*) FROM posts WHERE type = 'quote' AND repost_of_id = p.id) as likes,
      p.created_at
    FROM posts p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT 10
  `);
  return stmt.all(userId);
}

// Get user growth metrics
function getUserGrowth(userId, days = 30) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceTimestamp = sinceDate.toISOString().split('T')[0];

  // Get follower count over time
  const stmt = db.prepare(`
    SELECT 
      COUNT(DISTINCT f.follower_id) as followers_at_date,
      MAX(f.created_at) as date
    FROM follows f
    WHERE f.followed_id = ?
      AND f.created_at >= datetime(?)
    GROUP BY date(f.created_at)
    ORDER BY date ASC
  `);
  
  try {
    const results = stmt.all(userId, sinceTimestamp);
    return results.map(r => ({
      followers_at_date: r.followers_at_date,
      date: r.date
    }));
  } catch (error) {
    console.error('User growth query error:', error.message);
    return [];
  }
}

// Get recent followers
function getRecentFollowers(userId, limit = 10) {
  const stmt = db.prepare(`
    SELECT u.id, u.username, u.display_name, f.created_at
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.followed_id = ?
    ORDER BY f.created_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit);
}

// Get post engagement stats
function getPostEngagementStats() {
  const stmt = db.prepare(`
    SELECT 
      p.id,
      p.user_id,
      p.created_at,
      (SELECT COUNT(*) FROM posts WHERE type = 'repost' AND repost_of_id = p.id) as reposts,
      (SELECT COUNT(*) FROM posts WHERE type = 'quote' AND repost_of_id = p.id) as likes
    FROM posts p
    ORDER BY p.created_at DESC
    LIMIT 50
  `);
  return stmt.all();
}

// Get top posts by engagement
function getTopPosts(limit = 10) {
  const stmt = db.prepare(`
    SELECT 
      p.id,
      p.user_id,
      p.body,
      (SELECT COUNT(*) FROM posts WHERE type = 'repost' AND repost_of_id = p.id) as reposts,
      (SELECT COUNT(*) FROM posts WHERE type = 'quote' AND repost_of_id = p.id) as likes
    FROM posts p
    ORDER BY reposts DESC, likes DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

// Get user's total stats
function getUserStats(userId) {
  const postCount = posts.getUserPostCount(userId);
  const followerCount = follows.getFollowers(userId).length;
  const followingCount = follows.getFollowing(userId).length;
  const messageCount = messages.getUserMessageCount(userId);

  return {
    posts: postCount,
    followers: followerCount,
    following: followingCount,
    messages: messageCount
  };
}

module.exports = {
  getRecentActivity,
  trackEvent,
  getPostAnalytics,
  getUserGrowth,
  getRecentFollowers,
  getPostEngagementStats,
  getTopPosts,
  getUserStats
};
