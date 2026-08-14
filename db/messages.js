const db = require('./connection');
const { media } = require('./media');

// Send a new message
function sendMessage(conversationId, senderId, body) {
  const stmt = db.prepare(`
    INSERT INTO messages (conversation_id, sender_id, body, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  return stmt.run(conversationId, senderId, body);
}

// Get message by ID
function getMessageById(id) {
  const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
  return stmt.get(id);
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

// Delete message
function deleteMessage(id) {
  const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
  return stmt.run(id);
}

// Update message media
function updateMessageMedia(messageId, mediaId) {
  const stmt = db.prepare('UPDATE messages SET media_id = ? WHERE id = ?');
  return stmt.run(mediaId, messageId);
}

// Get message count
function getMessageCount(conversationId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?');
  const result = stmt.get(conversationId);
  return result ? result.count : 0;
}

// Get unread message count for a user in a conversation
function getUnreadCount(conversationId, userId) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM messages
    WHERE conversation_id = ?
    AND created_at > (
      SELECT last_read_message_id FROM conversation_participants
      WHERE conversation_id = ? AND user_id = ?
    )
    AND sender_id != ?
  `);
  const result = stmt.get(conversationId, userId, userId, userId);
  return result ? result.count : 0;
}

// Get messages for a user
function getUserMessages(userId, limit = 50) {
  const stmt = db.prepare(`
    SELECT m.*, p.username as sender_username, p.display_name as sender_display_name
    FROM messages m
    JOIN users p ON m.sender_id = p.id
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit);
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

// Get messages by sender
function getMessagesBySender(userId, limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM messages
    WHERE sender_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit);
}

// Get all messages in a conversation
function getAllMessagesInConversation(conversationId) {
  const stmt = db.prepare(`
    SELECT m.*, p.username as sender_username, p.display_name as sender_display_name
    FROM messages m
    JOIN users p ON m.sender_id = p.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `);
  return stmt.all(conversationId);
}

// Get message with participant info
function getMessageWithInfo(id) {
  const message = getMessageById(id);
  if (message) {
    const conversation = require('./connection').findById(message.conversation_id);
    message.conversation = conversation;
  }
  return message;
}

// Mark message as read for a user
function markAsRead(conversationId, userId, messageId) {
  const stmt = db.prepare('UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?');
  return stmt.run(messageId, conversationId, userId);
}

module.exports = {
  sendMessage,
  getMessageById,
  getMessagesByConversation,
  deleteMessage,
  updateMessageMedia,
  getMessageCount,
  getUnreadCount,
  getUserMessages,
  getLastMessage,
  getMessagesBySender,
  getAllMessagesInConversation,
  getMessageWithInfo,
  markAsRead
};
