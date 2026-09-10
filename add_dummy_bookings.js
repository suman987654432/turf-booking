const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URI
});

async function addDummyBookings() {
  try {
    // select a random turf
    const turfRes = await pool.query("SELECT id FROM turfs LIMIT 1");
    if (turfRes.rows.length === 0) {
      console.log('No turf found to assign bookings to.');
      return;
    }
    const turfId = turfRes.rows[0].id;
    
    // use the provided customer id
    const customerId = 'c33be779-b78b-47c4-b094-1c8d0aa5416b';
    
    const turfResult = await pool.query("SELECT price_per_hour FROM turfs WHERE id = $1", [turfId]);
    if (turfResult.rows.length === 0) {
      console.log('Turf not found!');
      return;
    }
    const price = turfResult.rows[0].price_per_hour;

    // We will book from 10:00 to 11:00 for the next 10 days
    const date = new Date();
    for (let i = 1; i <= 10; i++) {
      date.setDate(date.getDate() + 1);
      const bookingDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const startTime = '10:00:00';
      const endTime = '11:00:00';
      const orderId = 'dummy_order_' + i + '_' + Date.now();
      const paymentId = 'dummy_pay_' + i + '_' + Date.now();
      
      await pool.query(
        `INSERT INTO bookings (turf_id, customer_id, booking_date, start_time, end_time, status, total_price, razorpay_order_id, razorpay_payment_id)
         VALUES ($1, $2, $3, $4, $5, 'CONFIRMED', $6, $7, $8)`,
        [turfId, customerId, bookingDate, startTime, endTime, price, orderId, paymentId]
      );
    }

    console.log('Successfully inserted 10 CONFIRMED bookings.');
  } catch (err) {
    console.error('Error inserting bookings:', err);
  } finally {
    pool.end();
  }
}

addDummyBookings();
