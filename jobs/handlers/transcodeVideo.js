const fluentffmpeg = require('fluent-ffmpeg');
const storage = require('../../storage');
const { media } = require('../../db/media');

// Transcode video to MP4
async function transcodeVideo(payload) {
  const { storageKey, mediaId } = payload;
  
  try {
    console.log(`Transcoding video: ${storageKey}`);
    
    // Get the video from storage
    const driver = storage.get();
    const buffer = driver.get(storageKey);
    
    if (!buffer) {
      console.error(`Video not found in storage: ${storageKey}`);
      return { success: false, error: 'Video not found' };
    }
    
    // Check if already MP4 by examining the buffer
    // MP4 files start with specific bytes
    const isMP4 = buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00 && buffer[3] === 0x1C;
    
    if (isMP4) {
      console.log('Video already in MP4 format');
      
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
      
      return { success: true };
    }
    
    // Save video to temporary location for transcoding
    const tempDir = '/tmp/twitter-local/temp-videos';
    const fs = require('fs');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempPath = `${tempDir}/${storageKey}`;
    driver.put(`temp:${storageKey}`, buffer);
    
    // Transcode video
    const outputPath = `${tempDir}/${storageKey}.mp4`;
    
    console.log('Transcoding video:', tempPath, '->', outputPath);
    
    await new Promise((resolve, reject) => {
      fluentffmpeg.FFmpeg().ffmpeg(tempPath, ['-y', '-i', tempPath, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', outputPath])
        .on('end', () => {
          console.log('Video transcode complete');
          
          // Copy transcoded video back to storage
          const thumbBuffer = fs.readFileSync(outputPath);
          driver.put(storageKey, thumbBuffer);
          
          // Clean up temp files
          try {
            fs.unlinkSync(tempPath);
            fs.unlinkSync(outputPath);
          } catch (error) {
            console.error('Error cleaning up temp files:', error.message);
          }
          
          resolve();
        })
        .on('error', (err) => {
          console.error('Video transcode error:', err);
          
          // Clean up temp files
          try {
            fs.unlinkSync(tempPath);
            fs.unlinkSync(outputPath);
          } catch (error) {
            console.error('Error cleaning up temp files:', error.message);
          }
          
          reject(err);
        });
    });
    
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
    
    return { success: true };
  } catch (error) {
    console.error('Error transcoding video:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  transcodeVideo
};
