import { Pool } from 'pg'

async function globalTeardown() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
  })
  // Terminate all other connections before dropping
  await pool.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'bloomtech_test' AND pid <> pg_backend_pid()
  `)
  await pool.query('DROP DATABASE IF EXISTS bloomtech_test')
  await pool.end()
  console.log('\n✅ Test database dropped\n')
}

export default globalTeardown
