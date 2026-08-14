const db = require('./connection');

// Create a new job
function createJob(jobType, data) {
  const stmt = db.prepare(`
    INSERT INTO jobs (job_type, data, status)
    VALUES (?, ?, 'pending')
  `);
  return stmt.run(jobType, JSON.stringify(data));
}

// Get job by ID
function getById(id) {
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
  return stmt.get(id);
}

// Get all jobs
function getAllJobs() {
  const stmt = db.prepare('SELECT * FROM jobs');
  return stmt.all();
}

// Get jobs by type
function getByType(type) {
  const stmt = db.prepare('SELECT * FROM jobs WHERE job_type = ?');
  return stmt.all(type);
}

// Get jobs by status
function getByStatus(status) {
  const stmt = db.prepare('SELECT * FROM jobs WHERE status = ?');
  return stmt.all(status);
}

// Get pending jobs
function getPendingJobs(type = null) {
  if (type) {
    const stmt = db.prepare('SELECT * FROM jobs WHERE status = ? AND job_type = ?');
    return stmt.all('pending', type);
  }
  const stmt = db.prepare('SELECT * FROM jobs WHERE status = ?');
  return stmt.all('pending');
}

// Get pending job count
function getJobCount(status) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?');
  const result = stmt.get(status);
  return result ? result.count : 0;
}

// Update job status
function updateJobStatus(id, status) {
  const stmt = db.prepare('UPDATE jobs SET status = ?, started_at = ? WHERE id = ?');
  const now = new Date().toISOString();
  return stmt.run(status, now, id);
}

// Update job completion time
function updateJobCompletionTime(id) {
  const stmt = db.prepare('UPDATE jobs SET completed_at = ? WHERE id = ?');
  const now = new Date().toISOString();
  return stmt.run(now, id);
}

// Delete job
function deleteJob(id) {
  const stmt = db.prepare('DELETE FROM jobs WHERE id = ?');
  return stmt.run(id);
}

// Enqueue a job
function enqueueJob(jobType, data) {
  createJob(jobType, data);
}

// Get jobs by type and status
function getJobsByTypeAndStatus(jobType, status) {
  const stmt = db.prepare('SELECT * FROM jobs WHERE job_type = ? AND status = ?');
  return stmt.all(jobType, status);
}

// Get recent jobs
function getRecentJobs(limit = 100) {
  const stmt = db.prepare(`
    SELECT * FROM jobs
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

module.exports = {
  createJob,
  getById,
  getAllJobs,
  getByType,
  getByStatus,
  getPendingJobs,
  getJobCount,
  updateJobStatus,
  updateJobCompletionTime,
  deleteJob,
  enqueueJob,
  getJobsByTypeAndStatus,
  getRecentJobs
};
