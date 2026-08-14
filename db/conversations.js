const db = require('./connection');

// Create a new conversation
function createConversation() {
  const stmt = db.prepare('INSERT INTO conversations (created_at) VALUES (?)');
  return stmt.run();
}

// Get all conversations for a user
function getUserConversations(userId) {
  const stmt = db.prepare(`
    SELECT * FROM conversations
    JOIN conversation_participants cp ON conversations.id = cp.conversation_id
    WHERE cp.user_id = ?
  `);
  return stmt.all(userId);
}

// Add participant to conversation
function addParticipant(conversationId, userId) {
  const stmt = db.prepare(`
    INSERT INTO conversation_participants (conversation_id, user_id, last_read_message_id)
    VALUES (?, ?, 0)
    ON DUPLICATE KEY UPDATE last_read_message_id = 0
  `);
  return stmt.run(conversationId, userId);
}

// Remove participant from conversation
function removeParticipant(conversationId, userId) {
  const stmt = db.prepare('DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?');
  return stmt.run(conversationId, userId);
}

// Get participant by conversation and user ID
function getParticipant(conversationId, userId) {
  const stmt = db.prepare('SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?');
  return stmt.get(conversationId, userId);
}

// Get all participants for a conversation
function getParticipants(conversationId, userId = null) {
  if (userId) {
    const stmt = db.prepare(`
      SELECT * FROM conversation_participants
      WHERE conversation_id = ?
      AND (user_id = ? OR user_id IN (SELECT user_id FROM conversation_participants WHERE conversation_id = ?))
    `);
    return stmt.all(conversationId, userId, userId, conversationId);
  }
  
  const stmt = db.prepare('SELECT * FROM conversation_participants WHERE conversation_id = ?');
  return stmt.all(conversationId);
}

// Update last read message for a user
function markAsRead(conversationId, userId, messageId) {
  const stmt = db.prepare('UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?');
  return stmt.run(messageId, conversationId, userId);
}

// Get conversation by ID
function findById(id) {
  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
  return stmt.get(id);
}

// Get count of conversations for a user
function getConversationCount(userId) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM conversations
    JOIN conversation_participants cp ON conversations.id = cp.conversation_id
    WHERE cp.user_id = ?
  `);
  const result = stmt.get(userId);
  return result ? result.count : 0;
}

// Get unread message count for a user per conversation
function getUnreadMessages(conversationId, userId) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE m.conversation_id = ?
    AND m.created_at > cp.last_read_message_id
    AND m.sender_id = ?
  `);
  const result = stmt.get(conversationId, userId);
  return result ? result.count : 0;
}

// Get last message for a conversation
function getLastMessage(conversationId) {
  const stmt = db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return stmt.get(conversationId);
}

// Get messages by conversation
function getMessagesByConversation(conversationId, limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(conversationId, limit);
}

// Get conversations with participant info
function getUserConversationsWithInfo(userId) {
  const convs = getUserConversations(userId);
  
  return convs.map(conv => {
    const participants = getParticipants(conv.id, userId);
    const lastMessage = getLastMessage(conv.id);
    const unread = getUnreadMessages(conv.id, userId);
    
    const otherParticipant = participants.find(p => p.user_id !== userId);
    
    return {
      ...conv,
      participants,
      lastMessage: lastMessage ? lastMessage.body : 'No messages yet',
      unread
    };
  });
}

module.exports = {
  createConversation,
  getUserConversations,
  addParticipant,
  removeParticipant,
  getParticipant,
  getParticipants,
  markAsRead,
  findById,
  getConversationCount,
  getUnreadMessages,
  getLastMessage,
  getMessagesByConversation,
  getUserConversationsWithInfo
};
