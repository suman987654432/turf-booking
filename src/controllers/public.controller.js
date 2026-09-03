const db = require('../config/db');

// Get only ACTIVE turfs for the customer app/website
const getActiveTurfs = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        (
          SELECT COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name)), '[]')
          FROM turf_sports ts
          JOIN sports s ON ts.sport_id = s.id
          WHERE ts.turf_id = t.id
        ) AS sports,
        (
          SELECT COALESCE(json_agg(json_build_object('id', ti.id, 'url', ti.image_url, 'is_primary', ti.is_primary)), '[]')
          FROM turf_images ti
          WHERE ti.turf_id = t.id
        ) AS images
      FROM turfs t
      WHERE t.status = 'ACTIVE'
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
