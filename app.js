const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Import database connection
const db = require('./db/connection');
const { exec } = require('child_process');

console.log('[APP] Server starting');
const app = express();

// View engine configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Preprocess templates to handle EJS includes (EJS v6 compatibility)
const { preprocessTemplate } = require('./middleware/templatePreprocessor');

// Override render method to preprocess templates
const originalRender = app.render.bind(app);
app.render = function (name, options, callback) {
  const filename = path.join(this.settings.views || path.join(__dirname, 'views'), name + '.ejs');
  let template;
  
  try {
    template = fs.readFileSync(filename, 'utf8');
    template = preprocessTemplate(template, { filename, views: this.settings.views });
  } catch (error) {
    return callback(error);
  }
  
  originalRender(name, { ...options, _preprocessed: true }, callback);
};

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

// Middleware
const requireAuth = require('./middleware/requireAuth');
const currentUser = require('./middleware/currentUser');

// Initialize schema if needed
function initSchema() {
  const schemaPath = path.join(__dirname, 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    try {
      db.exec(schema);
      console.log('Schema initialized');
    } catch (error) {
      console.error('Schema initialization error:', error);
    }
  }
}

initSchema();

// Mount route routers
const auth = require('./routes/auth');
const profiles = require('./routes/profiles');
const follows = require('./routes/follows');
const posts = require('./routes/posts');
const feed = require('./routes/feed');
const messages = require('./routes/messages');
const media = require('./routes/media');
const health = require('./routes/health');
const analytics = require('./routes/analytics');
const notifications = require('./routes/notifications');

app.use(auth);
app.use('/profiles', profiles);
app.use('/follows', follows);
app.use('/posts', posts);
app.use('/messages', messages);
app.use('/media', media);
app.use('/health', health);
app.use('/api', feed);
app.use('/analytics', analytics);
app.use('/notifications', notifications);

// Apply rate limiting to API routes
app.use('/api', require('./middleware/rateLimiter').apiRateLimiter);
app.use('/posts', require('./middleware/rateLimiter').postRateLimiter);
app.use('/auth', require('./middleware/rateLimiter').authRateLimiter);

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

// Socket.io real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user room
  socket.on('join-user', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected`);
  });

  // Join post room
  socket.on('join-post', (postId) => {
    socket.join(`post:${postId}`);
  });

  // Leave rooms on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start job poller in background
require('./jobs/worker');

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Socket.io connected');
});

module.exports = { app, io, httpServer };
