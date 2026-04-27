import { Pool } from 'pg'
import { pool as testPool } from './helpers'

async function globalTeardown() {
  // Close the test pool cleanly first to prevent unhandled connection errors
  await testPool.end()

  const adminPool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
  })
  // WITH (FORCE) terminates remaining connections internally — no race condition
  await adminPool.query('DROP DATABASE IF EXISTS bloomtech_test WITH (FORCE)')
  await adminPool.end()
  console.log('\n✅ Test database dropped\n')
}

export default globalTeardown
