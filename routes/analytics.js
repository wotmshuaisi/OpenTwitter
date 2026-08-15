const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { users } = require('../db/users');
const { posts } = require('../db/posts');
const { messages } = require('../db/messages');
const { follows } = require('../db/follows');
const { analytics } = require('../db/analytics');

// Dashboard view
router.get('/', requireAuth, (req, res) => {
  try {
    // Get user stats
    const userId = req.user.id;
    const user = users.findById(userId);
    
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
    
    res.render('analytics/dashboard', {
      title: 'Dashboard',
      user,
      postCount,
      followerCount,
      followingCount,
      messageCount,
      recentActivity,
      postAnalytics
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('analytics/dashboard', {
      title: 'Dashboard',
      error: 'An error occurred while loading the dashboard'
    });
  }
});

// API endpoint for dashboard data
router.get('/api', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    
    const postCount = posts.getUserPostCount(userId);
    const followerCount = follows.listFollowers(userId).length;
    const followingCount = follows.listFollowing(userId).length;
    const messageCount = messages.getMessagesByUser(userId).length;
    
    const recentActivity = analytics.getRecentActivity(userId, 10);
    const postAnalytics = analytics.getPostAnalytics(userId);
    
    res.json({
      user: {
        id: userId,
        username: req.user.username,
        display_name: req.user.display_name
      },
      stats: {
        posts: postCount,
        followers: followerCount,
        following: followingCount,
        messages: messageCount
      },
      recentActivity,
      postAnalytics
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
