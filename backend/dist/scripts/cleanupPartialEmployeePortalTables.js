"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Cleanup Partial Employee Portal Tables
 *
 * This script drops any partially created employee portal tables
 * so the main initialization script can run cleanly.
 */
async function cleanupPartialTables() {
    const client = await db_1.pool.connect();
    try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🧹 Cleaning up partial employee portal tables...');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        // Drop tables in reverse order (to respect foreign key constraints)
        const tablesToDrop = [
            'payslip_signature_tokens',
            'payslip_signatures',
            'employee_documents',
            'employee_portal_settings',
            'active_timers',
            'announcements',
            'employee_notifications',
            'employee_audit_log'
        ];
        for (const table of tablesToDrop) {
            try {
                await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`✅ Dropped ${table}`);
            }
            catch (error) {
                console.log(`⚠️  Could not drop ${table} (might not exist)`);
            }
        }
        console.log('');
        console.log('✅ Cleanup complete!');
        console.log('');
    }
    catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
    finally {
        client.release();
        await db_1.pool.end();
    }
}
// Run cleanup
cleanupPartialTables()
    .then(() => {
    console.log('✅ Done!');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
});
