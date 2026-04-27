"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Verify Railway Database Fix
 * Checks that the schema fixes were applied correctly
 */
async function verifyRailwayDatabaseFix() {
    const client = await db_1.pool.connect();
    try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔍 Verifying Railway Database Fixes');
        console.log('═══════════════════════════════════════════════════════\n');
        // Check employees.tax column
        console.log('📋 Checking employees.tax column...');
        const employeesTaxCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
        AND column_name = 'tax'
    `);
        if (employeesTaxCheck.rows.length > 0) {
            console.log('✅ employees.tax column exists');
            console.log(`   Type: ${employeesTaxCheck.rows[0].data_type}`);
            console.log(`   Nullable: ${employeesTaxCheck.rows[0].is_nullable}`);
        }
        else {
            console.log('❌ employees.tax column NOT found!');
        }
        // Check petty_cash_transactions.project_id column
        console.log('\n📋 Checking petty_cash_transactions.project_id column...');
        const pettyCashProjectIdCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'petty_cash_transactions' 
        AND column_name = 'project_id'
    `);
        if (pettyCashProjectIdCheck.rows.length > 0) {
            console.log('✅ petty_cash_transactions.project_id column exists');
            console.log(`   Type: ${pettyCashProjectIdCheck.rows[0].data_type}`);
            console.log(`   Nullable: ${pettyCashProjectIdCheck.rows[0].is_nullable}`);
        }
        else {
            console.log('❌ petty_cash_transactions.project_id column NOT found!');
        }
        // Check if old contract_id column still exists
        console.log('\n📋 Checking for old contract_id column...');
        const contractIdCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'petty_cash_transactions' 
        AND column_name = 'contract_id'
    `);
        if (contractIdCheck.rows.length > 0) {
            console.log('⚠️  Old contract_id column still exists (migration pending)');
        }
        else {
            console.log('✅ Old contract_id column removed (or never existed)');
        }
        console.log('\n═══════════════════════════════════════════════════════');
        const allGood = employeesTaxCheck.rows.length > 0 &&
            pettyCashProjectIdCheck.rows.length > 0;
        if (allGood) {
            console.log('✅ All Database Fixes Verified Successfully!');
            console.log('═══════════════════════════════════════════════════════\n');
            console.log('🚀 Your Railway backend should now work correctly!');
            console.log('📋 Remember to restart/redeploy the Railway backend service.');
        }
        else {
            console.log('⚠️  Some Fixes May Need Attention');
            console.log('═══════════════════════════════════════════════════════\n');
            console.log('Please run the fix script again:');
            console.log('   npm run fix:railway-errors');
        }
    }
    catch (err) {
        console.error('\n❌ Error during verification:', err);
        throw err;
    }
    finally {
        client.release();
        await db_1.pool.end();
    }
}
// Run if executed directly
if (require.main === module) {
    verifyRailwayDatabaseFix()
        .then(() => {
        console.log('\n✅ Verification completed');
        process.exit(0);
    })
        .catch((err) => {
        console.error('\n❌ Verification failed:', err);
        process.exit(1);
    });
}
exports.default = verifyRailwayDatabaseFix;
