import { pool } from '../db'

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      vendor_id SERIAL PRIMARY KEY,
      vendor_name VARCHAR(150) NOT NULL,
      contact_email VARCHAR(100),
      contact_phone VARCHAR(30),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('vendors table ensured')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
