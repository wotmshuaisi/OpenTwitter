// Database performance optimizations - indexes and query improvements
const db = require('./connection');

// Create indexes for better query performance
function createIndexes() {
  const indexStatements = [
    // Posts table indexes
    `CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_type_user ON posts(type, user_id)`,
    
    // Follows table indexes
    `CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`,
    `CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_id)`,
    `CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at)`,
    
    // Notifications table indexes
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`,
    
    // Messages table indexes
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)`,
    
    // Analytics events table indexes
    `CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC)`,
    
    // Jobs table indexes
    `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at)`,
    
    // Sessions table indexes
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)`,
    
    // Media table indexes
    `CREATE INDEX IF NOT EXISTS idx_media_user ON media(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_media_type ON media(type)`,
    
    // Mentions table indexes
    `CREATE INDEX IF NOT EXISTS idx_mentions_post ON mentions(post_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id)`
  ];

  const results = [];
  indexStatements.forEach(stmt => {
    try {
      db.exec(stmt);
      results.push({ success: true, statement: stmt });
    } catch (error) {
      results.push({ success: false, statement: stmt, error: error.message });
    }
  });

  return results;
}

// Get database statistics
function getStats() {
  const tables = db.prepare("SELECT name as table_name, type as table_type FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY name").all();
  
  const tableInfo = db.prepare(`
    SELECT 
      sql.name as table_name,
      (SELECT COUNT(*) FROM posts WHERE user_id = sql.name) as row_count
    FROM sqlite_schema sql
    WHERE sql.type = 'table'
  `).all();

  return { tables: tableInfo };
}

// Optimize database (VACUUM)
function optimizeDatabase() {
  db.exec('VACUUM');
  return true;
}

module.exports = {
  createIndexes,
  getStats,
  optimizeDatabase
};
