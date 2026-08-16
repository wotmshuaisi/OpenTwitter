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
    
    await new Promise((resolve, reject) => {
      ffmpeg(buffer)
        .on('error', (err) => {
          console.error('[video:generateThumbnail] FFmpeg error:', err);
          reject(err);
        })
        .on('end', async () => {
          try {
            // Save thumbnail
            await storage.put(thumbStorageKey, buffer);
            
            // Update media status
            const db = require('../db/connection');
            const { updateStatus } = require('../db/media');
            updateStatus(mediaId, 'ready');
            
            // Emit socket event for real-time update
            emitMediaReady(mediaId);
            
            resolve({ 
              success: true,
              thumbnailKey: thumbStorageKey,
              message: 'Thumbnail generated successfully'
            });
          } catch (err) {
            console.error('[video:generateThumbnail] Error saving thumbnail:', err);
            reject(err);
          }
        })
        .inputFormat('mp4', 'webm', 'mov')
        .screenshots({
          timemarks: ['00:00:05'],
          folder: '/tmp/twitter-local/media-storage/thumbnails',
          filename: thumbStorageKey,
          timemarkFormat: 'HH:MM:SS',
          count: 1,
          quality: 80
        })
        .run();
    });
    
    return { 
      success: true,
      thumbnailKey: thumbStorageKey,
      message: 'Thumbnail generated successfully'
    };
  } catch (error) {
    console.error('[video:generateThumbnail]', error);
    return { success: false, error: error.message };
  }
}

// Get video thumbnail by ID
async function getVideoThumbnail(videoId) {
  try {
    const db = require('../db/connection');
    const { media } = require('../db/media');
    
    const videoMedia = media.getById(videoId);
    
    if (!videoMedia || !videoMedia.thumbnail_key) {
      return null;
    }
    
    return storage.get(videoMedia.thumbnail_key);
  } catch (error) {
    console.error('[video:getThumbnail]', error);
    return null;
  }
}

// Transcode video with compression
async function transcodeVideo(inputKey, outputKey, options = {}) {
  try {
    const buffer = await storage.get(inputKey);
    
    if (!buffer) {
      return { success: false, error: 'Video not found' };
    }
    
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      bitrate = '2000k',
      audioBitrate = '128k'
    } = options;
    
    await new Promise((resolve, reject) => {
      ffmpeg(buffer)
        .on('error', (err) => {
          console.error('[video:transcode] FFmpeg error:', err);
          reject(err);
        })
        .on('end', () => resolve({ success: true }))
        .inputFormat('mp4', 'webm', 'mov')
        .toFormat('mp4')
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(bitrate)
        .audioBitrate(audioBitrate)
        .audioChannels(2)
        .audioSampleRate(44100)
        .videoSize(maxWidth, maxHeight)
        .save(outputKey)
        .run();
    });
    
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

// Emit media ready event via Socket.io
function emitMediaReady(mediaId) {
  const io = require('../app').io;
  if (io) {
    io.to(`post:${mediaId}`).emit('media:ready', { mediaId });
  }
}

module.exports = {
  generateThumbnail,
  getVideoThumbnail,
  transcodeVideo,
  deleteVideo
};
