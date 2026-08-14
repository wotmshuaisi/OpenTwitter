const db = require('./connection');

// Create a new media record
function createMediaRow(type, userId, storageKey, mime, status = 'processing') {
  const stmt = db.prepare(`
    INSERT INTO media (type, user_id, storage_key, mime_type, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(type, userId, storageKey, mime, status);
}

// Get media by ID
function getById(id) {
  const stmt = db.prepare('SELECT * FROM media WHERE id = ?');
  return stmt.get(id);
}

// Get media by user ID
function getByUserId(userId, type = null) {
  if (type) {
    const stmt = db.prepare('SELECT * FROM media WHERE user_id = ? AND type = ?');
    return stmt.all(userId, type);
  }
  const stmt = db.prepare('SELECT * FROM media WHERE user_id = ?');
  return stmt.all(userId);
}

// Get avatar media for user
function getAvatar(userId) {
  const stmt = db.prepare('SELECT * FROM media WHERE user_id = ? AND type = ?');
  return stmt.get(userId, 'avatar');
}

// Get header media for user
function getHeader(userId) {
  const stmt = db.prepare('SELECT * FROM media WHERE user_id = ? AND type = ?');
  return stmt.get(userId, 'header');
}

// Get post media by ID
function getPostMedia(postId) {
  const stmt = db.prepare('SELECT m.*, p.body as original_body FROM media m JOIN posts p ON m.storage_key = p.storage_key WHERE m.id = ?');
  return stmt.get(postId);
}

// Get message media by ID
function getMessageMedia(messageId) {
  const stmt = db.prepare('SELECT * FROM media WHERE id = ?');
  return stmt.get(messageId);
}

// Update media status
function updateStatus(id, status) {
  const stmt = db.prepare('UPDATE media SET status = ? WHERE id = ?');
  return stmt.run(status, id);
}

// Delete media
function deleteMedia(id) {
  const stmt = db.prepare('DELETE FROM media WHERE id = ?');
  return stmt.run(id);
}

// Get media count
function getMediaCount() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM media');
  const result = stmt.get();
  return result ? result.count : 0;
}

// Get media by type
function getByType(type) {
  const stmt = db.prepare('SELECT * FROM media WHERE type = ?');
  return stmt.all(type);
}

// Get media with thumbnail status
function getMediaWithThumbnailStatus(id) {
  const stmt = db.prepare(`
    SELECT m.*, 
    CASE 
      WHEN m.status = 'complete' THEN 1
      WHEN m.status = 'thumbnail_generated' THEN 1
      ELSE 0
    END as has_thumbnail
    FROM media m
    WHERE m.id = ?
  `);
  return stmt.get(id);
}

// Get all media for a user
function getAllMedia(userId) {
  const stmt = db.prepare(`
    SELECT * FROM media WHERE user_id = ?
  `);
  return stmt.all(userId);
}

module.exports = {
  createMediaRow,
  getById,
  getByUserId,
  getAvatar,
  getHeader,
  getPostMedia,
  getMessageMedia,
  updateStatus,
  deleteMedia,
  getMediaCount,
  getByType,
  getMediaWithThumbnailStatus,
  getAllMedia
};
