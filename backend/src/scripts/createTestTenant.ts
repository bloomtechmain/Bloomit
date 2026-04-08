import { createTenant } from '../services/tenant-service';
import { pool } from '../db';
import bcrypt from 'bcryptjs';

async function main() {
  const tenantName = process.argv[2] || 'TestCompany';
  const userEmail = process.argv[3] || 'user@testcompany.com';
  const userPassword = process.argv[4] || 'Test@1234';

  console.log(`\n🏢 Creating tenant: ${tenantName}`);

  const { tenantId, schemaName } = await createTenant(tenantName);
  console.log(`✅ Tenant created — ID: ${tenantId}, Schema: ${schemaName}`);

  const passwordHash = await bcrypt.hash(userPassword, 10);
  const result = await pool.query(
    `INSERT INTO public.users (name, email, password_hash, tenant_id, account_status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id`,
    [tenantName + ' Admin', userEmail, passwordHash, tenantId]
  );
  const userId = result.rows[0].id;

  // Get or create Admin role
  let role = await pool.query(`SELECT id FROM roles WHERE name = 'Admin'`);
  let adminRoleId: number;
  if (!role.rows.length) {
    const r = await pool.query(
      `INSERT INTO roles (name, description, is_system_role) VALUES ($1,$2,TRUE) RETURNING id`,
      ['Admin', 'Company administrator with full access']
    );
    adminRoleId = r.rows[0].id;
  } else {
    adminRoleId = role.rows[0].id;
  }

  // Assign Admin role to user
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [userId, adminRoleId]
  );

  // Grant all permissions to Admin role
  const perms = await pool.query('SELECT id FROM permissions');
  for (const p of perms.rows) {
    await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [adminRoleId, p.id]
    );
  }

  console.log(`✅ User created — ID: ${userId}`);
  console.log(`\n📝 Tenant Login Credentials:`);
  console.log(`   Email:    ${userEmail}`);
  console.log(`   Password: ${userPassword}`);
  console.log(`   Tenant:   ${tenantName} (ID: ${tenantId})`);
  console.log(`   Schema:   ${schemaName}`);
  console.log(`\n✅ Done! Login with these credentials to test tenant isolation.\n`);
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => pool.end());
