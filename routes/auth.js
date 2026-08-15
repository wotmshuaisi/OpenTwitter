const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const router = express.Router();
const db = require('../db/connection');
const users = require('../db/users');

// Middleware to get current user from session
function requireAuth(req, res, next) {
  console.log('[requireAuth] req.sessionID:', req.sessionID);
  console.log('[requireAuth] req.cookies:', req.cookies);
  const sessionId = req.sessionID;
  console.log('[requireAuth] sessionId:', sessionId);
  const user = users.findBySession(sessionId);
  console.log('[requireAuth] user found:', !!user, user ? user.username : '');
  console.log('[requireAuth] sessionId in DB:', users.findBySession(sessionId));
  
  if (!user) {
    console.log('[requireAuth] redirecting to /login');
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  
  req.user = user;
  next();
}

// Middleware to set current user in req object
function currentUser(req, res, next) {
  const sessionId = req.sessionID;
  const user = users.findBySession(sessionId);
  
  if (user) {
    req.user = user;
  }
  
  next();
}

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Basic validation
    if (!username || !email || !password) {
      return res.json({ error: 'All fields are required' });
    }
    
    if (username.length < 3) {
      return res.json({ error: 'username too short' });
    }
    
    // Check if username exists
    const existingUser = users.findByUsername(username);
    if (existingUser) {
      return res.json({ error: 'username_exists' });
    }
    
    // Check if email exists
    const emailUser = users.findByEmail(email);
    if (emailUser) {
      return res.json({ error: 'email_exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insert user directly (create requires userId which we don't have yet)
    const stmt = db.prepare('INSERT INTO users (email, username, password_hash, display_name) VALUES (?, ?, ?, ?)');
    const result = stmt.run(email, username, passwordHash, username);
    const userId = result.lastInsertRowid;
    
    // Create session
    users.createSession(userId, req.sessionID);
    
    // Clear session data
    delete req.session.returned;
    
    res.json({ success: true, message: 'Account created successfully', sessionId: req.sessionID, email, username });
  } catch (error) {
    console.error('Registration error:', error);
    res.json({ error: 'An error occurred during registration' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.json({ error: 'All fields are required' });
    }
    
    // Find user
    const user = users.findByEmail(email);
    
    if (!user) {
      return res.json({ error: 'invalid_credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.json({ error: 'invalid_credentials' });
    }
    
    // Clear session data if set
    delete req.session.returned;
    
    // Create session in DB
    users.createSession(user.id, req.sessionID);
    
    res.json({ success: true, user: user, sessionId: req.sessionID });
  } catch (error) {
    console.error('Login error:', error);
    res.json({ error: 'An error occurred during login' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  users.deleteSession(req.sessionID);
  
  // Clear session data
  delete req.session.returned;
  
  res.json({ success: true });
});

// Verify current user (for routes that need it)
router.get('/verify', currentUser, (req, res) => {
  res.json({ user: req.user });
});

// Get current user profile
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Register is accessible via GET and POST
router.get('/register', (req, res) => {
  res.render('auth/register', { theme: req.session.theme || 'system' });
});

// Login is accessible via GET and POST
router.get('/login', (req, res) => {
  const theme = req.session.theme || 'system';
  res.render('auth/login', { 
    theme: theme,
    returned: req.session.returned || false
  });
});

module.exports = router;
