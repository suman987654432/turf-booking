const db = require('../config/db');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get only ACTIVE turfs for the customer app/website
const getActiveTurfs = async (req, res) => {
  const { lat, lng, radius } = req.query;

  try {
    let selectDistance = "NULL AS distance_km";
    let whereClause = "WHERE t.status = 'ACTIVE' AND t.is_open = TRUE";
    let orderByClause = "ORDER BY t.created_at DESC";
    const queryParams = [];

    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const parsedRadius = radius ? parseFloat(radius) : null;

      // Haversine Formula for distance in kilometers
      selectDistance = `
        ROUND((
          6371 * acos(
            cos(radians($1)) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(t.latitude))
          )
        )::numeric, 2) AS distance_km
      `;
      queryParams.push(parsedLat, parsedLng);

      if (parsedRadius) {
        whereClause += ` AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(t.latitude))
          )
        ) <= $3`;
        queryParams.push(parsedRadius);
      }

      orderByClause = "ORDER BY distance_km ASC NULLS LAST";
    }

    const query = `
      SELECT 
        t.*,
        ${selectDistance},
        (
          SELECT COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name)), '[]')
          FROM turf_sports ts
          JOIN sports s ON ts.sport_id = s.id
          WHERE ts.turf_id = t.id
        ) AS sports,
        (
          SELECT COALESCE(json_agg(json_build_object('id', a.id, 'name', a.name)), '[]')
          FROM turf_amenities ta
          JOIN amenities a ON ta.amenity_id = a.id
          WHERE ta.turf_id = t.id
        ) AS amenities,
        (
          SELECT COALESCE(json_agg(json_build_object('id', ti.id, 'image_url', ti.image_url, 's3_key', ti.s3_key, 'sort_order', ti.sort_order) ORDER BY ti.sort_order ASC), '[]')
          FROM turf_images ti
          WHERE ti.turf_id = t.id
        ) AS images
      FROM turfs t
      ${whereClause}
      ${orderByClause}
    `;
    const turfResult = await db.query(query, queryParams);

    return res.status(200).json({
      success: true,
      data: turfResult.rows
    });
  } catch (err) {
    console.error('Customer Get Turfs Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), phone = COALESCE($3, phone), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, phone, created_at, updated_at`,
      [name, email, phone, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, message: 'Profile updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Customer Update Profile Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Helper function to add hours to a time string "HH:MM:SS"
const addHoursToTime = (timeStr, hours) => {
  const [h, m, s] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, s);
  date.setHours(date.getHours() + hours);
  return date.toTimeString().split(' ')[0];
};

const getTurfSlots = async (req, res) => {
  const { id } = req.params; // turf_id
  const { date } = req.query; // YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ success: false, message: 'date query parameter is required (YYYY-MM-DD)' });
  }

  try {
    // 1. Get Turf opening and closing time
    const turfResult = await db.query('SELECT opening_time, closing_time FROM turfs WHERE id = $1', [id]);
    if (turfResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }
    const { opening_time, closing_time } = turfResult.rows[0];

    // 2. Get existing CONFIRMED bookings for this turf on this date
    const bookingResult = await db.query(
      `SELECT start_time, end_time FROM bookings WHERE turf_id = $1 AND booking_date = $2 AND status = 'CONFIRMED'`,
      [id, date]
    );
    const existingBookings = bookingResult.rows;

    // 3. Generate hourly slots
    const slots = [];
    let current = opening_time;

    while (current < closing_time) {
      const nextHour = addHoursToTime(current, 1);
      
      // Stop if next hour goes past closing time
      if (nextHour > closing_time && nextHour !== '00:00:00') break; 

      // Check if this slot overlaps with any booking
      let isBooked = false;
      for (const booking of existingBookings) {
        // Simple overlap check: If the slot start is >= booking start AND slot start < booking end
        if (current >= booking.start_time && current < booking.end_time) {
          isBooked = true;
          break;
        }
      }

      // Check if slot is in the past
      let isExpired = false;
      const slotDateTime = new Date(`${date}T${current}Z`); // Use UTC or local depending on server, but simpler to just compare
      // For a more accurate local comparison:
      const now = new Date();
      // Calculate slot time (assuming local timezone of turf)
      const [sh, sm, ss] = current.split(':').map(Number);
      const [y, m, d] = date.split('-').map(Number);
      const slotDateLocal = new Date(y, m - 1, d, sh, sm, ss || 0);

      if (slotDateLocal < now) {
        isExpired = true;
      }

      slots.push({
        start: current.substring(0, 5), // "HH:MM"
        end: nextHour.substring(0, 5),
        status: isBooked ? 'BOOKED' : (isExpired ? 'EXPIRED' : 'AVAILABLE')
      });

      current = nextHour;
    }

    return res.status(200).json({ success: true, data: slots });
  } catch (err) {
    console.error('Customer Get Slots Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createBooking = async (req, res) => {
  const userId = req.user.id;
  const { turf_id, date, time_slots, is_full_day } = req.body;

  if (!turf_id || !date) {
    return res.status(400).json({ success: false, message: 'turf_id and date are required' });
  }
  if (!is_full_day && (!time_slots || !Array.isArray(time_slots) || time_slots.length === 0)) {
    return res.status(400).json({ success: false, message: 'Provide time_slots array or set is_full_day: true' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock the Turf row for UPDATE to prevent double-booking
    const turfResult = await client.query('SELECT price_per_hour, opening_time, closing_time FROM turfs WHERE id = $1 FOR UPDATE', [turf_id]);
    if (turfResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }
    const turf = turfResult.rows[0];

    // 2. Determine requested slots
    let requestedSlots = []; // Array of objects: { start_time, end_time }
    if (is_full_day) {
      let current = turf.opening_time;
      while (current < turf.closing_time) {
        const nextHour = addHoursToTime(current, 1);
        if (nextHour > turf.closing_time && nextHour !== '00:00:00') break;
        requestedSlots.push({ start_time: current, end_time: nextHour });
        current = nextHour;
      }
    } else {
      // time_slots should be an array of objects e.g. [{ start_time: "16:00", end_time: "17:00" }]
      requestedSlots = time_slots.map(t => {
        let start = t.start_time;
        let end = t.end_time;
        if (start.length === 5) start += ':00';
        if (end.length === 5) end += ':00';
        return { start_time: start, end_time: end };
      });
    }

    // 2.5 Prevent booking slots in the past
    const firstSlot = requestedSlots[0];
    const [sh, sm, ss] = firstSlot.start_time.split(':').map(Number);
    const [y, m, d] = date.split('-').map(Number);
    const bookingDateLocal = new Date(y, m - 1, d, sh, sm, ss || 0);
    
    if (bookingDateLocal < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot book a time slot in the past' });
    }

    // 3. Check for conflicts
    const slotStarts = requestedSlots.map(s => s.start_time);
    const conflictResult = await client.query(
      `SELECT id FROM bookings WHERE turf_id = $1 AND booking_date = $2 AND status = 'CONFIRMED' AND start_time = ANY($3)`,
      [turf_id, date, slotStarts]
    );

    if (conflictResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'One or more selected slots have already been booked by someone else!' });
    }

    // 4. Calculate total amount
    const totalAmount = requestedSlots.length * parseFloat(turf.price_per_hour);

    // 5. Create Razorpay Order
    // Razorpay receipt length must be <= 40 chars. We use a short random string + timestamp
    const shortReceipt = `rcpt_${userId.substring(0,8)}_${Date.now()}`;
    const options = {
      amount: totalAmount * 100, // Razorpay works in paise
      currency: "INR",
      receipt: shortReceipt
    };
    const order = await razorpay.orders.create(options);

    // 6. Insert bookings as PAYMENT_PENDING with the order ID
    const bookingsCreated = [];
    for (const slot of requestedSlots) {
      const bookingRes = await client.query(
        `INSERT INTO bookings (turf_id, customer_id, booking_date, start_time, end_time, status, total_price, razorpay_order_id)
         VALUES ($1, $2, $3, $4, $5, 'PAYMENT_PENDING', $6, $7) RETURNING *`,
        [turf_id, userId, date, slot.start_time, slot.end_time, turf.price_per_hour, order.id]
      );
      bookingsCreated.push(bookingRes.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Payment pending. Proceed to pay.',
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        bookings: bookingsCreated
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Customer Create Booking Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

const cancelBooking = async (req, res) => {
  const { id } = req.params; // booking_id
  const userId = req.user.id;

  try {
    const result = await db.query(
      `UPDATE bookings SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2 AND status = 'CONFIRMED' RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found or already cancelled' });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully. Time slot has been freed up.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Customer Cancel Booking Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const userId = req.user.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment verification details' });
  }

  try {
    // 1. Cryptographic Signature Verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 2. Update all bookings linked to this order to CONFIRMED
    const updateResult = await db.query(
      `UPDATE bookings 
       SET status = 'CONFIRMED', 
           razorpay_payment_id = $1, 
           razorpay_signature = $2, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE razorpay_order_id = $3 AND customer_id = $4 
       RETURNING *`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No bookings found for this order' });
    }

    // 3. Fetch full details for the receipt/success screen
    const receiptResult = await db.query(
      `SELECT b.*, t.name as turf_name, t.address, t.city, t.latitude, t.longitude
       FROM bookings b
       JOIN turfs t ON b.turf_id = t.id
       WHERE b.razorpay_order_id = $1`,
      [razorpay_order_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Booking CONFIRMED!',
      data: receiptResult.rows
    });
  } catch (err) {
    console.error('Customer Verify Payment Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getCustomerBookings = async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT b.*, t.name as turf_name, t.address, t.city, t.latitude, t.longitude
      FROM bookings b
      JOIN turfs t ON b.turf_id = t.id
      WHERE b.customer_id = $1
      ORDER BY b.booking_date DESC, b.start_time DESC
    `;
    const result = await db.query(query, [userId]);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Customer Get Bookings Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getActiveTurfs, updateProfile, getTurfSlots, createBooking, cancelBooking, verifyPayment, getCustomerBookings };
