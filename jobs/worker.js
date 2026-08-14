// Job worker for processing background tasks
// This worker processes thumbnail generation and other time-consuming tasks

const { generateThumbnail } = require('../media/images');
const { updateJobStatus } = require('../db/jobs');

// Main worker function - called by worker_threads
function workerFunction(job) {
  const { storageKey, mediaId } = job.data;
  
  try {
    // Generate thumbnail
    generateThumbnail(storageKey, mediaId);
    
    // Update job status
    updateJobStatus(mediaId, 'done');
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    
    // Update job status
    updateJobStatus(mediaId, 'failed');
  }
}

// Start worker thread
function startWorker() {
  const worker = require('worker_threads').Worker(__filename);
  
  worker.on('message', (job) => {
    workerFunction(job);
  });
  
  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });
}

module.exports = {
  workerFunction,
  startWorker
};
