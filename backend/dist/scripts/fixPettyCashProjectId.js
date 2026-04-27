"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function fixPettyCashProjectId() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔧 Fixing petty_cash_transactions table...\n');
        // Add project_id column if it doesn't exist
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
    `);
        console.log('✅ project_id column verified');
        // Check if contract_id column exists and migrate data if needed
        const checkContractId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'petty_cash_transactions' 
        AND column_name = 'contract_id'
    `);
        if (checkContractId.rows.length > 0) {
            console.log('📋 Found contract_id column, migrating data...');
            // Copy data from contract_id to project_id
            await client.query(`
        UPDATE petty_cash_transactions 
        SET project_id = contract_id 
        WHERE contract_id IS NOT NULL AND project_id IS NULL
      `);
            console.log('✅ Data migrated from contract_id to project_id');
            // Drop the old contract_id column
            await client.query(`
        ALTER TABLE petty_cash_transactions DROP COLUMN contract_id
      `);
            console.log('✅ Removed old contract_id column');
        }
        console.log('\n🎉 Petty cash transactions table fixed!');
        console.log('✅ project_id column is now available');
        console.log('🔄 The backend server should automatically pick up these changes');
    }
    catch (err) {
        console.error('❌ Error during fix:', err);
        throw err;
    }
    finally {
        client.release();
        await db_1.pool.end();
    }
}
// Run if executed directly
if (require.main === module) {
    fixPettyCashProjectId()
        .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
        .catch((err) => {
        console.error('\n❌ Script failed:', err);
        process.exit(1);
    });
}
exports.default = fixPettyCashProjectId;
