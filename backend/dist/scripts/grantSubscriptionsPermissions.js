"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function grantSubscriptionsPermissions() {
    try {
        console.log('🔄 Setting up subscriptions permissions...');
        // Create permissions for subscriptions module
        const permissions = [
            { resource: 'subscriptions', action: 'read' },
            { resource: 'subscriptions', action: 'create' },
            { resource: 'subscriptions', action: 'update' },
            { resource: 'subscriptions', action: 'delete' }
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
        // Grant all subscriptions permissions to Admin, Super Admin, and Accounting roles
        for (const role of rolesResult.rows) {
            for (const permId of permissionIds) {
                await db_1.pool.query(`INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`, [role.id, permId]);
            }
            console.log(`✅ Granted subscriptions permissions to ${role.name} role`);
        }
        console.log('🎉 Subscriptions permissions setup complete!');
    }
    catch (err) {
        console.error('❌ Error setting up subscriptions permissions:', err);
        throw err;
    }
}
// Run if executed directly
if (require.main === module) {
    grantSubscriptionsPermissions()
        .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
        .catch((err) => {
        console.error('❌ Script failed:', err);
        process.exit(1);
    });
}
exports.default = grantSubscriptionsPermissions;
