const db = require('./connection');
const { users } = require('./users');

// Create a new post
function createPost(userId, body, type = 'post', repostOfId = null) {
  const stmt = db.prepare(`
    INSERT INTO posts (user_id, body, type, repost_of_id)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(userId, body, type, repostOfId);
}

// Create a post with media
function createPostMedia(userId, storageKey, body, type = 'post', repostOfId = null) {
  const stmt = db.prepare(`
    INSERT INTO posts (user_id, body, type, repost_of_id, media_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(userId, body, type, repostOfId, storageKey);
}

// Get post by ID
function getById(id) {
  const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
  const post = stmt.get(id);
  
  if (post) {
    // Get author
    const author = users.findById(post.user_id);
    post.author = author;
    return post;
  }
  
  return null;
}

// Get posts by user
function getPostsByUser(userId) {
  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId);
}

// Get all posts (for feed)
function getAllPosts(limit = 20, offset = 0) {
  const stmt = db.prepare(`
    SELECT * FROM posts
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(limit, offset);
}

// Get posts with pagination
function getPostsPaginated(limit = 20) {
  const stmt = db.prepare(`
    SELECT * FROM posts
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

// Get post for reply
function getPostForReply(postId) {
  const post = getById(postId);
  if (post) {
    post.author = users.findById(post.user_id);
  }
  return post;
}

// Get user's posts with pagination
function getUserPostsPaginated(userId, limit = 20) {
  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit);
}

// Get posts by user ID with mentions
function getUserPostsWithMentions(userId) {
  const posts = getPostsByUser(userId);
  return posts.map(post => {
    const mentions = require('./mentions').getMentions(post.id);
    return { ...post, mentions };
  });
}

// Get recent posts (for timeline)
function getRecentPosts(limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM posts
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

// Delete post
function deletePost(id) {
  const stmt = db.prepare(`
    UPDATE posts SET deleted_at = ? WHERE id = ?
  `);
  return stmt.run(new Date().toISOString(), id);
}

// Repost a post
function createRepost(userId, repostOfId) {
  const stmt = db.prepare(`
    INSERT INTO posts (user_id, body, type, repost_of_id)
    VALUES (?, NULL, 'repost', ?)
  `);
  return stmt.run(userId, repostOfId);
}

// Unrepost a post
function deleteRepost(userId, repostId) {
  const stmt = db.prepare(`
    DELETE FROM posts
    WHERE id = ? AND user_id = ? AND type = 'repost'
  `);
  return stmt.run(repostId, userId);
}

// Quote a post
function createQuote(userId, body, repostOfId) {
  const stmt = db.prepare(`
    INSERT INTO posts (user_id, body, type, repost_of_id)
    VALUES (?, ?, 'quote', ?)
  `);
  return stmt.run(userId, body, repostOfId);
}

// Unquote a post
function deleteQuote(userId, quoteId) {
  const stmt = db.prepare(`
    DELETE FROM posts
    WHERE id = ? AND user_id = ? AND type = 'quote'
  `);
  return stmt.run(quoteId, userId);
}

// Get post count
function getPostCount() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM posts');
  const result = stmt.get();
  return result ? result.count : 0;
}

// Get user's post count
function getUserPostCount(userId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?');
  const result = stmt.get(userId);
  return result ? result.count : 0;
}

// Get posts by user ID (for profile)
function getProfilePosts(userId) {
  const posts = getUserPostsWithMentions(userId);
  return posts.map(post => {
    post.author = users.findById(post.user_id);
    return post;
  });
}

// Search posts by query
function searchPosts(query) {
  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE body LIKE ?
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return stmt.all('%' + query + '%');
}

// Get post with full data
function getPostWithFullData(id) {
  const post = getById(id);
  if (!post) return null;
  
  post.author = users.findById(post.user_id);
  const mentions = require('./mentions').getMentions(id);
  post.mentions = mentions;
  
  return post;
}

module.exports = {
  createPost,
  createPostMedia,
  getById,
  getAllPosts,
  getPostsPaginated,
  getPostsByUser,
  getPostForReply,
  getUserPostsPaginated,
  getUserPostsWithMentions,
  getRecentPosts,
  deletePost,
  createRepost,
  deleteRepost,
  createQuote,
  deleteQuote,
  getPostCount,
  getUserPostCount,
  getProfilePosts,
  getPostWithFullData
};
