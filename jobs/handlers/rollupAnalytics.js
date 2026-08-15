const { analytics } = require('../../db/analytics');
const { users } = require('../../db/users');
const { posts } = require('../../db/posts');
const { follows } = require('../../db/follows');
const { messages } = require('../../db/messages');

// Rollup analytics data for a user
async function rollupAnalytics(userId) {
  try {
    const user = users.findById(userId);
    if (!user) return;
    
    // Get post count
    const postCount = posts.getUserPostCount(userId);
    
    // Get follower count
    const followers = follows.listFollowers(userId);
    const followerCount = followers ? followers.length : 0;
    
    // Get following count
    const following = follows.listFollowing(userId);
    const followingCount = following ? following.length : 0;
    
    // Get message count
    const messagesList = messages.getMessagesByUser(userId);
    const messageCount = messagesList ? messagesList.length : 0;
    
    // Get recent activity
    const recentActivity = analytics.getRecentActivity(userId, 10);
    
    // Get post analytics
    const postAnalytics = analytics.getPostAnalytics(userId);
    
    // Store analytics data
    const analyticsData = {
      user: user,
      postCount,
      followerCount,
      followingCount,
      messageCount,
      recentActivity,
      postAnalytics
    };
    
    console.log('Analytics rolled up for user:', userId);
    return analyticsData;
  } catch (error) {
    console.error('Error rolling up analytics:', error);
  }
}

module.exports = {
  rollupAnalytics
};
