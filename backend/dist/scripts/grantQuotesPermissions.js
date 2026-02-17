"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function grantQuotesPermissions() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔍 Checking quotes permissions...');
        // Check if quotes permissions exist
        const permCheck = await client.query(`
      SELECT * FROM permissions 
      WHERE resource = 'quotes'
    `);
        if (permCheck.rows.length === 0) {
            console.log('⚠️  Quotes permissions not found. Creating them...');
            // Create quotes permissions
            await client.query(`
        INSERT INTO permissions (resource, action, description)
        VALUES 
          ('quotes', 'read', 'View quotes'),
          ('quotes', 'manage', 'Create, update, and delete quotes')
        ON CONFLICT (resource, action) DO NOTHING
      `);
            console.log('✅ Quotes permissions created');
        }
        else {
            console.log('✅ Quotes permissions already exist');
        }
        // Get Super Admin role ID
        const roleResult = await client.query(`
      SELECT id FROM roles WHERE name = 'Super Admin'
    `);
        if (roleResult.rows.length > 0) {
            const superAdminRoleId = roleResult.rows[0].id;
            // Get quotes permission IDs
            const permsResult = await client.query(`
        SELECT id FROM permissions WHERE resource = 'quotes'
      `);
            // Grant quotes permissions to Super Admin
            for (const perm of permsResult.rows) {
                await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [superAdminRoleId, perm.id]);
            }
            console.log('✅ Quotes permissions granted to Super Admin role');
        }
        // Show all quotes-related data
        const allPerms = await client.query(`
      SELECT 
        r.name as role_name,
        p.resource,
        p.action,
        p.description
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.resource = 'quotes'
      ORDER BY r.name, p.action
    `);
        console.log('\n📋 Current quotes permissions:');
        console.table(allPerms.rows);
    }
    catch (error) {
        console.error('❌ Error granting quotes permissions:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
grantQuotesPermissions()
    .then(() => {
    console.log('\n✅ Permissions setup completed');
    process.exit(0);
})
    .catch((err) => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
});
