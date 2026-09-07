const crypto = require('crypto');
const db = require('../config/db');

const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!signature || !req.rawBody) {
    return res.status(400).json({ success: false, message: 'Missing signature or raw body' });
  }

  try {
    // 1. Verify Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody) // MUST use the raw buffer, not the parsed JSON string
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('Webhook signature mismatch!');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // 2. Parse Event
    const event = req.body;
    console.log(`Received verified Razorpay Webhook Event: ${event.event}`);

    // 3. Handle 'order.paid' or 'payment.captured'
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const paymentMethod = paymentEntity.method || 'unknown';

      if (!orderId) {
        return res.status(200).send('OK'); // Acknowledge to prevent retries
      }

      // 4. Update the Booking Status if it is PAYMENT_PENDING
      const updateQuery = `
        UPDATE bookings 
        SET status = 'CONFIRMED', 
            razorpay_payment_id = $1, 
            razorpay_signature = 'webhook_verified', 
            payment_method = $2,
            updated_at = CURRENT_TIMESTAMP 
        WHERE razorpay_order_id = $3 AND status = 'PAYMENT_PENDING'
        RETURNING id, status
      `;
      
      const result = await db.query(updateQuery, [paymentId, paymentMethod, orderId]);
      
      if (result.rows.length > 0) {
        console.log(`Webhook successfully updated ${result.rows.length} bookings for order ${orderId} to CONFIRMED!`);
      } else {
        console.log(`Webhook processed order ${orderId}, but no pending bookings were found (may have been verified by app already).`);
      }
    }

    // Always return 200 OK to acknowledge receipt, otherwise Razorpay keeps retrying for 24 hours
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook Error:', err);
    return res.status(500).send('Internal Server Error');
  }
};

module.exports = { razorpayWebhook };
