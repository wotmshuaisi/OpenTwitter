const db = require('./connection');

// Add user to conversation
function addUserToConversation(conversationId, userId) {
  const stmt = db.prepare(`
    INSERT INTO conversation_participants (conversation_id, user_id, last_read_message_id)
    VALUES (?, ?, 0)
  `);
  return stmt.run(conversationId, userId);
}

// Check if user is participant in conversation
function isParticipant(conversationId, userId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM conversation_participants WHERE conversation_id = ? AND user_id = ?');
  const result = stmt.get(conversationId, userId);
  return result && result.count > 0;
}

// Remove user from conversation
function removeUserFromConversation(conversationId, userId) {
  const stmt = db.prepare('DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?');
  return stmt.run(conversationId, userId);
}

// Get conversation participants
function getParticipants(conversationId) {
  const stmt = db.prepare('SELECT * FROM conversation_participants WHERE conversation_id = ?');
  return stmt.all(conversationId);
}

// Get user's conversations
function getUserConversations(userId) {
  const stmt = db.prepare(`
    SELECT c.*, COUNT(cp.id) as participant_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE cp.user_id = ?
    GROUP BY c.id
  `);
  return stmt.all(userId);
}

// Update last read message ID
function updateLastRead(conversationId, userId, messageId) {
  const stmt = db.prepare('UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?');
  return stmt.run(messageId, conversationId, userId);
}

// Get user's unread messages count
function getUnreadCount(conversationId, userId) {
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

module.exports = {
  addUserToConversation,
  isParticipant,
  removeUserFromConversation,
  getParticipants,
  getUserConversations,
  updateLastRead,
  getUnreadCount
};
