const express = require('express');
const router = express.Router();
const analytics = require('../db/analytics');
const posts = require('../db/posts');

// Dashboard view
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user stats
    const user = require('../db/users').findById(userId);
    
    // Get post count
    const postCount = posts.getUserPostCount(userId);
    
    // Get follower count
    const followers = require('../db/follows').listFollowers(userId);
    const followerCount = followers ? followers.length : 0;
    
    // Get following count
    const following = require('../db/follows').listFollowing(userId);
    const followingCount = following ? following.length : 0;
    
    // Get message count
    const messagesList = require('../db/messages').getUserMessages(userId);
    const messageCount = messagesList ? messagesList.length : 0;
    
    // Get recent activity
    const recentActivity = analytics.getRecentActivity(userId, 10);
    
    // Get post analytics
    const postAnalytics = analytics.getPostAnalytics(userId);
    
    // Get user growth (last 7 days)
    const userGrowth = analytics.getUserGrowth(userId, 7);
    
    // Get recent followers
    const recentFollowers = analytics.getRecentFollowers(userId, 5);
    
    res.render('analytics/dashboard', {
      title: 'Dashboard',
      user,
      postCount,
      followerCount,
      followingCount,
      messageCount,
      recentActivity,
      postAnalytics,
      userGrowth,
      recentFollowers
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
router.get('/api', (req, res) => {
  try {
    const userId = req.user.id;
    
    const postCount = posts.getUserPostCount(userId);
    const followerCount = require('../db/follows').listFollowers(userId).length;
    const followingCount = require('../db/follows').listFollowing(userId).length;
    const messageCount = require('../db/messages').getUserMessages(userId).length;
    
    const recentActivity = analytics.getRecentActivity(userId, 10);
    const postAnalytics = analytics.getPostAnalytics(userId);
    const userGrowth = analytics.getUserGrowth(userId, 7);
    const topPosts = analytics.getTopPosts(5);
    
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
      postAnalytics,
      userGrowth,
      topPosts
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
