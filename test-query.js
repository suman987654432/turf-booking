const db = require('./src/config/db');

async function testQuery() {
  try {
    const ownerId = 'c6e7a1d6-b8a6-4e9f-b201-82d9e04b8231';
    const query = `
      SELECT 
        t.*,
        (
          SELECT COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name)), '[]'::json)
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
      WHERE t.owner_id = $1
      ORDER BY t.created_at DESC
      LIMIT 1
    `;
    const result = await db.query(query, [ownerId]);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

testQuery();
