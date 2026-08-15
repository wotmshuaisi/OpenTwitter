console.log('Feed route loaded');
const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db/connection');
const posts = require('../db/posts');
const mentions = require('../db/mentions');
const users = require('../db/users');

// API endpoint for fetching feed data (must be before /:path)
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    const postsData = search 
      ? posts.searchPosts(search)
      : posts.getAllPosts();
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

// Search endpoint
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const postsData = posts.searchPosts(query);
    
    const userMap = {};
    for (const postId of postsData.map(p => p.id)) {
      const user = await users.findByPostId(postId);
      userMap[postId] = user;
    }
    
    res.json({
      posts: postsData,
      users: Object.values(userMap)
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search posts' });
  }
});

// Get home feed (render view)
router.get('/:path', (req, res) => {
  // Don't handle /health in feed route
  if (req.path === '/feed' || req.path === '/health') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const searchTerm = req.query.search || '';
  res.render('feed/index', { title: 'Home', searchTerm });
});

module.exports = router;
