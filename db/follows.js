const db = require('./connection');
const notifications = require('./notifications');

// Add a follow relationship
function addFollow(followerId, followedId) {
  const stmt = db.prepare('INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)');
  const result = stmt.run(followerId, followedId);
  
  // Create notification for the followed user
  notifications.createNotification(
    followedId,
    'follow',
    followerId,
    null,
    null
  );
  
  return result;
}

// Remove a follow relationship
function removeFollow(followerId, followedId) {
  const stmt = db.prepare('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?');
  return stmt.run(followerId, followedId);
}

// Check if user is following another user
function isFollowing(followerId, followedId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND followed_id = ?');
  const result = stmt.get(followerId, followedId);
  return result ? result.count > 0 : false;
}

// Get followers of a user
function getFollowers(user_id) {
  const stmt = db.prepare('SELECT * FROM follows WHERE followed_id = ?');
  return stmt.all(user_id);
}

// Get following list of a user
function getFollowing(user_id) {
  const stmt = db.prepare('SELECT * FROM follows WHERE follower_id = ?');
  return stmt.all(user_id);
}

// Get all follows
function getAllFollows() {
  const stmt = db.prepare('SELECT * FROM follows');
  return stmt.all();
}

// Get follow count
function getFollowCount(user_id) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?');
  const result = stmt.get(user_id);
  return result ? result.count : 0;
}

// Get followee count
function getFolloweeCount(user_id) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM follows WHERE followed_id = ?');
  const result = stmt.get(user_id);
  return result ? result.count : 0;
}

// Get follow count between two users
function getFollowCountBetween(user1Id, user2Id) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM follows WHERE (follower_id = ? AND followed_id = ?) OR (follower_id = ? AND followed_id = ?)');
  const result = stmt.get(user1Id, user2Id, user2Id, user1Id);
  return result ? result.count : 0;
}

// Get mutual follows
function getMutualFollows(user1Id, user2Id) {
  const stmt = db.prepare(`
    SELECT f1.* FROM follows f1
    JOIN follows f2 ON f1.follower_id = f2.followed_id
    WHERE f1.followed_id = ? AND f2.follower_id = ?
  `);
  return stmt.all(user1Id, user2Id);
}

// Get following list with stats
function getFollowingWithStats(user_id) {
  const following = getFollowing(user_id);
  const result = following.map(follow => {
    const targetUser = require('./users').findById(follow.followed_id);
    return {
      ...targetUser,
      followerCount: require('./users').getFollowerCount(follow.followed_id),
      followingCount: require('./users').getFollowingCount(follow.followed_id)
    };
  });
  return result;
}

// Get followers list with stats
function getFollowersWithStats(user_id) {
  const followers = getFollowers(user_id);
  const result = followers.map(follow => {
    const targetUser = require('./users').findById(follow.follower_id);
    return {
      ...targetUser,
      followerCount: require('./users').getFollowerCount(follow.follower_id),
      followingCount: require('./users').getFollowingCount(follow.follower_id)
    };
  });
  return result;
}

module.exports = {
  addFollow,
  removeFollow,
  isFollowing,
  getFollowers,
  getFollowing,
  getAllFollows,
  getFollowCount,
  getFolloweeCount,
  getFollowCountBetween,
  getMutualFollows,
  getFollowingWithStats,
  getFollowersWithStats
};
