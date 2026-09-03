const db = require('../config/db');

// Get only ACTIVE turfs for the customer app/website
const getActiveTurfs = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name)
          ) FILTER (WHERE s.id IS NOT NULL), 
          '[]'
        ) AS sports
      FROM turfs t
      LEFT JOIN turf_sports ts ON t.id = ts.turf_id
      LEFT JOIN sports s ON ts.sport_id = s.id
      WHERE t.status = 'ACTIVE'
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    const turfResult = await db.query(query);

    return res.status(200).json({
      success: true,
      data: turfResult.rows
    });
  } catch (err) {
    console.error('Public Get Turfs Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getActiveTurfs };
