import { pool } from '../db';

async function main() {
  // Show current settings perms for Admin role (id=2)
  const current = await pool.query(`
    SELECT p.resource, p.action
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = 2 AND p.resource = 'settings'
  `);
  console.log('Admin current settings permissions:', current.rows);

  // Get the settings:manage permission id
  const perm = await pool.query(
    `SELECT id FROM permissions WHERE resource = 'settings' AND action = 'manage'`
  );

  if (perm.rows.length === 0) {
    console.log('settings:manage permission not found — inserting it...');
    const inserted = await pool.query(
      `INSERT INTO permissions (resource, action, description)
       VALUES ('settings', 'manage', 'Manage roles, permissions, and users')
       RETURNING id`
    );
    perm.rows.push(inserted.rows[0]);
  }

  const permId = perm.rows[0].id;

  // Assign to Admin role (id=2)
  await pool.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     VALUES (2, $1)
     ON CONFLICT DO NOTHING`,
    [permId]
  );

  console.log(`✅ settings:manage (permission id=${permId}) granted to Admin role`);
}

main().catch(console.error).finally(() => pool.end());
