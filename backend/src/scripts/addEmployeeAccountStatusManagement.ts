import { pool } from '../db'

/**
 * Migration: Add account status management for employees and users
 * - Adds account_status tracking to users table
 * - Adds suspension and termination tracking to employees table
 * - Supports 2-year data retention policy
 */

async function main() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Adding account status management columns...\n')

    await client.query('BEGIN')

    // 1. Add account status columns to users table
    console.log('📋 Updating users table...')
    await client.query(`
      DO $$ 
      BEGIN
        -- Add account_status column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='account_status'
        ) THEN
          ALTER TABLE users ADD COLUMN account_status VARCHAR(20) DEFAULT 'active' 
            CHECK (account_status IN ('active', 'suspended', 'terminated'));
          ALTER TABLE users ADD COLUMN status_changed_at TIMESTAMP;
          ALTER TABLE users ADD COLUMN status_changed_by INT REFERENCES users(id) ON DELETE SET NULL;
          ALTER TABLE users ADD COLUMN status_reason TEXT;
          
          COMMENT ON COLUMN users.account_status IS 'Account status: active, suspended (reversible), or terminated (permanent)';
          COMMENT ON COLUMN users.status_changed_at IS 'Timestamp when status was last changed';
          COMMENT ON COLUMN users.status_changed_by IS 'User ID who changed the status';
          COMMENT ON COLUMN users.status_reason IS 'Reason for status change';
        END IF;
      END $$;
    `)
    console.log('✅ Users table updated')

    // 2. Add suspension tracking columns to employees table
    console.log('📋 Adding suspension tracking to employees table...')
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='employees' AND column_name='suspended_at'
        ) THEN
          ALTER TABLE employees ADD COLUMN suspended_at TIMESTAMP;
          ALTER TABLE employees ADD COLUMN suspended_by INT REFERENCES users(id) ON DELETE SET NULL;
          ALTER TABLE employees ADD COLUMN suspended_reason TEXT;
          
          COMMENT ON COLUMN employees.suspended_at IS 'Timestamp when employee was suspended';
          COMMENT ON COLUMN employees.suspended_by IS 'User ID who suspended the employee';
          COMMENT ON COLUMN employees.suspended_reason IS 'Reason for suspension';
        END IF;
      END $$;
    `)
    console.log('✅ Suspension tracking added')

    // 3. Add termination tracking columns to employees table
    console.log('📋 Adding termination tracking to employees table...')
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='employees' AND column_name='terminated_at'
        ) THEN
          ALTER TABLE employees ADD COLUMN terminated_at TIMESTAMP;
          ALTER TABLE employees ADD COLUMN terminated_by INT REFERENCES users(id) ON DELETE SET NULL;
          ALTER TABLE employees ADD COLUMN terminated_reason TEXT;
          ALTER TABLE employees ADD COLUMN scheduled_purge_date DATE;
          
          COMMENT ON COLUMN employees.terminated_at IS 'Timestamp when employee was terminated';
          COMMENT ON COLUMN employees.terminated_by IS 'User ID who terminated the employee';
          COMMENT ON COLUMN employees.terminated_reason IS 'Reason for termination';
          COMMENT ON COLUMN employees.scheduled_purge_date IS 'Date when employee data should be purged (2 years after termination)';
        END IF;
      END $$;
    `)
    console.log('✅ Termination tracking added')

    // 4. Create index for efficient purge job queries
    console.log('📋 Creating indexes...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_scheduled_purge 
        ON employees(scheduled_purge_date) 
        WHERE scheduled_purge_date IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_users_account_status 
        ON users(account_status);
    `)
    console.log('✅ Indexes created')

    // 5. Update existing records to have default status
    console.log('📋 Updating existing records...')
    await client.query(`
      UPDATE users 
      SET account_status = 'active' 
      WHERE account_status IS NULL;
    `)
    console.log('✅ Existing records updated')

    await client.query('COMMIT')
    console.log('\n🎉 Account status management migration completed successfully!')
    console.log('\n📝 Summary:')
    console.log('   - Users table: Added account_status, status_changed_at, status_changed_by, status_reason')
    console.log('   - Employees table: Added suspension tracking (suspended_at, suspended_by, suspended_reason)')
    console.log('   - Employees table: Added termination tracking (terminated_at, terminated_by, terminated_reason, scheduled_purge_date)')
    console.log('   - Created indexes for performance optimization')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
