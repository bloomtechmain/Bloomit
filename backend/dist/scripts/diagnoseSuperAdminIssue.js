"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 DIAGNOSING SUPER ADMIN PERMISSION ISSUE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    const TARGET_USER_ID = 2; // dilantha@bloomtech.lk
    const TARGET_EMAIL = 'dilantha@bloomtech.lk';
    try {
        // Step 1: Check if user exists
        console.log('👤 Step 1: Checking user account...');
        const userCheck = await db_1.pool.query('SELECT id, email, name FROM users WHERE id = $1 OR email = $2', [TARGET_USER_ID, TARGET_EMAIL]);
        if (userCheck.rows.length === 0) {
            console.log(`   ❌ User not found with ID ${TARGET_USER_ID} or email ${TARGET_EMAIL}`);
            console.log('   ℹ️  Available users:');
            const allUsers = await db_1.pool.query('SELECT id, email, name FROM users ORDER BY id LIMIT 10');
            allUsers.rows.forEach(u => console.log(`      - ID: ${u.id}, Email: ${u.email}, Name: ${u.name}`));
            throw new Error('Target user not found');
        }
        const user = userCheck.rows[0];
        console.log(`   ✅ Found user: ${user.email} (ID: ${user.id}, Name: ${user.name})`);
        console.log('');
        // Step 2: Check user's roles
        console.log('🎭 Step 2: Checking user roles...');
        const userRoles = await db_1.pool.query(`SELECT r.id, r.name, r.description
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`, [user.id]);
        if (userRoles.rows.length === 0) {
            console.log(`   ❌ User has NO roles assigned!`);
        }
        else {
            console.log(`   ✅ User has ${userRoles.rows.length} role(s):`);
            userRoles.rows.forEach(role => {
                console.log(`      - ${role.name} (ID: ${role.id})`);
            });
        }
        console.log('');
        // Step 3: Check if Super Admin role exists
        console.log('🔍 Step 3: Checking Super Admin role...');
        const superAdminCheck = await db_1.pool.query(`SELECT id, name, description FROM roles WHERE name = 'Super Admin'`);
        if (superAdminCheck.rows.length === 0) {
            console.log(`   ❌ Super Admin role does NOT exist!`);
        }
        else {
            const superAdmin = superAdminCheck.rows[0];
            console.log(`   ✅ Super Admin role exists (ID: ${superAdmin.id})`);
            // Check if user has this role
            const hasSuperAdmin = userRoles.rows.some(r => r.id === superAdmin.id);
            if (hasSuperAdmin) {
                console.log(`   ✅ User HAS Super Admin role`);
            }
            else {
                console.log(`   ❌ User does NOT have Super Admin role`);
            }
        }
        console.log('');
        // Step 4: Check permissions available in the system
        console.log('📋 Step 4: Checking available permissions...');
        const allPermissions = await db_1.pool.query('SELECT COUNT(*) as count FROM permissions');
        console.log(`   ✅ Total permissions in system: ${allPermissions.rows[0].count}`);
        // Check specific permissions we care about
        const criticalPerms = ['analytics:read', 'notes:read', 'projects:read', 'todos:read'];
        console.log('   🔍 Checking critical permissions:');
        for (const perm of criticalPerms) {
            const [resource, action] = perm.split(':');
            const permCheck = await db_1.pool.query('SELECT id FROM permissions WHERE resource = $1 AND action = $2', [resource, action]);
            if (permCheck.rows.length > 0) {
                console.log(`      ✅ ${perm} exists (ID: ${permCheck.rows[0].id})`);
            }
            else {
                console.log(`      ❌ ${perm} does NOT exist`);
            }
        }
        console.log('');
        // Step 5: Check user's actual permissions
        console.log('🔐 Step 5: Checking user\'s actual permissions...');
        if (userRoles.rows.length === 0) {
            console.log('   ⚠️  User has no roles, so has no permissions');
        }
        else {
            const roleIds = userRoles.rows.map(r => r.id);
            const userPermissions = await db_1.pool.query(`SELECT DISTINCT p.resource, p.action
         FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ANY($1::int[])
         ORDER BY p.resource, p.action`, [roleIds]);
            console.log(`   📊 User has ${userPermissions.rows.length} permissions total`);
            // Check if critical permissions are included
            console.log('   🔍 Critical permissions status:');
            for (const perm of criticalPerms) {
                const [resource, action] = perm.split(':');
                const hasIt = userPermissions.rows.some(p => p.resource === resource && p.action === action);
                if (hasIt) {
                    console.log(`      ✅ ${perm}`);
                }
                else {
                    console.log(`      ❌ ${perm} - MISSING!`);
                }
            }
            if (userPermissions.rows.length <= 10) {
                console.log('');
                console.log('   All permissions:');
                userPermissions.rows.forEach(p => {
                    console.log(`      - ${p.resource}:${p.action}`);
                });
            }
        }
        console.log('');
        // Step 6: Check Super Admin role permissions (if it exists)
        if (superAdminCheck.rows.length > 0) {
            console.log('🔐 Step 6: Checking Super Admin role permissions...');
            const superAdminId = superAdminCheck.rows[0].id;
            const superAdminPerms = await db_1.pool.query(`SELECT COUNT(*) as count
         FROM role_permissions
         WHERE role_id = $1`, [superAdminId]);
            console.log(`   📊 Super Admin role has ${superAdminPerms.rows[0].count} permissions assigned`);
            if (superAdminPerms.rows[0].count === 0) {
                console.log(`   ❌ WARNING: Super Admin role has NO permissions assigned!`);
            }
        }
        console.log('');
        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 DIAGNOSIS SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        const issues = [];
        const fixes = [];
        if (userRoles.rows.length === 0) {
            issues.push('❌ User has no roles assigned');
            fixes.push('Run: npm run fix-super-admin-access');
        }
        if (superAdminCheck.rows.length === 0) {
            issues.push('❌ Super Admin role does not exist');
            fixes.push('Run: npm run fix-super-admin-access');
        }
        else {
            const hasSuperAdmin = userRoles.rows.some(r => r.name === 'Super Admin');
            if (!hasSuperAdmin) {
                issues.push('❌ User does not have Super Admin role');
                fixes.push('Run: npm run fix-super-admin-access');
            }
            if (superAdminCheck.rows.length > 0) {
                const superAdminPerms = await db_1.pool.query(`SELECT COUNT(*) as count FROM role_permissions WHERE role_id = $1`, [superAdminCheck.rows[0].id]);
                if (superAdminPerms.rows[0].count === 0) {
                    issues.push('❌ Super Admin role has no permissions');
                    fixes.push('Run: npm run fix-super-admin-access');
                }
            }
        }
        if (issues.length === 0) {
            console.log('✅ No issues detected! Permissions appear to be correctly configured.');
            console.log('');
            console.log('🔍 If you\'re still experiencing 401 errors:');
            console.log('   1. Check that you\'ve logged out and back in');
            console.log('   2. Check the Railway backend logs for "LOGIN DEBUG" messages');
            console.log('   3. Verify the JWT token expiry (15 minutes)');
        }
        else {
            console.log('⚠️  Issues detected:');
            issues.forEach(issue => console.log(`   ${issue}`));
            console.log('');
            console.log('🔧 Recommended fixes:');
            fixes.forEach(fix => console.log(`   ${fix}`));
        }
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
    }
    catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ ERROR DURING DIAGNOSIS');
        console.error('═══════════════════════════════════════════════════════');
        console.error('');
        console.error('Error details:', error.message);
        console.error('');
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        console.error('');
        console.error('═══════════════════════════════════════════════════════');
        throw error;
    }
}
main()
    .catch((e) => {
    console.error('Script failed:', e.message);
    process.exitCode = 1;
})
    .finally(() => {
    db_1.pool.end();
});
