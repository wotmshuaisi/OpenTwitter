const ffmpeg = require('fluent-ffmpeg');
const { storage } = require('../storage');

// Generate thumbnail from video file
async function generateThumbnail(payload) {
  const { storageKey, mediaId } = payload;
  
  try {
    // Get the video file from storage
    const buffer = await storage.get(storageKey);
    
    if (!buffer) {
      return { success: false, error: 'Video not found in storage' };
    }
    
    // Create thumbnail at 5 seconds into video
    const thumbStorageKey = `${storageKey}_thumb`;
    
    // Convert to PNG
    await ffmpeg(buffer)
      .on('error', (err) => {
        console.error('[video:generateThumbnail] FFmpeg error:', err);
      })
      .on('end', async () => {
        try {
          // Save thumbnail
          await storage.put(thumbStorageKey, buffer);
          
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
        } catch (err) {
          console.error('[video:generateThumbnail] Error saving thumbnail:', err);
          return { success: false, error: err.message };
        }
      })
      .inputFormat('mp4')
      .onFormat('mp4', function() {
        this.videoCodec('libx264')
           .audioCodec('aac')
           .videoBitrate('2000k')
           .audioBitrate('128k')
           .audioChannels(2)
           .audioSampleRate(44100);
      })
      .toFormat('mp4')
      .save(thumbStorageKey)
      .run();
    
  } catch (error) {
    console.error('[video:generateThumbnail]', error);
    return { success: false, error: error.message };
  }
}

// Get video thumbnail by ID
async function getVideoThumbnail(videoId) {
  try {
    const media = require('../db/connection');
    const { media: mediaDb } = require('../db/media');
    
    const videoMedia = mediaDb.getById(videoId);
    
    if (!videoMedia || !videoMedia.thumbnail_key) {
      return null;
    }
    
    return storage.get(videoMedia.thumbnail_key);
  } catch (error) {
    console.error('[video:getThumbnail]', error);
    return null;
  }
}

// Transcode video (basic)
async function transcodeVideo(videoKey, outputKey) {
  try {
    const buffer = await storage.get(videoKey);
    
    if (!buffer) {
      return { success: false, error: 'Video not found' };
    }
    
    await ffmpeg(buffer)
      .inputFormat('mp4')
      .toFormat('mp4')
      .videoBitrate('2000k')
      .audioBitrate('128k')
      .audioChannels(2)
      .audioSampleRate(44100)
      .save(outputKey);
    
    return { success: true };
  } catch (error) {
    console.error('[video:transcode]', error);
    return { success: false, error: error.message };
  }
}

// Delete video from storage
async function deleteVideo(storageKey) {
  try {
    await storage.delete(storageKey);
    return true;
  } catch (error) {
    console.error('[video:delete]', error);
    return false;
  }
}

module.exports = {
  generateThumbnail,
  getVideoThumbnail,
  transcodeVideo,
  deleteVideo
};
