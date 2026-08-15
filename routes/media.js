const express = require('express');
const router = express.Router();
const storage = require('../storage');

// Serve media files
router.get('/:key', (req, res) => {
  try {
    const storageKey = req.params.key;
    
    if (!storageKey) {
      return res.status(400).json({ error: 'Missing media key' });
    }
    
    const driver = storage.get();
    const buffer = driver.get(storageKey);
    if (!buffer) {
      return res.status(404).json({ error: 'Media not found' });
    }
    res.send(buffer);
  } catch (error) {
    console.error('[media:route]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get media URL (for templates)
router.get('/uri/:storageKey', (req, res) => {
  try {
    const storageKey = req.params.storageKey;
    const driver = storage.get();
    const mediaUrl = driver.url(storageKey);
    res.json({ url: mediaUrl });
  } catch (error) {
    console.error('[media:uri]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
