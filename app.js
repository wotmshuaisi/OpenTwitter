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

// Mount route routers
const auth = require('./routes/auth');
const profiles = require('./routes/profiles');
const follows = require('./routes/follows');
const posts = require('./routes/posts');
const feed = require('./routes/feed');
const messages = require('./routes/messages');
const media = require('./routes/media');
const health = require('./routes/health');

app.use(auth);
app.use('/profiles', profiles);
app.use('/follows', follows);
app.use('/posts', posts);
app.use('/messages', messages);
app.use('/media', media);
app.use('/health', health);
app.use('/api', feed);

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
