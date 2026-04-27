import { pool as testPool } from './helpers'
import { pool as appPool } from '../db'

async function globalTeardown() {
  // Close all pools cleanly. The test database is left in place and will be
  // dropped and recreated by globalSetup at the start of the next test run.
  await Promise.allSettled([testPool.end(), appPool.end()])
  console.log('\n✅ Test pools closed\n')
}

export default globalTeardown
