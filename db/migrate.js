// Database migration script
const db = require('./connection');

async function migrate() {
  console.log('Starting database migration...');

  try {
    // Read the schema file
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema (IF NOT EXISTS statements will skip existing tables)
    db.exec(schema);
    console.log('Schema migration complete');

    // Create performance indexes
    const { createIndexes } = require('./performance');
    const results = createIndexes();
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Created ${successCount} indexes successfully`);

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  migrate().then(success => {
    if (success) {
      console.log('Migration completed successfully');
      process.exit(0);
    } else {
      console.error('Migration failed');
      process.exit(1);
    }
  });
}

module.exports = { migrate };
