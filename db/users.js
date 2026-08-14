const db = require('./connection');
const bcrypt = require('bcrypt');

// Create a new user
function create(userId, email, username, password, display_name, bio, location, website) {
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const stmt = db.prepare(`
    INSERT INTO users (id, email, username, password_hash, display_name, bio, location, website, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  return stmt.run(userId, email, username, hashedPassword, display_name, bio, location, website);
}

// Get user by ID
function findById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
}

// Get user by email
function findByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

// Get user by username
function findByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username);
}

// Get user by session ID
function findBySessionId(sessionId) {
  const stmt = db.prepare('SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.session_id = ?');
  return stmt.get(sessionId);
}

// Update user profile
function updateProfile(userId, fields) {
  const updateFields = Object.entries(fields)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key} = ?`);
  
  const values = [...Object.values(fields)];
  values.push(userId);
  
  const stmt = db.prepare(`
    UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
  `);
  return stmt.run(values);
}

// Update avatar
function updateAvatar(userId, mediaId) {
  const stmt = db.prepare('UPDATE users SET avatar_media_id = ? WHERE id = ?');
  return stmt.run(mediaId, userId);
}

// Update header image
function updateHeaderImage(userId, mediaId) {
  const stmt = db.prepare('UPDATE users SET header_media_id = ? WHERE id = ?');
  return stmt.run(mediaId, userId);
}

// Verify password
function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Get user with stats
function getUserWithStats(userId) {
  const user = findById(userId);
  if (!user) return null;
  
  const followerCount = require('./users').getFollowerCount(userId);
  const followingCount = require('./users').getFollowingCount(userId);
  
  return {
    ...user,
    followerCount,
    followingCount
  };
}

// Get user with followers
function getUserWithFollowers(userId) {
  const user = findById(userId);
  if (!user) return null;
  
  const followers = require('./users').getFollowers(userId);
  
  return {
    ...user,
    followers
  };
}

// Get user with following
function getUserWithFollowing(userId) {
  const user = findById(userId);
  if (!user) return null;
  
  const following = require('./users').getFollowing(userId);
  
  return {
    ...user,
    following
  };
}

// Get all users
function getAllUsers() {
  const stmt = db.prepare('SELECT * FROM users');
  return stmt.all();
}

// Get all users except one (for feed)
function getAllUsersExcept(userId) {
  const stmt = db.prepare('SELECT * FROM users WHERE id != ?');
  return stmt.all(userId);
}

// Create session
function createSession(userId, sessionId) {
  const stmt = db.prepare('INSERT INTO sessions (user_id, session_id, expires_at) VALUES (?, ?, ?)');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return stmt.run(userId, sessionId, expiresAt.toISOString());
}

// Delete session
function deleteSession(sessionId) {
  const stmt = db.prepare('DELETE FROM sessions WHERE session_id = ?');
  return stmt.run(sessionId);
}

// Get session by ID
function getSessionById(sessionId) {
  const stmt = db.prepare('SELECT * FROM sessions WHERE session_id = ?');
  return stmt.get(sessionId);
}

// Check if session is valid
function isSessionValid(sessionId) {
  const session = getSessionById(sessionId);
  return session && new Date(session.expires_at) > new Date();
}

// Get user display name
function getDisplayName(userId) {
  const user = findById(userId);
  return user ? user.display_name : null;
}

// Get follower count
function getFollowerCount(userId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM follows WHERE followed_id = ?');
  const result = stmt.get(userId);
  return result ? result.count : 0;
}

// Get following count
function getFollowingCount(userId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?');
  const result = stmt.get(userId);
  return result ? result.count : 0;
}

// Check if user is followed
function isUserFollowed(user1Id, user2Id) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND followed_id = ?');
  const result = stmt.get(user1Id, user2Id);
  return result && result.count > 0;
}

// Get user's followers list
function getFollowersList(userId) {
  const stmt = db.prepare(`
    SELECT u.* FROM users u
    JOIN follows f ON u.id = f.follower_id
    WHERE f.followed_id = ?
  `);
  return stmt.all(userId);
}

// Get user's following list
function getFollowingList(userId) {
  const stmt = db.prepare(`
    SELECT u.* FROM users u
    JOIN follows f ON u.id = f.followed_id
    WHERE f.follower_id = ?
  `);
  return stmt.all(userId);
}

// Get users by username
function getUsersByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username LIKE ?');
  return stmt.all(`%${username}%`);
}

// Get user count
function getUserCount() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = stmt.get();
  return result ? result.count : 0;
}

module.exports = {
  create,
  findById,
  findByEmail,
  findByUsername,
  findBySessionId,
  updateProfile,
  updateAvatar,
  updateHeaderImage,
  verifyPassword,
  getUserWithStats,
  getUserWithFollowers,
  getUserWithFollowing,
  getAllUsers,
  getAllUsersExcept,
  createSession,
  deleteSession,
  getSessionById,
  isSessionValid,
  getDisplayName,
  getFollowerCount,
  getFollowingCount,
  isUserFollowed,
  getFollowersList,
  getFollowingList,
  getUsersByUsername,
  getUserCount
};
