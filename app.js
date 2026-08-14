const express = require('express');
const session = require('express-session');
const path = require('path');

// Import database connection
const db = require('./db/connection');
const { exec } = require('child_process');

const app = express();

// View engine configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Mount route directories
const routePaths = {
  'auth': path.join(__dirname, 'routes', 'auth'),
  'profiles': path.join(__dirname, 'routes', 'profiles'),
  'follows': path.join(__dirname, 'routes', 'follows'),
  'posts': path.join(__dirname, 'routes', 'posts'),
  'feed': path.join(__dirname, 'routes', 'feed'),
  'messages': path.join(__dirname, 'routes', 'messages'),
  'analytics': path.join(__dirname, 'routes', 'analytics'),
  'media': path.join(__dirname, 'routes', 'media'),
  'health': path.join(__dirname, 'routes', 'health')
};

Object.entries(routePaths).forEach(([name, dir]) => {
  app.use(`/api/${name}`, express.static(dir));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
const PORT = process.env.PORT || 3000;
const httpServer = require('http').createServer(app);

// Attach Socket.io
const io = require('socket.io')(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Start job poller in background
require('./jobs/worker');

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Socket.io connected');
});

module.exports = { app, io, httpServer };
