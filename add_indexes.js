require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
});

async function addIndexes() {
  const client = await pool.connect();
  try {
    console.log('Starting index creation...');

    // Users table indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    console.log('Created index on users(email)');

    // Turfs table indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_turfs_status ON turfs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_turfs_city ON turfs(city);`);
    console.log('Created indexes on turfs(status, city)');

    // Bookings table indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_turf_id ON bookings(turf_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);`);
    console.log('Created indexes on bookings(turf_id, customer_id, booking_date)');

    console.log('All indexes created successfully! Your database is now optimized for faster lookups.');
  } catch (err) {
    console.error('Error creating indexes:', err);
  } finally {
    client.release();
    pool.end();
  }
}

addIndexes();
