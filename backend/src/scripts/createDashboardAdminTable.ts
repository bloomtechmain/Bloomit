import { pool } from '../db'

async function main() {
  console.log('🔧 Creating dashboard_admins table...')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dashboard_admins (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(255) NOT NULL,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP WITHOUT TIME ZONE
    );
  `)
  console.log('✅ dashboard_admins table ready')

  // Seed default admin — password: Admin@123456
  await pool.query(`
    INSERT INTO dashboard_admins (name, email, password_hash, is_active)
    VALUES (
      'Bloom Admin',
      'admin@bloomtech.com',
      '$2b$10$N1d.iejPw9delI2LpzcwSumLncU6ru4KsybFFyjj5Azk0Eub0bd2S',
      TRUE
    )
    ON CONFLICT (email) DO NOTHING;
  `)
  console.log('✅ Default dashboard admin seeded (admin@bloomtech.com)')

  console.log('🎉 dashboard_admins setup complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error creating dashboard_admins table:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
