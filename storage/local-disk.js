// Local disk storage driver
// Uses multer for file uploads and Node.js fs for file operations

const fs = require('fs');
const path = require('path');

// Get storage directory
const STORAGE_DIR = process.env.STORAGE_DIR || 'media-storage';

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

module.exports = {
  // Put file to storage (returns storage key)
  put(storageKey, fileBuffer) {
    // Generate storage key
    const key = storageKey || Date.now().toString(36);
    
    // Ensure directory exists
    const dir = path.join(STORAGE_DIR, key.split('/')[0] || '');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(path.join(STORAGE_DIR, key), fileBuffer);
    
    return key;
  },
  
  // Get file from storage (returns Buffer)
  get(storageKey) {
    const file = fs.readFileSync(path.join(STORAGE_DIR, storageKey));
    return file;
  },
  
  // Get file URL for browser
  url(storageKey) {
    return `/media/${storageKey}`;
  },
  
  // Delete file from storage
  async delete(storageKey) {
    try {
      fs.unlinkSync(path.join(STORAGE_DIR, storageKey));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
};
