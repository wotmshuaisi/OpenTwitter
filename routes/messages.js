const express = require('express');
const router = express.Router();
const users = require('../db/users');
const conversations = require('../db/conversations');
const messageParticipants = require('../db/conversationParticipants');
const messages = require('../db/messages');
const media = require('../db/media');
const storage = require('../storage');
const { storage: storageEngine } = require('multer');

// Get conversations list
router.get('/conversations', (req, res) => {
  try {
    // Get all conversations involving this user
    const convIds = require('../db/connection');
    const convStmt = db.prepare('SELECT * FROM conversations WHERE id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = ?)');
    const convs = convStmt.all(req.user.id);
    
    // Get participants for each conversation
    const conversations = convs.map(conv => {
      const participants = messageParticipants.getParticipants(conv.id, req.user.id);
      
      // Find the other participant
      const otherParticipant = participants.find(p => p.user_id !== req.user.id);
      
      const lastMessage = require('../db/messages').getLastMessage(conv.id);
      
      return {
        id: conv.id,
        participant: otherParticipant,
        lastMessage: lastMessage ? lastMessage.body : 'No messages yet',
        unread: conv.participants.last_read_message_id < lastMessage ? 1 : 0
      };
    });
    
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'An error occurred while fetching conversations' });
  }
});

// Get conversation list
router.get('/conversation/:id', (req, res) => {
  try {
    const convId = parseInt(req.params.id);
    const conv = require('../db/connection').findById(convId);
    
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get participants
    const participants = messageParticipants.getParticipants(convId, req.user.id);
    
    // Find the other participant
    const otherParticipant = participants.find(p => p.user_id !== req.user.id);
    
    // Get messages
    const messagesList = require('../db/messages').getMessagesByConversation(convId);
    const lastMessage = messagesList[messagesList.length - 1];
    
    // Update read marker
    if (lastMessage) {
      messageParticipants.markAsRead(convId, req.user.id, lastMessage.id);
    }
    
    res.json({ 
      conversation: conv,
      participant: otherParticipant,
      messages: messagesList
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'An error occurred while fetching conversation' });
  }
});

// Send message
router.post('/', async (req, res) => {
  try {
    const { conversationId, body } = req.body;
    
    // Validation
    if (!conversationId || !body) {
      return res.json({ error: 'Missing conversation ID or message body' });
    }
    
    // Find the other participant
    const conv = require('../db/connection').findById(conversationId);
    const otherParticipant = require('../db/conversationParticipants').getParticipant(conv.id, req.user.id);
    
    if (!otherParticipant || otherParticipant.user_id === req.user.id) {
      return res.json({ error: 'Invalid conversation' });
    }
    
    // Create message
    const messageResult = require('../db/messages').sendMessage(conversationId, req.user.id, body);
    const messageId = messageResult.lastInsertRowid;
    
    // Handle media upload
    let mediaId = null;
    let storageKey = null;
    
    if (req.file) {
      // Generate media storage key
      const ext = req.file.originalname.split('.').pop();
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9).toString(36);
      const storageKey = `messages/${conversationId}/${timestamp}-${randomSuffix}.${ext}`;
      
      // Get storage driver
      const driver = storage.get();
      
      // Read file from disk (multer diskStorage)
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      
      // Upload to storage
      driver.put(storageKey, fileBuffer);
      
      // Create media record
      mediaId = media.createMediaRow('message', conversationId, storageKey, req.file.mimetype, req.file.mimetype);
      
      // Update media record with status
      media.updateStatus(mediaId, 'processing');
      
      // Enqueue job for thumbnail generation
      const { enqueueJob } = require('../db/jobs');
      enqueueJob('image:thumbnail', { storageKey, mediaId });
    }
    
    // Link message to media
    require('../db/messages').updateMessageMedia(messageId, mediaId);
    
    res.json({ 
      success: true,
      messageId: messageId,
      mediaId: mediaId
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.json({ error: 'An error occurred while sending the message' });
  }
});

// Get message by ID
router.get('/:id', (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const message = require('../db/messages').getMessageById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Get the conversation
    const conv = require('../db/connection').findById(message.conversation_id);
    
    res.json({ 
      message,
      conversation: conv
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'An error occurred while fetching the message' });
  }
});

// Get messages by conversation
router.get('/conversation/:id', (req, res) => {
  try {
    const convId = parseInt(req.params.id);
    const messagesList = require('../db/messages').getMessagesByConversation(convId);
    
    res.json({ messages: messagesList });
  } catch (error) {
    console.error('Get messages by conversation error:', error);
    res.status(500).json({ error: 'An error occurred while fetching messages' });
  }
});

// Delete message
router.delete('/:id', (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.json({ error: 'Not authorized' });
    }
    
    const message = require('../db/messages').getMessageById(req.params.id);
    
    if (!message || message.sender_id !== req.user.id) {
      return res.json({ error: 'Not authorized' });
    }
    
    require('../db/messages').deleteMessage(message.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'An error occurred while deleting the message' });
  }
});

module.exports = router;
