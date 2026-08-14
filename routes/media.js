const express = require('express');
const router = express.Router();
const { storage } = require('../storage');

// Serve media files
router.get('/media/:key', (req, res) => {
  try {
    const storageKey = req.params[0];
    
    if (!storageKey) {
      return res.status(400).json({ error: 'Missing media key' });
    }
    
    storage.get(storageKey).then(buffer => {
      if (!buffer) {
        return res.status(404).json({ error: 'Media not found' });
      }
      res.send(buffer);
    }).catch(error => {
      console.error('[media:serve]', error);
      res.status(500).json({ error: 'Failed to serve media' });
    });
  } catch (error) {
    console.error('[media:route]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get media URL (for templates)
router.get('/media/uri/:storageKey', (req, res) => {
  try {
    const storageKey = req.params.storageKey;
    const mediaUrl = storage.url(storageKey);
    res.json({ url: mediaUrl });
  } catch (error) {
    console.error('[media:uri]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
