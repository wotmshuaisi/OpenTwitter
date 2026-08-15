const sharp = require('sharp');
const storage = require('../../storage');
const { media } = require('../../db/media');

// Generate thumbnail for an image
async function generateThumbnail(payload) {
  const { storageKey, mediaId } = payload;
  
  try {
    console.log(`Generating thumbnail for: ${storageKey}`);
    
    // Get the image from storage
    const driver = storage.get();
    const buffer = driver.get(storageKey);
    
    if (!buffer) {
      console.error(`Image not found in storage: ${storageKey}`);
      return { success: false, error: 'Image not found' };
    }
    
    // Generate thumbnail
    const thumbBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    
    // Create thumbnail key
    const thumbStorageKey = `${storageKey}_thumb`;
    
    // Save thumbnail to storage
    driver.put(thumbStorageKey, thumbBuffer);
    
    console.log(`Thumbnail generated: ${thumbStorageKey}`);
    
    // Update media status if mediaId is provided
    if (mediaId) {
      try {
        const { updateStatus } = require('../../db/media');
        updateStatus(mediaId, 'ready');
        console.log(`Media ${mediaId} marked as ready`);
      } catch (error) {
        console.error(`Error updating media status:`, error.message);
      }
    }
    
    return { success: true, thumbnailKey: thumbStorageKey };
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return { success: false, error: error.message };
  }
}

// Generate thumbnail for a post media
async function generatePostThumbnail(payload) {
  const { storageKey, mediaId } = payload;
  
  try {
    console.log(`Generating post thumbnail for: ${storageKey}`);
    
    // Get the image from storage
    const driver = storage.get();
    const buffer = driver.get(storageKey);
    
    if (!buffer) {
      console.error(`Image not found in storage: ${storageKey}`);
      return { success: false, error: 'Image not found' };
    }
    
    // Generate thumbnail
    const thumbBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    
    // Create thumbnail key
    const thumbStorageKey = `${storageKey}_thumb`;
    
    // Save thumbnail to storage
    driver.put(thumbStorageKey, thumbBuffer);
    
    console.log(`Post thumbnail generated: ${thumbStorageKey}`);
    
    // Update media status
    if (mediaId) {
      try {
        const { updateStatus } = require('../../db/media');
        updateStatus(mediaId, 'ready');
        console.log(`Media ${mediaId} marked as ready`);
      } catch (error) {
        console.error(`Error updating media status:`, error.message);
      }
    }
    
    return { success: true, thumbnailKey: thumbStorageKey };
  } catch (error) {
    console.error('Error generating post thumbnail:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateThumbnail,
  generatePostThumbnail
};
