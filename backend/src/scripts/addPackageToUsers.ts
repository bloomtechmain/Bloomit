import { pool } from '../db'

async function main() {
  // Add package_id column to users if it doesn't exist
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id) DEFAULT NULL;
  `)
  console.log('✅ package_id column added to users table')

  // Get the Pro plan id
  const result = await pool.query(`SELECT id FROM packages WHERE name = 'pro' LIMIT 1;`)
  if (result.rows.length === 0) {
    throw new Error('Pro package not found. Run createPackagesTable.ts first.')
  }
  const proId = result.rows[0].id

  // Update all users without a package to Pro
  const updated = await pool.query(`
    UPDATE users SET package_id = $1 WHERE package_id IS NULL;
  `, [proId])
  console.log(`✅ Updated ${updated.rowCount} user(s) to Pro plan`)
}

main()
  .catch((e) => {
    console.error('❌ Error adding package to users:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
