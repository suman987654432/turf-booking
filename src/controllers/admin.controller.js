const db = require('../config/db');

// Get all turfs (pending, active, rejected) for admin dashboard
const getAllTurfs = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        o.business_name,
        (
          SELECT COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name)), '[]')
          FROM turf_sports ts
          JOIN sports s ON ts.sport_id = s.id
          WHERE ts.turf_id = t.id
        ) AS sports,
        (
          SELECT COALESCE(json_agg(json_build_object('id', ti.id, 'image_url', ti.image_url, 'sort_order', ti.sort_order) ORDER BY ti.sort_order ASC), '[]')
          FROM turf_images ti
          WHERE ti.turf_id = t.id
        ) AS images
      FROM turfs t
      JOIN owners o ON t.owner_id = o.id
      ORDER BY t.created_at DESC
    `;
    const turfResult = await db.query(query);

    return res.status(200).json({
      success: true,
      data: turfResult.rows
    });
  } catch (err) {
    console.error('Admin Get All Turfs Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Approve a turf
const approveTurf = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE turfs SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Turf approved and is now ACTIVE',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Admin Approve Turf Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Reject a turf
const rejectTurf = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE turfs SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Turf has been REJECTED',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Admin Reject Turf Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getAllOwners = async (req, res) => {
  try {
    const query = `
      SELECT 
        o.id AS owner_id,
        o.business_name,
        o.created_at AS owner_created_at,
        u.id AS user_id,
        u.name,
        u.email,
        u.phone,
        COUNT(t.id) AS turf_count
      FROM owners o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN turfs t ON o.id = t.owner_id
      GROUP BY o.id, u.id
      ORDER BY o.created_at DESC
    `;
    const result = await db.query(query);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Admin Get All Owners Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteOwner = async (req, res) => {
  const { id } = req.params; // This is the owner_id

  try {
    // Find the user_id associated with this owner_id
    const ownerResult = await db.query('SELECT user_id FROM owners WHERE id = $1', [id]);
    
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    const userId = ownerResult.rows[0].user_id;

    // Delete the user. Because of ON DELETE CASCADE, this will delete the owner, turfs, etc.
    await db.query(`DELETE FROM users WHERE id = $1 AND role = 'OWNER'`, [userId]);

    return res.status(200).json({
      success: true,
      message: 'Owner and all associated data successfully deleted'
    });
  } catch (err) {
    console.error('Admin Delete Owner Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteTurf = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM turfs WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
       return res.status(404).json({ success: false, message: 'Turf not found' });
    }

    return res.status(200).json({ success: true, message: 'Turf deleted successfully' });
  } catch (err) {
    console.error('Admin Delete Turf Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getSportsStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        s.name as sport_name,
        COUNT(ts.turf_id) as turf_count,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as turfs
      FROM sports s
      LEFT JOIN turf_sports ts ON s.id = ts.sport_id
      LEFT JOIN turfs t ON ts.turf_id = t.id
      GROUP BY s.id, s.name
      ORDER BY turf_count DESC
    `;
    const result = await db.query(query);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Admin Get Sports Stats Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const query = `
      SELECT id, name, email, phone, created_at
      FROM users
      WHERE role = 'CUSTOMER'
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Admin Get All Customers Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getAllTurfs, approveTurf, rejectTurf, getAllOwners, deleteOwner, deleteTurf, getSportsStats, getAllCustomers };
