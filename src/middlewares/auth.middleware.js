const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
    }

    // Fetch user from DB
    const result = await db.query('SELECT id, name, email, phone, role, status FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
       return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Authentication Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication' });
  }
};

module.exports = { authenticateUser };
