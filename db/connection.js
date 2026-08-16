const Database = require('better-sqlite3');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'twitter-local.db');
const db = new Database(dbFile);

// Set pragmas for better SQLite performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('cache_size = -64000'); // 64MB cache
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');

// Enable foreign key constraints
db.exec(`
  PRAGMA foreign_keys = ON;
`);

// Export db instance for module use
module.exports = db;
