"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function grantLoansPermissions() {
    try {
        console.log('🔄 Setting up loans permissions...');
        // Create permissions for loans module
        const permissions = [
            { resource: 'loans', action: 'read' },
            { resource: 'loans', action: 'create' },
            { resource: 'loans', action: 'update' },
            { resource: 'loans', action: 'delete' },
            { resource: 'loans', action: 'manage_installments' }
        ];
        const permissionIds = [];
        for (const perm of permissions) {
            const result = await db_1.pool.query(`INSERT INTO permissions (resource, action)
         VALUES ($1, $2)
         ON CONFLICT (resource, action) DO UPDATE
         SET resource = EXCLUDED.resource
         RETURNING id`, [perm.resource, perm.action]);
            permissionIds.push(result.rows[0].id);
            console.log(`✅ Permission created: ${perm.resource}:${perm.action}`);
        }
        // Get Admin and Accounting roles
        const rolesResult = await db_1.pool.query(`SELECT id, name FROM roles WHERE name IN ('Admin', 'Super Admin', 'Accounting')`);
        if (rolesResult.rows.length === 0) {
            console.warn('⚠️  No Admin or Accounting roles found. Please create roles first.');
            return;
        }
        // Grant all loans permissions to Admin, Super Admin, and Accounting roles
        for (const role of rolesResult.rows) {
            for (const permId of permissionIds) {
                await db_1.pool.query(`INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`, [role.id, permId]);
            }
            console.log(`✅ Granted loans permissions to ${role.name} role`);
        }
        console.log('🎉 Loans permissions setup complete!');
    }
    catch (err) {
        console.error('❌ Error setting up loans permissions:', err);
        throw err;
    }
}
// Run if executed directly
if (require.main === module) {
    grantLoansPermissions()
        .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
        .catch((err) => {
        console.error('❌ Script failed:', err);
        process.exit(1);
    });
}
exports.default = grantLoansPermissions;
