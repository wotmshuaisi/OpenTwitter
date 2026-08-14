const express = require('express');
const multer = require('multer');
const router = express.Router();
const { users } = require('../db/users');
const { posts } = require('../db/posts');
const { conversations } = require('../db/conversations');
const { addParticipant } = require('../db/conversationParticipants');
const { media } = require('../db/media');
const { storage } = require('../storage');

// Configure multer for file uploads
const storageEngine = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'media-storage/profiles');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix);
    }
  }),
  fileFilter: function (req, file, cb) {
    // Only allow images
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Get profile
router.get('/:username', (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const user = require('../db/users').findByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get follower count
    const followers = require('../db/users').getFollowers(user.id);
    const followerCount = followers ? followers.length : 0;
    
    // Get following count
    const following = require('../db/users').getFollowing(user.id);
    const followingCount = following ? following.length : 0;
    
    // Check if current user is following
    const followingUser = require('../db/follows').isFollowing(req.user.id, user.id);
    
    res.json({
      user: {
        ...user,
        followerCount,
        followingCount,
        isFollowing
      },
      followers,
      following: following,
      followingCount: following ? following.length : 0
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'An error occurred while fetching profile' });
  }
});

// Get profile with stats
router.get('/:username/with-stats', (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const user = require('../db/users').findByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get follower count
    const followers = require('../db/users').getFollowers(user.id);
    const followerCount = followers ? followers.length : 0;
    
    // Get following count
    const following = require('../db/users').getFollowing(user.id);
    const followingCount = following ? following.length : 0;
    
    res.json({
      user: {
        ...user,
        followerCount,
        followingCount
      }
    });
  } catch (error) {
    console.error('Get profile with stats error:', error);
    res.status(500).json({ error: 'An error occurred while fetching profile' });
  }
});

// Get followers
router.get('/:username/followers', (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const user = require('../db/users').findByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const followers = require('../db/users').getFollowers(user.id);
    const followersWithStats = followers.map(follower => {
      return {
        ...follower,
        displayName: require('../db/users').getDisplayName(follower.id),
        followerCount: require('../db/users').getFollowerCount(follower.id),
        followingCount: require('../db/users').getFollowingCount(follower.id)
      };
    });
    
    res.json({ followers: followersWithStats });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'An error occurred while fetching followers' });
  }
});

// Get following
router.get('/:username/following', (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const user = require('../db/users').findByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const following = require('../db/users').getFollowing(user.id);
    const followingWithStats = following.map(follower => {
      return {
        ...follower,
        displayName: require('../db/users').getDisplayName(follower.id),
        followerCount: require('../db/users').getFollowerCount(follower.id),
        followingCount: require('../db/users').getFollowingCount(follower.id)
      };
    });
    
    res.json({ following: followingWithStats });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'An error occurred while fetching following' });
  }
});

// Update profile
router.post('/:username/profile', storageEngine.single('file'), async (req, res) => {
  try {
    const { display_name, bio, location, website } = req.body;
    const username = decodeURIComponent(req.params.username);
    const user = require('../db/users').findByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update profile fields
    const updateResult = require('../db/users').updateProfile(user.id, {
      display_name: display_name || user.display_name,
      bio: bio || user.bio,
      location: location || user.location,
      website: website || user.website
    });
    
    // Handle avatar upload
    let avatarMediaId = null;
    let avatarStorageKey = null;
    
    if (req.file) {
      // Generate media storage key
      const ext = req.file.originalname.split('.').pop();
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9).toString(36);
      const avatarStorageKey = `profiles/${user.id}/${timestamp}-${randomSuffix}.${ext}`;
      
      // Upload to storage
      avatarStorageKey = await storage.put(avatarStorageKey, req.file.buffer);
      
      // Create media record
      avatarMediaId = await media.createAvatarMedia(user.id, avatarStorageKey, req.file.mimetype, req.file.mimetype);
      
      // Update media record with status
      media.updateStatus(avatarMediaId, 'processing');
      
      // Enqueue job for thumbnail generation
      const { enqueueJob } = require('../db/jobs');
      enqueueJob('generateThumbnail', { storageKey: avatarStorageKey, mediaId: avatarMediaId });
      
      // Update user avatar
      require('../db/users').updateAvatar(user.id, avatarMediaId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    res.json({ error: 'An error occurred while updating profile' });
  }
});

// Follow user
router.post('/:username/follow', (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const targetUser = require('../db/users').findByUsername(username);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (targetUser.id === req.user.id) {
      return res.json({ error: 'Cannot follow yourself' });
    }
    
    // Check if already following
    const isFollowing = require('../db/follows').isFollowing(req.user.id, targetUser.id);
    
    if (isFollowing) {
      return res.json({ error: 'Already following' });
    }
    
    // Add follow
    require('../db/follows').addFollow(req.user.id, targetUser.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'An error occurred while following user' });
  }
});

// Unfollow user
router.post('/:username/unfollow', (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const targetUser = require('../db/users').findByUsername(username);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (targetUser.id === req.user.id) {
      return res.json({ error: 'Cannot unfollow yourself' });
    }
    
    // Remove follow
    require('../db/follows').removeFollow(req.user.id, targetUser.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'An error occurred while unfollowing user' });
  }
});

// Add conversation
router.post('/:username/add-conversation', (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const targetUser = require('../db/users').findByUsername(username);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already in conversation
    const inConversation = require('../db/conversationParticipants').isParticipant(targetUser.id, req.user.id);
    
    if (inConversation) {
      return res.json({ error: 'Already in conversation' });
    }
    
    // Create or get conversation
    let conv;
    if (targetUser.id < req.user.id) {
      conv = require('../db/conversations').findById(targetUser.id);
    } else {
      conv = require('../db/conversations').findById(req.user.id);
    }
    
    if (!conv) {
      conv = require('../db/conversations').createConversation();
    }
    
    // Add participant
    addParticipant(conv.id, targetUser.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Add conversation error:', error);
    res.status(500).json({ error: 'An error occurred while adding conversation' });
  }
});

// Start conversation
router.post('/:username/start-conversation', (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const targetUser = require('../db/users').findByUsername(username);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already in conversation
    const inConversation = require('../db/conversationParticipants').isParticipant(targetUser.id, req.user.id);
    
    if (inConversation) {
      return res.json({ error: 'Already in conversation' });
    }
    
    // Create conversation
    const conv = require('../db/conversations').createConversation();
    
    // Add participants
    require('../db/conversationParticipants').addUserToConversation(conv.id, targetUser.id);
    require('../db/conversationParticipants').addUserToConversation(conv.id, req.user.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ error: 'An error occurred while starting conversation' });
  }
});

module.exports = router;
