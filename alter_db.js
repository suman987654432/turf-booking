const db = require('./src/config/db');

async function alterTable() {
  try {
    const query = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP;
    `;
    console.log('Running alter table query...');
    await db.query(query);
    console.log('Users table updated successfully.');
  } catch (err) {
    console.error('Error updating users table:', err);
  } finally {
    db.pool.end();
  }
}

alterTable();
