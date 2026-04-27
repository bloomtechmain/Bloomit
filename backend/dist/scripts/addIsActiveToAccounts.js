"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function addIsActiveToAccounts() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔄 Adding is_active column to company_bank_accounts...');
        await client.query('BEGIN');
        // Add is_active column if it doesn't exist
        await client.query(`
      ALTER TABLE company_bank_accounts 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
    `);
        // Create index for performance
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_is_active 
      ON company_bank_accounts(is_active)
    `);
        // Update existing records to be active
        await client.query(`
      UPDATE company_bank_accounts 
      SET is_active = TRUE 
      WHERE is_active IS NULL
    `);
        await client.query('COMMIT');
        console.log('✅ is_active column added successfully');
        console.log('✅ Index created successfully');
        console.log('✅ Existing records updated');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error adding is_active column:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    addIsActiveToAccounts()
        .then(() => {
        console.log('✅ Migration complete');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
}
exports.default = addIsActiveToAccounts;
