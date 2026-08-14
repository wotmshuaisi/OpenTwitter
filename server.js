const http = require('http');
const { app, io, httpServer } = require('./app');
const { exec } = require('child_process');

// Start job poller as a child process
const workerProcess = exec('node jobs/worker.js');

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  io.close();
  workerProcess.kill();
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  io.close();
  workerProcess.kill();
  httpServer.close(() => {
    process.exit(0);
  });
});

// Start the server
httpServer.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
  console.log('Jobs worker started');
});
