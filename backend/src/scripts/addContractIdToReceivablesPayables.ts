import { pool } from '../db';

async function addContractIdToReceivablesPayables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Add contract_id to receivables and payables...\n');
    
    await client.query('BEGIN');
    
    // 1. Add contract_id to receivables table
    console.log('📝 Step 1: Adding contract_id column to receivables table...');
    await client.query(`
      ALTER TABLE receivables 
      ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(contract_id) ON DELETE CASCADE
    `);
    console.log('✅ contract_id column added to receivables\n');
    
    // 2. Add contract_id to payables table
    console.log('📝 Step 2: Adding contract_id column to payables table...');
    await client.query(`
      ALTER TABLE payables 
      ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(contract_id) ON DELETE CASCADE
    `);
    console.log('✅ contract_id column added to payables\n');
    
    // 3. Drop project_id from receivables
    console.log('📝 Step 3: Removing project_id column from receivables table...');
    await client.query(`
      ALTER TABLE receivables 
      DROP COLUMN IF EXISTS project_id CASCADE
    `);
    console.log('✅ project_id column removed from receivables\n');
    
    // 4. Drop project_id from payables
    console.log('📝 Step 4: Removing project_id column from payables table...');
    await client.query(`
      ALTER TABLE payables 
      DROP COLUMN IF EXISTS project_id CASCADE
    `);
    console.log('✅ project_id column removed from payables\n');
    
    // 5. Create indexes for better performance
    console.log('📝 Step 5: Creating indexes for performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receivables_contract_id ON receivables(contract_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payables_contract_id ON payables(contract_id)
    `);
    console.log('✅ Indexes created\n');
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Added contract_id to receivables table');
    console.log('  - Added contract_id to payables table');
    console.log('  - Removed project_id from receivables table');
    console.log('  - Removed project_id from payables table');
    console.log('  - Created indexes for performance');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
addContractIdToReceivablesPayables()
  .then(() => {
    console.log('\n✅ All done! Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  });
