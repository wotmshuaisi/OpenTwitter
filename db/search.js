// Advanced search with FTS5 and filters
const db = require('./connection');
const users = require('./users');

// Full-text search on posts using FTS5
function searchPosts(query) {
  // Use a subquery to find post IDs that match FTS5 search
  const ftsStmt = db.prepare(`
    SELECT p.* 
    FROM posts p
    INNER JOIN (
      SELECT _rowid_ as rowid
      FROM post_search
      WHERE post_search MATCH ?
    ) ps ON p.id = ps.rowid
    ORDER BY p.created_at DESC
    LIMIT 50
  `);
  return ftsStmt.all(query);
}

// Advanced search with filters
function advancedSearch({ query, userId, minReposts = 0, minLikes = 0, type = null }) {
  let whereClauses = [];
  let params = [];

  // FTS5 full-text search
  if (query) {
    whereClauses.push('(SELECT _rowid_ FROM post_search WHERE post_search MATCH ?) IN (SELECT id FROM posts)');
    params.push(query);
  }

  // Filter by type
  if (type && type !== 'all') {
    whereClauses.push("p.type = ?");
    params.push(type);
  }

  // Minimum reposts
  if (minReposts > 0) {
    whereClauses.push('(SELECT COUNT(*) FROM posts WHERE type = \'repost\' AND repost_of_id = p.id) >= ?');
    params.push(minReposts);
  }

  // Minimum likes
  if (minLikes > 0) {
    whereClauses.push('(SELECT COUNT(*) FROM posts WHERE type = \'quote\' AND repost_of_id = p.id) >= ?');
    params.push(minLikes);
  }

  // Exclude own posts (optional)
  if (userId) {
    whereClauses.push("p.user_id != ?");
    params.push(userId);
  }

  const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const stmt = db.prepare(`
    SELECT p.* 
    FROM posts p
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT 50
  `);

  return stmt.all(...params);
}

// Search users by query
function searchUsers(query) {
  const stmt = db.prepare(`
    SELECT id, username, display_name, bio, avatar_media_id
    FROM users
    WHERE username LIKE ? OR display_name LIKE ? OR bio LIKE ?
    LIMIT 20
  `);
  return stmt.all('%' + query + '%', '%' + query + '%', '%' + query + '%');
}

// Get search suggestions (autocomplete)
function getSearchSuggestions(query, limit = 5) {
  const stmt = db.prepare(`
    SELECT DISTINCT ps.username, ps.display_name
    FROM post_search ps
    INNER JOIN posts p ON ps._rowid_ = p.id
    WHERE post_search MATCH ?
    LIMIT ?
  `);
  return stmt.all(query, limit);
}

module.exports = {
  searchPosts,
  advancedSearch,
  searchUsers,
  getSearchSuggestions
};
