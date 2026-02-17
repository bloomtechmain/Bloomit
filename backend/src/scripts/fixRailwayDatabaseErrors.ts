import { pool } from '../db'

/**
 * Fix Railway Database Schema Errors
 * 
 * This script fixes two database schema mismatches causing 500 errors:
 * 1. Missing 'tax' column in employees table
 * 2. Missing 'project_id' column in petty_cash_transactions table
 */
async function fixRailwayDatabaseErrors() {
  const client = await pool.connect()
  
  try {
    console.log('═══════════════════════════════════════════════════════')
    console.log('🔧 Fixing Railway Database Schema Issues')
    console.log('═══════════════════════════════════════════════════════\n')
    
    // ==================== FIX 1: Employees Table ====================
    console.log('📋 Fix 1: Adding tax column to employees table...')
    
    await client.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE employees ADD COLUMN tax VARCHAR(100);
          RAISE NOTICE 'Added tax column';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'tax column already exists';
        END;
      END $$;
    `)
    console.log('✅ employees.tax column verified\n')
    
    // ==================== FIX 2: Petty Cash Transactions ====================
    console.log('📋 Fix 2: Adding project_id column to petty_cash_transactions...')
    
    await client.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE petty_cash_transactions ADD COLUMN project_id INTEGER;
          RAISE NOTICE 'Added project_id column';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'project_id column already exists';
        END;
      END $$;
    `)
    console.log('✅ petty_cash_transactions.project_id column verified')
    
    // Check if contract_id column exists and migrate data if needed
    const checkContractId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'petty_cash_transactions' 
        AND column_name = 'contract_id'
    `)
    
    if (checkContractId.rows.length > 0) {
      console.log('📋 Found old contract_id column, migrating data...')
      
      // Copy data from contract_id to project_id
      await client.query(`
        UPDATE petty_cash_transactions 
        SET project_id = contract_id 
        WHERE contract_id IS NOT NULL AND project_id IS NULL
      `)
      console.log('✅ Data migrated from contract_id to project_id')
      
      // Drop the old contract_id column
      await client.query(`
        ALTER TABLE petty_cash_transactions DROP COLUMN contract_id
      `)
      console.log('✅ Removed old contract_id column')
    }
    
    console.log('\n═══════════════════════════════════════════════════════')
    console.log('✅ All Database Fixes Applied Successfully!')
    console.log('═══════════════════════════════════════════════════════\n')
    
    console.log('📋 Summary of changes:')
    console.log('   ✅ employees.tax column added')
    console.log('   ✅ petty_cash_transactions.project_id column added')
    console.log('')
    console.log('🔄 The backend server should now work correctly!')
    console.log('🚀 Redeploy or restart your Railway backend service to apply changes.')
    console.log('')
    
  } catch (err) {
    console.error('\n❌ Error during database fixes:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

// Run if executed directly
if (require.main === module) {
  fixRailwayDatabaseErrors()
    .then(() => {
      console.log('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((err) => {
      console.error('\n❌ Script failed:', err)
      process.exit(1)
    })
}

export default fixRailwayDatabaseErrors
