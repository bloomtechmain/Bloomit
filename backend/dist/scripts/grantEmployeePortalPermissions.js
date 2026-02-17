"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Grant Employee Portal Permissions
 *
 * Creates and assigns permissions for the employee portal feature.
 * This script should be run after the RBAC tables are set up.
 *
 * Permissions created:
 * - employee-portal:access - Basic access to employee portal
 * - employee-portal:view-own - View own employee data
 * - employee-portal:view-all - View all employee data (admin/manager)
 */
async function grantEmployeePortalPermissions() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔐 Granting Employee Portal permissions...\n');
        // Step 1: Create employee portal permissions
        console.log('📝 Step 1: Creating employee portal permissions...');
        const permissions = [
            {
                resource: 'employee-portal',
                action: 'access',
                description: 'Access employee portal'
            },
            {
                resource: 'employee-portal',
                action: 'view-own',
                description: 'View own employee data'
            },
            {
                resource: 'employee-portal',
                action: 'view-all',
                description: 'View all employee data (admin/manager only)'
            }
        ];
        for (const perm of permissions) {
            await client.query(`INSERT INTO permissions (resource, action, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (resource, action) DO NOTHING`, [perm.resource, perm.action, perm.description]);
            console.log(`   ✓ Created permission: ${perm.resource}:${perm.action}`);
        }
        console.log('✅ Employee portal permissions created\n');
        // Step 2: Get permission IDs
        console.log('📝 Step 2: Fetching permission IDs...');
        const permissionIds = {};
        for (const perm of permissions) {
            const result = await client.query('SELECT id FROM permissions WHERE resource = $1 AND action = $2', [perm.resource, perm.action]);
            if (result.rows.length > 0) {
                permissionIds[`${perm.resource}:${perm.action}`] = result.rows[0].id;
            }
        }
        console.log('✅ Permission IDs retrieved\n');
        // Step 3: Get role IDs
        console.log('📝 Step 3: Fetching role IDs...');
        const roleQuery = `
      SELECT id, name 
      FROM roles 
      WHERE name IN ('Employee', 'Manager', 'Admin', 'Super Admin')
    `;
        const rolesResult = await client.query(roleQuery);
        const roles = {};
        rolesResult.rows.forEach((row) => {
            roles[row.name] = row.id;
        });
        console.log('   Available roles:');
        Object.keys(roles).forEach(roleName => {
            console.log(`   - ${roleName} (ID: ${roles[roleName]})`);
        });
        console.log('');
        // Step 4: Grant permissions to Employee role
        if (roles['Employee']) {
            console.log('📝 Step 4: Granting permissions to Employee role...');
            const employeePermissions = [
                'employee-portal:access',
                'employee-portal:view-own'
            ];
            for (const permKey of employeePermissions) {
                if (permissionIds[permKey]) {
                    await client.query(`INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`, [roles['Employee'], permissionIds[permKey]]);
                    console.log(`   ✓ Granted ${permKey} to Employee role`);
                }
            }
            console.log('✅ Employee role permissions granted\n');
        }
        else {
            console.log('⚠️  Employee role not found - skipping\n');
        }
        // Step 5: Grant permissions to Manager role
        if (roles['Manager']) {
            console.log('📝 Step 5: Granting permissions to Manager role...');
            const managerPermissions = [
                'employee-portal:access',
                'employee-portal:view-own',
                'employee-portal:view-all'
            ];
            for (const permKey of managerPermissions) {
                if (permissionIds[permKey]) {
                    await client.query(`INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`, [roles['Manager'], permissionIds[permKey]]);
                    console.log(`   ✓ Granted ${permKey} to Manager role`);
                }
            }
            console.log('✅ Manager role permissions granted\n');
        }
        else {
            console.log('⚠️  Manager role not found - skipping\n');
        }
        // Step 6: Grant permissions to Admin role
        if (roles['Admin']) {
            console.log('📝 Step 6: Granting permissions to Admin role...');
            const adminPermissions = [
                'employee-portal:access',
                'employee-portal:view-own',
                'employee-portal:view-all'
            ];
            for (const permKey of adminPermissions) {
                if (permissionIds[permKey]) {
                    await client.query(`INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`, [roles['Admin'], permissionIds[permKey]]);
                    console.log(`   ✓ Granted ${permKey} to Admin role`);
                }
            }
            console.log('✅ Admin role permissions granted\n');
        }
        else {
            console.log('⚠️  Admin role not found - skipping\n');
        }
        // Step 7: Grant permissions to Super Admin role
        if (roles['Super Admin']) {
            console.log('📝 Step 7: Granting permissions to Super Admin role...');
            const superAdminPermissions = [
                'employee-portal:access',
                'employee-portal:view-own',
                'employee-portal:view-all'
            ];
            for (const permKey of superAdminPermissions) {
                if (permissionIds[permKey]) {
                    await client.query(`INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`, [roles['Super Admin'], permissionIds[permKey]]);
                    console.log(`   ✓ Granted ${permKey} to Super Admin role`);
                }
            }
            console.log('✅ Super Admin role permissions granted\n');
        }
        else {
            console.log('⚠️  Super Admin role not found - skipping\n');
        }
        // Step 8: Verify permissions
        console.log('📊 Summary of Employee Portal Permissions:');
        console.log('━'.repeat(60));
        for (const [roleName, roleId] of Object.entries(roles)) {
            const permResult = await client.query(`SELECT p.resource, p.action
         FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1 AND p.resource = 'employee-portal'
         ORDER BY p.action`, [roleId]);
            console.log(`\n${roleName}:`);
            if (permResult.rows.length > 0) {
                permResult.rows.forEach((row) => {
                    console.log(`   ✓ ${row.resource}:${row.action}`);
                });
            }
            else {
                console.log('   (no employee portal permissions)');
            }
        }
        console.log('\n' + '━'.repeat(60));
        console.log('✅ Employee Portal permissions setup completed!');
    }
    catch (error) {
        console.error('❌ Error granting employee portal permissions:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    grantEmployeePortalPermissions()
        .then(() => {
        console.log('\n🎉 Script completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
}
exports.default = grantEmployeePortalPermissions;
