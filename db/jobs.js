const db = require('./connection');

// Enqueue a new job
function enqueueJob(jobType, data) {
  const stmt = db.prepare(`
    INSERT INTO jobs (job_type, data, status)
    VALUES (?, ?, 'pending')
  `);
  return stmt.run(jobType, JSON.stringify(data));
}

// Get next pending job
function claimNextJob() {
  const stmt = db.prepare(`
    SELECT * FROM jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1
  `);
  const job = stmt.get();
  
  if (job) {
    // Update status to processing
    updateJobStatus(job.id, 'processing');
    
    return JSON.parse(job.data);
  }
  
  return null;
}

// Update job status
function updateJobStatus(jobId, status) {
  const stmt = db.prepare(`
    UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?
  `);
  return stmt.run(status, jobId);
}

// Mark job as done
function markJobDone(jobId) {
  const stmt = db.prepare(`
    UPDATE jobs SET status = 'done', updated_at = datetime('now') WHERE id = ?
  `);
  return stmt.run(jobId);
}

// Mark job as failed
function markJobFailed(jobId, attempts) {
  const stmt = db.prepare(`
    UPDATE jobs SET status = 'failed', attempts = ?, updated_at = datetime('now') WHERE id = ?
  `);
  return stmt.run(attempts, jobId);
}

// Get job count by status
function getJobCount(status) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM jobs WHERE status = ?
  `);
  const result = stmt.get(status);
  return result ? result.count : 0;
}

// Get all pending jobs
function getPendingJobs(limit = 5) {
  const stmt = db.prepare(`
    SELECT * FROM jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ?
  `);
  return stmt.all(limit);
}

module.exports = {
  enqueueJob,
  claimNextJob,
  updateJobStatus,
  markJobDone,
  markJobFailed,
  getJobCount,
  getPendingJobs
};
