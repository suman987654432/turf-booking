const db = require('../config/db');

const createTurf = async (req, res) => {
  const { name, description, address, city, state, pincode, latitude, longitude, price_per_hour, opening_time, closing_time, sports } = req.body;
  const userId = req.user.id;

  // Basic validation
  if (!name || !address || !city || !price_per_hour || !opening_time || !closing_time) {
    return res.status(400).json({ success: false, message: 'Missing required fields for Turf' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN'); // Start Transaction

    // 1. Get the owner ID for this user
    const ownerResult = await client.query('SELECT id FROM owners WHERE user_id = $1', [userId]);
    if (ownerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Owner profile not found' });
    }
    const ownerId = ownerResult.rows[0].id;

    // 2. Insert the Turf
    const turfQuery = `
      INSERT INTO turfs (owner_id, name, description, address, city, state, pincode, latitude, longitude, price_per_hour, opening_time, closing_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const turfValues = [ownerId, name, description, address, city, state, pincode, latitude || null, longitude || null, price_per_hour, opening_time, closing_time];
    const turfResult = await client.query(turfQuery, turfValues);
    const newTurf = turfResult.rows[0];

    // 3. Link sports if provided
    if (sports && Array.isArray(sports) && sports.length > 0) {
       for (const sportItem of sports) {
         let sportId = sportItem;
         
         // Check if it's a valid UUID. If not, assume it's a name like "Cricket"
         const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
         if (!uuidRegex.test(sportItem)) {
            const sportResult = await client.query('SELECT id FROM sports WHERE name ILIKE $1', [sportItem]);
            if (sportResult.rows.length > 0) {
              sportId = sportResult.rows[0].id;
            } else {
              // If the sport doesn't exist in the database, skip it
              continue; 
            }
         }

         await client.query(
           'INSERT INTO turf_sports (turf_id, sport_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
           [newTurf.id, sportId]
         );
       }
    }

    await client.query('COMMIT');
    
    // Attach the sports to the response object so you can see them!
    newTurf.sports = sports || [];

    return res.status(201).json({
      success: true,
      message: 'Turf created successfully. Awaiting admin approval.',
      data: newTurf
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create Turf Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error while creating turf' });
  } finally {
    client.release();
  }
};

const getOwnerTurfs = async (req, res) => {
  const userId = req.user.id;

  try {
    const ownerResult = await db.query('SELECT id FROM owners WHERE user_id = $1', [userId]);
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Owner profile not found' });
    }
    const ownerId = ownerResult.rows[0].id;

    // Fetch turfs with their associated sports
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
      WHERE t.owner_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    const turfResult = await db.query(query, [ownerId]);

    return res.status(200).json({
      success: true,
      data: turfResult.rows
    });
  } catch (err) {
    console.error('Get Owner Turfs Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateTurf = async (req, res) => {
  const { id } = req.params;
  const { name, description, address, city, state, pincode, latitude, longitude, price_per_hour, opening_time, closing_time } = req.body;
  const userId = req.user.id;

  try {
    const ownerResult = await db.query('SELECT id FROM owners WHERE user_id = $1', [userId]);
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Owner profile not found' });
    }
    const ownerId = ownerResult.rows[0].id;

    // Verify turf belongs to this owner
    const turfCheck = await db.query('SELECT id FROM turfs WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    if (turfCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Turf not found or you do not have permission to edit it' });
    }

    // Update query
    const updateQuery = `
      UPDATE turfs 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          address = COALESCE($3, address),
          city = COALESCE($4, city),
          state = COALESCE($5, state),
          pincode = COALESCE($6, pincode),
          latitude = COALESCE($7, latitude),
          longitude = COALESCE($8, longitude),
          price_per_hour = COALESCE($9, price_per_hour),
          opening_time = COALESCE($10, opening_time),
          closing_time = COALESCE($11, closing_time),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 AND owner_id = $13
      RETURNING *
    `;
    const updateValues = [name, description, address, city, state, pincode, latitude, longitude, price_per_hour, opening_time, closing_time, id, ownerId];
    
    const result = await db.query(updateQuery, updateValues);
    
    return res.status(200).json({ success: true, message: 'Turf updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Update Turf Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteTurf = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const ownerResult = await db.query('SELECT id FROM owners WHERE user_id = $1', [userId]);
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Owner profile not found' });
    }
    const ownerId = ownerResult.rows[0].id;

    const result = await db.query('DELETE FROM turfs WHERE id = $1 AND owner_id = $2 RETURNING id', [id, ownerId]);
    
    if (result.rows.length === 0) {
       return res.status(404).json({ success: false, message: 'Turf not found or you do not have permission to delete it' });
    }

    return res.status(200).json({ success: true, message: 'Turf deleted successfully' });
  } catch (err) {
    console.error('Delete Turf Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { createTurf, getOwnerTurfs, updateTurf, deleteTurf };
