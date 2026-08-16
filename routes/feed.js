console.log('Feed route loaded');
const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db/connection');
const search = require('../db/search');
const users = require('../db/users');

// Simple HTML sanitizer
function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<>|<\/script>)[<\s\w])*<\/script>/gi, '')
    .replace(/<iframe[^<]*(?:(?!<>|<\/iframe>)[<\s\w])*<\/iframe>/gi, '')
    .replace(/<object[^<]*(?:(?!<>|<\/object>)[<\s\w])*<\/object>/gi, '')
    .replace(/<embed[^<]*(?:(?!<>|<\/embed>)[<\s\w])*<\/embed>/gi, '')
    .replace(/<form[^<]*(?:(?!<>|<\/form>)[<\s\w])*<\/form>/gi, '')
    .replace(/<input[^<]*(?:(?!<>|<\/input>)[<\s\w])*<\/input>/gi, '')
    .replace(/<textarea[^<]*(?:(?!<>|<\/textarea>)[<\s\w])*<\/textarea>/gi, '')
    .replace(/<select[^<]*(?:(?!<>|<\/select>)[<\s\w])*<\/select>/gi, '')
    .replace(/<button[^<]*(?:(?!<>|<\/button>)[<\s\w])*<\/button>/gi, '')
    .replace(/<style[^<]*(?:(?!<>|<\/style>)[<\s\w])*<\/style>/gi, '')
    .replace(/<link[^<]*(?:(?!<>|<\/link>)[<\s\w])*<\/link>/gi, '')
    .replace(/<meta[^<]*(?:(?!<>|<\/meta>)[<\s\w])*<\/meta>/gi, '')
    .replace(/<br\s*\/>/gi, '\n')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

// API endpoint for fetching feed data with pagination (infinite scroll)
router.get('/', async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const sinceId = req.query.sinceId || null; // For infinite scroll pagination
    
    let postsData;
    
    if (searchQuery) {
      postsData = search.advancedSearch({ query: searchQuery });
    } else {
      const posts = require('../db/posts');
      if (sinceId) {
        // Get posts after the given ID for infinite scroll
        postsData = posts.getPostsAfter(sinceId);
      } else {
        postsData = posts.getAllPosts();
      }
    }

    // Get user info for posts using direct SQL query
    const userMap = {};
    const postIds = postsData.map(p => p.user_id).filter(Boolean);
    if (postIds.length > 0) {
      const users = db.prepare('SELECT id, username, display_name, avatar_media_id FROM users WHERE id IN (' + postIds.map(() => '?').join(', ') + ')').all(...postIds);
      for (const user of users) {
        userMap[user.id] = user;
      }
    }

    // Get mention user info
    const mentionsList = [];
    for (const post of postsData) {
      const mentions = require('../db/mentions').getMentions(post.id);
      mentionsList.push(...mentions.map(m => ({
        ...m,
        post_id: post.id,
        user_map: userMap[post.id] || null
      })));
    }

    // Get next cursor for infinite scroll
    const lastPostId = postsData.length > 0 ? postsData[postsData.length - 1].id : null;

    res.json({
      posts: postsData,
      mentions: mentionsList,
      users: Object.values(userMap),
      next_cursor: lastPostId || null
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

// Search endpoint with advanced filters
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const type = req.query.type || null;
    const minReposts = req.query.minReposts ? parseInt(req.query.minReposts) : 0;
    const minLikes = req.query.minLikes ? parseInt(req.query.minLikes) : 0;

    if (!query) {
      return res.json({ posts: [], users: [] });
    }

    const postsData = search.advancedSearch({
      query,
      userId,
      minReposts,
      minLikes,
      type
    });

    // Get user info for posts using direct SQL query
    const userMap = {};
    const postIds = postsData.map(p => p.user_id).filter(Boolean);
    if (postIds.length > 0) {
      const users = db.prepare('SELECT id, username, display_name, avatar_media_id FROM users WHERE id IN (' + postIds.map(() => '?').join(', ') + ')').all(...postIds);
      for (const user of users) {
        userMap[user.id] = user;
      }
    }

    res.json({
      posts: postsData,
      users: Object.values(userMap)
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// Search suggestions endpoint (autocomplete)
router.get('/suggestions', async (req, res) => {
  try {
    const query = req.query.q || '';
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = search.getSearchSuggestions(query);
    
    res.json({
      suggestions: suggestions.map(s => ({
        username: s.username,
        display_name: s.display_name
      }))
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// POST endpoint for creating posts (matches any path under /api)
router.post('/:path', async (req, res) => {
  try {
    const { body } = req.body;
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate input
    if (!body || body.length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }
    
    if (body.length > 280) {
      return res.status(400).json({ error: 'Post must be 280 characters or less' });
    }
    
    // Sanitize input
    const sanitizedBody = sanitizeHtml(body);
    
    // Create post
    const posts = require('../db/posts');
    const result = await posts.createPost({
      userId,
      body: sanitizedBody,
      type: 'text'
    });
    
    if (result.success) {
      res.json({ success: true, post: result.post });
    } else {
      res.status(400).json({ error: result.error || 'Failed to create post' });
    }
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get home feed (render view)
router.get('/:path', (req, res) => {
  // Don't handle /health in feed route
  if (req.path === '/feed' || req.path === '/health') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Handle search page
  const searchTerm = req.query.q || req.query.search || '';
  if (searchTerm) {
    return res.render('search/index', { title: 'Search', searchTerm, mediaPreview: null });
  }
  
  res.render('feed/index', { title: 'Home', searchTerm, mediaPreview: null });
});

module.exports = router;
