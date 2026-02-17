"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Migration script to add granular permissions to existing RBAC system
 * This script is safe to run multiple times (idempotent)
 */
async function main() {
    console.log('🔄 Migrating RBAC to granular permissions system...');
    console.log('⏰ Started at:', new Date().toISOString());
    try {
        // Check if permissions table exists
        const tableCheck = await db_1.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'permissions'
      );
    `);
        if (!tableCheck.rows[0].exists) {
            console.log('❌ Permissions table does not exist. Please run createRBACTables.ts first.');
            process.exitCode = 1;
            return;
        }
        // Get current permission count
        const beforeCount = await db_1.pool.query('SELECT COUNT(*) as count FROM permissions');
        console.log(`📊 Current permissions in database: ${beforeCount.rows[0].count}`);
        // Define all new/updated permissions
        const newPermissions = [
            // Projects - granular
            { resource: 'projects', action: 'manage_items', description: 'Manage project items and sub-tasks' },
            { resource: 'projects', action: 'manage_budget', description: 'Manage project budgets and financials' },
            // Contracts - complete set
            { resource: 'contracts', action: 'create', description: 'Create new contracts' },
            { resource: 'contracts', action: 'read', description: 'View contract information' },
            { resource: 'contracts', action: 'update', description: 'Update contract details' },
            { resource: 'contracts', action: 'delete', description: 'Delete contracts' },
            { resource: 'contracts', action: 'manage_items', description: 'Manage contract line items' },
            // Accounts - granular
            { resource: 'accounts', action: 'reconcile', description: 'Reconcile bank accounts' },
            // Payables - granular
            { resource: 'payables', action: 'approve', description: 'Approve payables for payment' },
            { resource: 'payables', action: 'pay', description: 'Process payments for payables' },
            // Receivables - granular
            { resource: 'receivables', action: 'approve', description: 'Approve receivables' },
            { resource: 'receivables', action: 'collect', description: 'Record payment collections' },
            // Assets - granular
            { resource: 'assets', action: 'depreciate', description: 'Calculate and manage asset depreciation' },
            // Time Entries - complete set (NEW MODULE)
            { resource: 'time_entries', action: 'submit_own', description: 'Submit own time entries' },
            { resource: 'time_entries', action: 'view_own', description: 'View own time entries' },
            { resource: 'time_entries', action: 'edit_own', description: 'Edit own pending time entries' },
            { resource: 'time_entries', action: 'delete_own', description: 'Delete own pending time entries' },
            { resource: 'time_entries', action: 'view_all', description: 'View all employee time entries' },
            { resource: 'time_entries', action: 'approve', description: 'Approve time entries' },
            { resource: 'time_entries', action: 'reject', description: 'Reject time entries' },
            // Petty Cash - complete set (NEW MODULE)
            { resource: 'petty_cash', action: 'create', description: 'Create petty cash transactions' },
            { resource: 'petty_cash', action: 'read', description: 'View petty cash information' },
            { resource: 'petty_cash', action: 'update', description: 'Update petty cash details' },
            { resource: 'petty_cash', action: 'reconcile', description: 'Reconcile petty cash account' },
            // Debit Cards - complete set (NEW MODULE)
            { resource: 'debit_cards', action: 'create', description: 'Create debit card records' },
            { resource: 'debit_cards', action: 'read', description: 'View debit card information' },
            { resource: 'debit_cards', action: 'update', description: 'Update debit card details' },
            { resource: 'debit_cards', action: 'delete', description: 'Delete debit cards' },
            // Notes - complete set (NEW MODULE)
            { resource: 'notes', action: 'create', description: 'Create notes' },
            { resource: 'notes', action: 'read', description: 'View notes' },
            { resource: 'notes', action: 'update', description: 'Update notes' },
            { resource: 'notes', action: 'delete', description: 'Delete notes' },
            // Todos - complete set (NEW MODULE)
            { resource: 'todos', action: 'create', description: 'Create todos' },
            { resource: 'todos', action: 'read', description: 'View todos' },
            { resource: 'todos', action: 'update', description: 'Update todos' },
            { resource: 'todos', action: 'delete', description: 'Delete todos' },
            // Analytics - granular
            { resource: 'analytics', action: 'export', description: 'Export analytics data' },
        ];
        console.log(`\n📝 Adding ${newPermissions.length} new/updated permissions...`);
        let addedCount = 0;
        let updatedCount = 0;
        for (const perm of newPermissions) {
            const result = await db_1.pool.query(`INSERT INTO permissions (resource, action, description) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (resource, action) DO UPDATE 
         SET description = EXCLUDED.description
         RETURNING (xmax = 0) AS inserted`, [perm.resource, perm.action, perm.description]);
            if (result.rows[0].inserted) {
                addedCount++;
                console.log(`  ✅ Added: ${perm.resource}:${perm.action}`);
            }
            else {
                updatedCount++;
                console.log(`  🔄 Updated: ${perm.resource}:${perm.action}`);
            }
        }
        // Get updated permission count
        const afterCount = await db_1.pool.query('SELECT COUNT(*) as count FROM permissions');
        console.log(`\n📊 Final permissions in database: ${afterCount.rows[0].count}`);
        console.log(`   - Added: ${addedCount}`);
        console.log(`   - Updated: ${updatedCount}`);
        console.log(`   - Net change: +${afterCount.rows[0].count - beforeCount.rows[0].count}`);
        // Add Employee role if it doesn't exist
        console.log('\n👥 Checking roles...');
        const employeeRoleCheck = await db_1.pool.query("SELECT id FROM roles WHERE name = 'Employee'");
        if (employeeRoleCheck.rows.length === 0) {
            const newRole = await db_1.pool.query(`INSERT INTO roles (name, description, is_system_role) 
         VALUES ('Employee', 'Basic access for regular employees (time tracking, own data)', false) 
         RETURNING id, name`, []);
            console.log(`  ✅ Added role: ${newRole.rows[0].name} (ID: ${newRole.rows[0].id})`);
        }
        else {
            console.log(`  ℹ️  Employee role already exists`);
        }
        // Check for orphaned permissions (permissions not assigned to any role)
        console.log('\n🔍 Checking for unassigned permissions...');
        const orphanedPerms = await db_1.pool.query(`
      SELECT p.resource, p.action, p.description
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.permission_id IS NULL
      ORDER BY p.resource, p.action
    `);
        if (orphanedPerms.rows.length > 0) {
            console.log(`⚠️  Found ${orphanedPerms.rows.length} permissions not assigned to any role:`);
            orphanedPerms.rows.forEach(p => {
                console.log(`   - ${p.resource}:${p.action}`);
            });
            console.log('\n💡 Run seedRBAC.ts to assign these permissions to roles.');
        }
        else {
            console.log('✅ All permissions are assigned to at least one role');
        }
        // Summary by module
        console.log('\n📦 Permissions by module:');
        const moduleStats = await db_1.pool.query(`
      SELECT resource, COUNT(*) as permission_count
      FROM permissions
      GROUP BY resource
      ORDER BY resource
    `);
        moduleStats.rows.forEach(row => {
            console.log(`   - ${row.resource}: ${row.permission_count} permissions`);
        });
        console.log('\n✅ Migration completed successfully!');
        console.log('⏰ Completed at:', new Date().toISOString());
        console.log('\n📋 Next steps:');
        console.log('   1. Review the new permissions in the permissions table');
        console.log('   2. Run seedRBAC.ts to update role assignments');
        console.log('   3. Test the permissions in the application');
    }
    catch (error) {
        console.error('\n❌ Migration failed:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Stack trace:', error.stack);
        }
        process.exitCode = 1;
    }
}
main()
    .catch((e) => {
    console.error('❌ Unexpected error:', e);
    process.exitCode = 1;
})
    .finally(() => db_1.pool.end());
