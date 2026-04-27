"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Add tax column to employees table
 * Fixes Railway database schema mismatch
 */
async function addTaxColumnToEmployees() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔧 Adding tax column to employees table...\n');
        // Add tax column if it doesn't exist
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
    `);
        console.log('✅ tax column verified');
        console.log('\n🎉 Employees table updated!');
        console.log('✅ tax column is now available');
        console.log('🔄 The backend server should automatically pick up these changes');
    }
    catch (err) {
        console.error('❌ Error during migration:', err);
        throw err;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    addTaxColumnToEmployees()
        .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
        .catch((err) => {
        console.error('\n❌ Script failed:', err);
        process.exit(1);
    });
}
exports.default = addTaxColumnToEmployees;
