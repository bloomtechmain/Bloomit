"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function grantDeletePermissions() {
    console.log('🔄 Granting delete permissions to Admin and Super Admin roles...');
    try {
        // Create permissions if they don't exist
        console.log('📝 Creating delete permissions...');
        await db_1.pool.query(`
      INSERT INTO permissions (resource, action, description)
      VALUES 
        ('purchase_orders', 'delete', 'Can delete purchase orders'),
        ('accounts', 'delete', 'Can delete bank accounts')
      ON CONFLICT (resource, action) DO UPDATE 
      SET description = EXCLUDED.description
    `);
        console.log('✅ Delete permissions created');
        // Get role IDs
        const rolesResult = await db_1.pool.query(`SELECT id, name FROM roles WHERE name IN ('Admin', 'Super Admin')`);
        const roleMap = {};
        rolesResult.rows.forEach((role) => {
            roleMap[role.name] = role.id;
        });
        // Get permission IDs
        const permsResult = await db_1.pool.query(`
      SELECT id, resource, action 
      FROM permissions 
      WHERE (resource = 'purchase_orders' AND action = 'delete')
         OR (resource = 'accounts' AND action = 'delete')
    `);
        const permMap = {};
        permsResult.rows.forEach((p) => {
            permMap[`${p.resource}:${p.action}`] = p.id;
        });
        // Grant permissions to roles
        console.log('🔗 Assigning permissions to roles...');
        let count = 0;
        for (const roleName of ['Admin', 'Super Admin']) {
            for (const permKey of ['purchase_orders:delete', 'accounts:delete']) {
                if (roleMap[roleName] && permMap[permKey]) {
                    await db_1.pool.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [roleMap[roleName], permMap[permKey]]);
                    count++;
                }
            }
        }
        console.log(`✅ ${count} permissions assigned`);
        // Verify permissions were granted
        const result = await db_1.pool.query(`
      SELECT r.name as role_name, p.resource, p.action
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE (p.resource = 'purchase_orders' AND p.action = 'delete')
         OR (p.resource = 'accounts' AND p.action = 'delete')
      ORDER BY r.name, p.resource, p.action
    `);
        console.log('\n📋 Granted permissions:');
        result.rows.forEach(row => {
            console.log(`  - ${row.role_name}: ${row.resource}:${row.action}`);
        });
        console.log('\n🎉 Delete permissions setup completed successfully!');
    }
    catch (error) {
        console.error('❌ Error granting delete permissions:', error);
        throw error;
    }
}
// Run if executed directly
if (require.main === module) {
    grantDeletePermissions()
        .then(() => {
        console.log('\n✅ Permission grant complete');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Permission grant failed:', error);
        process.exit(1);
    })
        .finally(() => db_1.pool.end());
}
exports.default = grantDeletePermissions;
