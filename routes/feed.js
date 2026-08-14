console.log('Feed route loaded');
const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db/connection');
const { posts } = require('../db/posts');
const { mentions } = require('../db/mentions');
const { users } = require('../db/users');

// Get home feed (render view)
router.get('/:path', (req, res) => {
  console.log('Feed route called for:', req.path);
  console.log('Feed route handler executing...');
  
  // Don't handle /health in feed route
  if (req.path === '/feed' || req.path === '/health') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.render('feed/index', { title: 'Home' });
});

// API endpoint for fetching feed data
router.get('/api', async (req, res) => {
  try {
    const postsData = await posts.getAllPosts();
    const mentionsList = await mentions.getMentions();
    
    // Get user info for posts
    const userMap = {};
    for (const postId of postsData.map(p => p.id)) {
      const user = await users.findByPostId(postId);
      userMap[postId] = user;
    }
    
    // Get mention user info
    const mentionUserMap = {};
    for (const mention of mentionsList) {
      const user = await users.findByUserId(mention.mentioned_user_id);
      mentionUserMap[mention.mentioned_user_id] = user;
    }
    
    res.json({
      posts: postsData,
      mentions: mentionsList,
      users: Object.values(userMap),
      mentionUsers: Object.values(mentionUserMap)
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

module.exports = router;
