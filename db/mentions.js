const db = require('./connection');

// Get mentions for a post
function getMentions(postId) {
  const stmt = db.prepare(`
    SELECT * FROM mentions WHERE post_id = ?
  `);
  return stmt.all(postId);
}

// Add mention to a post
function addMention(postId, userId) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO mentions (post_id, mentioned_user_id)
    VALUES (?, ?)
  `);
  return stmt.run(postId, userId);
}

// Remove mention from a post
function removeMention(postId, userId) {
  const stmt = db.prepare(`
    DELETE FROM mentions WHERE post_id = ? AND mentioned_user_id = ?
  `);
  return stmt.run(postId, userId);
}

// Get all mentions for a user
function getUserMentions(userId) {
  const stmt = db.prepare(`
    SELECT * FROM mentions
    WHERE mentioned_user_id = ?
  `);
  return stmt.all(userId);
}

// Add or update mention
function updateMention(postId, userId) {
  const existing = getMentions(postId).find(m => m.mentioned_user_id === userId);
  
  if (existing) {
    if (userId === existing.mentioned_user_id) {
      const stmt = db.prepare(`
        UPDATE mentions SET last_read_message_id = 0 WHERE post_id = ? AND mentioned_user_id = ?
      `);
      return stmt.run(postId, userId);
    }
    return existing;
  }
  
  const stmt = db.prepare(`
    INSERT INTO mentions (post_id, mentioned_user_id)
    VALUES (?, ?)
  `);
  return stmt.run(postId, userId);
}

// Parse mentions from body text
function parseMentions(body, userId) {
  const matches = body.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  
  return matches.map(match => {
    const username = match.slice(1);
    const user = require('./users').findByUsername(username);
    if (user) {
      return addMention(match, user.id);
    }
    return null;
  }).filter(Boolean);
}

// Format mention as HTML
function formatMentionHTML(mention) {
  return `<a href="/u/${mention.mentioned_user_id}" style="color:var(--accent-color);text-decoration:none;">@${mention.mentioned_user_id}</a>`;
}

// Get unique mentions for a post
function getUniqueMentions(postId) {
  const mentions = getMentions(postId);
  const unique = new Map();
  
  mentions.forEach(m => {
    if (!unique.has(m.mentioned_user_id)) {
      unique.set(m.mentioned_user_id, m);
    }
  });
  
  return Array.from(unique.values());
}

// Get mention count for a post
function getMentionCount(postId) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM mentions WHERE post_id = ?
  `);
  const result = stmt.get(postId);
  return result ? result.count : 0;
}

module.exports = {
  getMentions,
  addMention,
  removeMention,
  getUserMentions,
  updateMention,
  parseMentions,
  formatMentionHTML,
  getUniqueMentions,
  getMentionCount
};
