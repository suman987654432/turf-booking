const db = require('../config/db');

const seedSports = async () => {
  const query = `
    INSERT INTO sports (name) VALUES ('Cricket'), ('Football'), ('Tennis'), ('Basketball')
    ON CONFLICT (name) DO NOTHING;
  `;
  try {
    await db.query(query);
    console.log('Sports seeded successfully');
  } catch (err) {
    console.error('Error seeding sports', err);
  } finally {
    db.pool.end();
  }
};

seedSports();
