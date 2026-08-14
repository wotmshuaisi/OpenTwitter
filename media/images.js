const sharp = require('sharp');
const { storage } = require('../storage');

// Generate thumbnail from image file
async function generateThumbnail(payload) {
  const { storageKey, mediaId } = payload;
  
  try {
    // Get the image file from storage
    const buffer = await storage.get(storageKey);
    
    if (!buffer) {
      return { success: false, error: 'Image not found in storage' };
    }
    
    // Resize to thumbnail (400x400, max dimension)
    const thumbBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    
    // Create thumbnail storage key
    const thumbStorageKey = `${storageKey}_thumb`;
    
    // Save thumbnail
    await storage.put(thumbStorageKey, thumbBuffer);
    
    // Update media status
    const db = require('../db/connection');
    const { media } = require('../db/media');
    media.updateStatus(mediaId, 'ready');
    
    // Emit socket event for real-time update
    emitMediaReady(mediaId);
    
    return { 
      success: true,
      thumbnailKey: thumbStorageKey,
      message: 'Thumbnail generated successfully'
    };
  } catch (error) {
    console.error('[image:generateThumbnail]', error);
    return { success: false, error: error.message };
  }
}

// Get resized image by dimensions
async function getImageByDimensions(storageKey, width, height) {
  try {
    const buffer = await storage.get(storageKey);
    
    if (!buffer) {
      return null;
    }
    
    const image = sharp(buffer);
    const outputBuffer = await image
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    
    return outputBuffer;
  } catch (error) {
    console.error('[image:getByDimensions]', error);
    return null;
  }
}

// Get full size image
async function getImage(storageKey) {
  try {
    return storage.get(storageKey);
  } catch (error) {
    console.error('[image:get]', error);
    return null;
  }
}

// Delete image from storage
async function deleteImage(storageKey) {
  try {
    await storage.delete(storageKey);
    return true;
  } catch (error) {
    console.error('[image:delete]', error);
    return false;
  }
}

module.exports = {
  generateThumbnail,
  getImageByDimensions,
  getImage,
  deleteImage
};
