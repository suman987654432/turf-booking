require('dotenv').config();
const db = require('./src/config/db');

async function migrate() {
  try {
    const query = `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;
    await db.query(query);
    console.log('Successfully created notifications table.');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    process.exit(0);
  }
}
migrate();
