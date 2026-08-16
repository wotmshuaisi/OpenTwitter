const express = require('express');
const multer = require('multer');
const router = express.Router();
const { createPost, createRepost, createQuote, deletePost, getUserPostCount, getProfilePosts, deleteQuote, deleteRepost, getById, createLikeNotification } = require('../db/posts');
const mentions = require('../db/mentions');
const media = require('../db/media');
const storage = require('../storage');
const users = require('../db/users');
const follows = require('../db/follows');
const analytics = require('../db/analytics');

// Configure multer for file uploads
const storageEngine = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'media-storage/posts');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix);
    }
  }),
  fileFilter: function (req, file, cb) {
    // Only allow images and videos
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Create a post with optional media upload
router.post('/', storageEngine.single('file'), async (req, res) => {
  try {
    const { body, type } = req.body;
    
    // Validation
    if (!body && !req.file) {
      return res.json({ error: 'Please write something or attach a file' });
    }
    
    if (body.length > 280) {
      return res.json({ error: 'Post must be 280 characters or less' });
    }
    
    // Create post
    const postResult = createPost(req.user.id, body, type);
    const postId = postResult.lastInsertRowid;
    
    // Handle media upload
    let mediaId = null;
    let storageKey = null;
    
    if (req.file) {
      // Generate media storage key
      const ext = req.file.originalname.split('.').pop();
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9).toString(36);
      const storageKey = `posts/${postId}/${timestamp}-${randomSuffix}.${ext}`;
      
      // Get storage driver
      const driver = storage.get();
      
      // Read file from disk (multer diskStorage)
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      
      // Upload to storage
      driver.put(storageKey, fileBuffer);
      
      // Create media record
      mediaId = media.createPostMedia(req.user.id, storageKey, req.file.mimetype, req.file.mimetype);
      
      // Update media record with status
      media.updateStatus(mediaId, 'processing');
      
      // Enqueue job for thumbnail generation
      const { enqueueJob } = require('../db/jobs');
      enqueueJob('image:thumbnail', { storageKey, mediaId });
      
      // Parse and add mentions
      const mentionsList = mentions.parseMentions(body, req.user.id);
      
      // Link post to mentions
      const post = require('../db/posts').getById(postId);
      if (post) {
        post.mentions = mentionsList.map(m => ({ id: m.id, mentioned_user_id: m.mentioned_user_id }));
      }
    }
    
    // Track analytics event
    try {
      const eventType = type === 'repost' ? 'repost' : 'post';
      analytics.trackEvent(req.user.id, eventType, { body_length: body.length });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
    
    res.json({ 
      success: true,
      postId: postId,
      mediaId: mediaId
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.json({ error: 'An error occurred while creating the post' });
  }
});

// Get post by ID
router.get('/:id', (req, res) => {
  try {
    const post = require('../db/posts').getById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'An error occurred while fetching the post' });
  }
});

// Get user's posts
router.get('/user/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const posts = require('../db/posts').getProfilePosts(userId);
    
    res.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'An error occurred while fetching user posts' });
  }
});

// Get all posts (feed)
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const posts = require('../db/posts').getAllPosts(limit, offset);
    
    res.json({ posts });
  } catch (error) {
    console.error('Get all posts error:', error);
    res.status(500).json({ error: 'An error occurred while fetching posts' });
  }
});

// Repost a post
router.post('/:id/repost', (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    // Check if user is already reposting
    const existingRepost = require('../db/posts').getById(postId);
    
    if (existingRepost && existingRepost.user_id === req.user.id) {
      return res.json({ error: 'Already reposted' });
    }
    
    // Create repost
    createRepost(req.user.id, postId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Repost error:', error);
    res.status(500).json({ error: 'An error occurred while reposting' });
  }
});

// Unrepost a post
router.delete('/:id/repost', (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    const repost = require('../db/posts').getById(postId);
    
    if (!repost || repost.type !== 'repost' || repost.user_id !== req.user.id) {
      return res.json({ error: 'Not authorized or post not found' });
    }
    
    deleteRepost(req.user.id, postId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Unrepost error:', error);
    res.status(500).json({ error: 'An error occurred while unreposting' });
  }
});

// Quote a post
router.post('/:id/quote', (req, res) => {
  try {
    const { body } = req.body;
    const postId = parseInt(req.params.id);
    
    if (!body) {
      return res.json({ error: 'Quote must include text' });
    }
    
    // Check if user is already quoting
    const existingQuote = require('../db/posts').getByPostId(postId);
    
    if (existingQuote && existingQuote.user_id === req.user.id) {
      return res.json({ error: 'Already quoted' });
    }
    
    // Create quote
    createQuote(req.user.id, body, postId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Quote error:', error);
    res.status(500).json({ error: 'An error occurred while quoting' });
  }
});

// Unquote a post
router.delete('/:id/quote', (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    
    const quote = require('../db/posts').getById(quoteId);
    
    if (!quote || quote.type !== 'quote' || quote.user_id !== req.user.id) {
      return res.json({ error: 'Not authorized or quote not found' });
    }
    
    deleteQuote(req.user.id, quoteId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Unquote error:', error);
    res.status(500).json({ error: 'An error occurred while unquoting' });
  }
});

// Get post count
router.get('/count', (req, res) => {
  try {
    const count = getUserPostCount(req.user.id);
    
    res.json({ count });
  } catch (error) {
    console.error('Get post count error:', error);
    res.status(500).json({ error: 'An error occurred while fetching post count' });
  }
});

// Like a post
router.post('/:id/like', (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    // Check if user already liked this post
    // For now, we'll just create the like notification
    createLikeNotification(postId, req.user.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'An error occurred while liking the post' });
  }
});

// Delete post
router.delete('/:id', (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.json({ error: 'Not authorized' });
    }
    
    deletePost(req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'An error occurred while deleting the post' });
  }
});

module.exports = router;
