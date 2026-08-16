// Notifications routes
const express = require('express');
const router = express.Router();
const notificationDb = require('../db/notifications');
const requireAuth = require('../middleware/requireAuth');

// Middleware to ensure user is authenticated
router.use(requireAuth);

// Get notifications for current user
router.get('/', (req, res) => {
  const notifications = notificationDb.getNotifications(req.user.id);
  const unreadCount = notificationDb.getNotificationCount(req.user.id);
  
  res.render('notifications/index', {
    title: 'Notifications',
    notifications,
    unreadCount
  });
});

// Get unread notifications count
router.get('/count', (req, res) => {
  const count = notificationDb.getNotificationCount(req.user.id);
  res.json({ count });
});

// Mark all notifications as read
router.post('/mark-all-as-read', (req, res) => {
  notificationDb.markAllAsRead(req.user.id);
  res.json({ success: true });
});

// Mark specific notification as read
router.post('/mark-as-read/:id', (req, res) => {
  const notificationId = req.params.id;
  notificationDb.markAsRead(notificationId);
  res.json({ success: true });
});

module.exports = router;