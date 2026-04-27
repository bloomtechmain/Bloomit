"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function fix() {
    // Get or create Admin role with all permissions
    let role = await pool.query(`SELECT id FROM roles WHERE name = 'Admin'`);
    let adminRoleId;
    if (!role.rows.length) {
        const r = await pool.query(`INSERT INTO roles (name, description, is_system_role) VALUES ($1,$2,TRUE) RETURNING id`, ['Admin', 'Company administrator with full access']);
        adminRoleId = r.rows[0].id;
        console.log('Created Admin role:', adminRoleId);
    }
    else {
        adminRoleId = role.rows[0].id;
        console.log('Admin role ID:', adminRoleId);
    }
    // Grant ALL permissions to Admin role
    const perms = await pool.query('SELECT id FROM permissions');
    for (const p of perms.rows) {
        await pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [adminRoleId, p.id]);
    }
    console.log(`Granted ${perms.rows.length} permissions to Admin role`);
    // Find all users who have a tenant_id (company admins) but no role assigned
    const users = await pool.query(`
    SELECT u.id, u.email, u.tenant_id
    FROM public.users u
    WHERE u.tenant_id IS NOT NULL
  `);
    console.log(`\nFound ${users.rows.length} tenant users:`);
    for (const u of users.rows) {
        await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [u.id, adminRoleId]);
        console.log(`  ✅ Assigned Admin role to ${u.email} (tenant_id: ${u.tenant_id})`);
    }
    console.log('\nDone!');
}
fix().catch(e => { console.error('❌', e.message); process.exit(1); }).finally(() => pool.end());
