const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// Health check endpoint
router.get('/', (req, res) => {
  try {
    // Test database connection
    db.pragma('index_status');
    
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      status: 'error',
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Database status endpoint
router.get('/db', (req, res) => {
  try {
    const pragmas = db.pragma();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      pragmas
    });
  } catch (error) {
    console.error('Database status error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to get database status',
      timestamp: new Date().toISOString()
    });
  }
});

// Jobs status endpoint
router.get('/jobs', (req, res) => {
  try {
    const pending = require('../db/jobs').getJobCount('pending');
    const processing = require('../db/jobs').getJobCount('processing');
    const done = require('../db/jobs').getJobCount('done');
    const failed = require('../db/jobs').getJobCount('failed');
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      jobs: { pending, processing, done, failed }
    });
  } catch (error) {
    console.error('Jobs status error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to get jobs status',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
