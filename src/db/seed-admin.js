const bcrypt = require('bcryptjs');
const db = require('../config/db');

const seedAdmin = async () => {
  const email = 'admin@gmail.com';
  const password = 'suman9876';

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO users (name, email, password_hash, role) 
      VALUES ('Super Admin', $1, $2, 'ADMIN')
      ON CONFLICT (email) DO NOTHING;
    `;
    
    await db.query(query, [email, password_hash]);
    console.log('Admin user seeded successfully! You can now log in.');
  } catch (err) {
    console.error('Error seeding admin', err);
  } finally {
    db.pool.end();
  }
};

seedAdmin();
