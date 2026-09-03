const db = require('../config/db');

const seedUser = async () => {
  const seedQuery = `
    INSERT INTO users (cognito_user_id, name, email, phone, role) 
    VALUES ('mock_cognito_id', 'Test Admin', 'admin@test.com', '1234567890', 'ADMIN')
    ON CONFLICT (cognito_user_id) DO NOTHING;
  `;

  try {
    console.log('Seeding mock admin user...');
    await db.query(seedQuery);
    console.log('User seeded successfully');
  } catch (err) {
    console.error('Error seeding user:', err);
  } finally {
    db.pool.end();
  }
};

seedUser();
