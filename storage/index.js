const { localDisk } = require('./local-disk');

// Only require S3 module if needed
let s3Compatible;
if (process.env.STORAGE_DRIVER === 's3' || process.env.STORAGE_DRIVER === 's3-compatible') {
  s3Compatible = require('./s3-compatible');
}

// Get storage driver based on environment variable
const STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local-disk';

module.exports = {
  get: function() {
    switch (STORAGE_DRIVER) {
      case 's3':
      case 's3-compatible':
        return s3Compatible;
      case 'local-disk':
      default:
        return localDisk;
    }
  }
};
