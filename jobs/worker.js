// Job worker for processing background tasks
// This worker processes thumbnail generation, video transcoding, and analytics rollup

const db = require('../db/connection');

// Job handlers
const handlers = {};

// Register a job handler
function registerHandler(jobType, handler) {
  handlers[jobType] = handler;
}

// Process a single job
function processJob(job) {
  const { job_type: jobType, data } = JSON.parse(job.data);
  
  console.log(`Processing job: ${jobType} (id: ${job.id})`);
  
  // Update status to processing
  db.prepare("UPDATE jobs SET status = 'processing', started_at = datetime('now') WHERE id = ?").run(job.id);
  
  try {
    // Execute the handler
    const result = handlers[jobType](data);
    
    // Mark as done
    db.prepare("UPDATE jobs SET status = 'done', updated_at = datetime('now') WHERE id = ?").run(job.id);
    
    console.log(`Job ${job.id} completed successfully`);
    return result;
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error.message);
    
    // Mark as failed (with retry logic)
    const attempts = (job.attempts || 0) + 1;
    if (attempts < 3) {
      // Retry if attempts < 3
      db.prepare("UPDATE jobs SET status = 'pending', attempts = ?, updated_at = datetime('now') WHERE id = ?").run(attempts, job.id);
      console.log(`Job ${job.id} will be retried (attempt ${attempts})`);
    } else {
      db.prepare("UPDATE jobs SET status = 'failed', attempts = ?, updated_at = datetime('now') WHERE id = ?").run(attempts, job.id);
      console.log(`Job ${job.id} permanently failed after ${attempts} attempts`);
    }
    
    throw error;
  }
}

// Poll for pending jobs
function pollJobs() {
  console.log('Job poller running...');
  
  // Query pending jobs (limit to 5 per poll cycle)
  const stmt = db.prepare("SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5");
  const jobs = stmt.all();
  
  if (jobs.length === 0) {
    console.log('No pending jobs');
    return;
  }
  
  console.log(`Found ${jobs.length} pending jobs`);
  
  // Process each job
  jobs.forEach(job => {
    try {
      processJob(job);
    } catch (error) {
      // Job will be retried or marked as failed in processJob
      console.error(`Error processing job ${job.id}:`, error.message);
    }
  });
  
  console.log('Poll cycle complete');
}

// Start the job poller
function startWorker() {
  // Poll jobs every 5 seconds
  setInterval(pollJobs, 5000);
  
  console.log('Job worker started');
  console.log('Polling for pending jobs every 5 seconds');
  
  // Report initial job counts
  const pending = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'pending'").get();
  const processing = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'processing'").get();
  const done = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'done'").get();
  const failed = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'failed'").get();
  
  console.log(`Initial job counts: pending=${pending ? pending.count : 0}, processing=${processing ? processing.count : 0}, done=${done ? done.count : 0}, failed=${failed ? failed.count : 0}`);
}

// Register default handlers
function registerDefaultHandlers() {
  // Image thumbnail generation handler
  registerHandler('image:thumbnail', (data) => {
    console.log(`Generating thumbnail for image: ${data.storageKey}`);
    
    // This would normally call the image processing module
    // For now, just mark as done
    return { success: true };
  });
  
  // Video transcoding handler
  registerHandler('video:transcode', (data) => {
    console.log(`Transcoding video: ${data.storageKey}`);
    
    // This would normally call the video processing module
    // For now, just mark as done
    return { success: true };
  });
  
  // Analytics rollup handler
  registerHandler('analytics:rollup', (data) => {
    console.log(`Rolling up analytics for: ${data.subject}`);
    
    // This would normally call the analytics rollup module
    // For now, just mark as done
    return { success: true };
  });
}

// Load job handlers from the handlers directory
function loadHandlers() {
  const fs = require('fs');
  const path = require('path');
  
  const handlersDir = path.join(__dirname, 'handlers');
  
  if (fs.existsSync(handlersDir)) {
    const files = fs.readdirSync(handlersDir);
    
    files.forEach(file => {
      if (file.endsWith('.js') && file !== 'index.js') {
        const moduleName = file.replace('.js', '');
        try {
          const handlerModule = require(`./handlers/${moduleName}`);
          
          // Export all functions from the handler module
          Object.keys(handlerModule).forEach(key => {
            if (typeof handlerModule[key] === 'function') {
              // Register with the module name as the job type
              registerHandler(moduleName, handlerModule[key]);
            }
          });
        } catch (error) {
          console.error(`Error loading handler ${moduleName}:`, error.message);
        }
      }
    });
  }
}

// Initialize the worker
function init() {
  // Load handlers from the handlers directory
  loadHandlers();
  
  // Register default handlers
  registerDefaultHandlers();
  
  // Start the poller
  startWorker();
  
  // Export for testing
  module.exports = {
    pollJobs,
    startWorker,
    registerHandler,
    processJob,
    handlers
  };
}

// Start if run directly
if (require.main === module) {
  init();
}
