const express = require('express');
const router = express.Router();
const follows = require('../db/follows');
const users = require('../db/users');

// Follow endpoint
router.post('/u/:username/follow', (req, res) => {
  try {
    const { username } = req.params;
    const user = users.findByUsername(username);
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    if (user.id === req.user.id) {
      return res.json({ error: 'Cannot follow yourself' });
    }
    
    follows.toggleFollow(req.user.id, user.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Follow error:', error);
    res.json({ error: 'An error occurred while following' });
  }
});

// Unfollow endpoint
router.post('/u/:username/unfollow', (req, res) => {
  try {
    const { username } = req.params;
    const user = users.findByUsername(username);
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    follows.toggleFollow(req.user.id, user.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.json({ error: 'An error occurred while unfollowing' });
  }
});

// Get user profile with follow stats
router.get('/u/:username', (req, res) => {
  try {
    const { username } = req.params;
    const user = users.findByUsername(username);
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.json({ error: 'An error occurred while fetching user' });
  }
});

// Get followers list
router.get('/u/:username/followers', (req, res) => {
  try {
    const { username } = req.params;
    const user = users.findByUsername(username);
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    const followers = follows.listFollowers(user.id);
    
    res.json({ 
      user,
      followers: followers.map(f => ({
        id: f.id,
        username: f.username,
        displayName: f.display_name,
        avatarMediaId: f.avatar_media_id,
        headerMediaId: f.header_media_id
      }))
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.json({ error: 'An error occurred while fetching followers' });
  }
});

// Get following list
router.get('/u/:username/following', (req, res) => {
  try {
    const { username } = req.params;
    const user = users.findByUsername(username);
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    const following = follows.listFollowing(user.id);
    
    res.json({ 
      user,
      following: following.map(f => ({
        id: f.id,
        username: f.username,
        displayName: f.display_name,
        avatarMediaId: f.avatar_media_id,
        headerMediaId: f.header_media_id
      }))
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.json({ error: 'An error occurred while fetching following' });
  }
});

// Toggle follow (follow if not following, unfollow if following)
router.post('/u/:username/toggle', (req, res) => {
  try {
    const { username } = req.params;
    const user = users.findByUsername(username);
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    follows.toggleFollow(req.user.id, user.id);
    
    // Check current status
    const status = follows.isFollowing(req.user.id, user.id);
    
    res.json({ success: true, status });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.json({ error: 'An error occurred while toggling follow' });
  }
});

// Get follow status
router.get('/u/:username/status', (req, res) => {
  try {
    const { username } = req.params;
    const user = users.findByUsername(username);
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    res.json({ status: follows.isFollowing(req.user.id, user.id) });
  } catch (error) {
    console.error('Get follow status error:', error);
    res.json({ error: 'An error occurred while fetching follow status' });
  }
});

module.exports = router;
