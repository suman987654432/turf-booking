const db = require('../config/db');

// Get only ACTIVE turfs for the customer app/website
const getActiveTurfs = async (req, res) => {
  const { lat, lng, radius } = req.query;

  try {
    let selectDistance = "NULL AS distance_km";
    let whereClause = "WHERE t.status = 'ACTIVE'";
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

module.exports = { getActiveTurfs, updateProfile };
