import { pool } from '../db';

async function main() {
  // Admin role id = 2, users 19 (Admin A) and 20 (Admin B)
  const adminRoleId = 2;
  const userIds = [19, 20];

  for (const userId of userIds) {
    await pool.query(
      `INSERT INTO public.user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, adminRoleId]
    );
    const user = await pool.query(`SELECT name, email FROM public.users WHERE id = $1`, [userId]);
    console.log(`✅ Admin role assigned to: ${user.rows[0].name} (${user.rows[0].email})`);
  }

  // Verify
  const result = await pool.query(`
    SELECT u.name, u.email, r.name as role
    FROM public.users u
    JOIN public.user_roles ur ON u.id = ur.user_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE u.id = ANY($1::int[])
  `, [userIds]);
  console.log('\n--- Verification ---');
  result.rows.forEach((row: any) => console.log(`  ${row.name} (${row.email}) → ${row.role}`));
}

main().catch(console.error).finally(() => pool.end());
