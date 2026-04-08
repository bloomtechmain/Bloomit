import { pool } from '../db';
import bcrypt from 'bcryptjs';

/**
 * Seeds the Railway database with custom admin user: dilantha@bloomtech.lk
 * This script is specifically for Railway production deployment
 */
async function seedRailwayAdmin() {
  console.log('🔄 Seeding Railway admin user...');

  const adminEmail = 'dilantha@bloomtech.lk';
  const adminName = 'Dilantha';
  const adminPassword = '729297Dmk@';

  try {
    // Check if admin already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      console.log(`✅ Admin user ${adminEmail} already exists. Skipping...`);
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Insert admin user
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, password_must_change)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id`,
      [adminName, adminEmail, passwordHash]
    );

    const userId = userResult.rows[0].id;
    console.log(`✅ Created admin user: ${adminEmail} (ID: ${userId})`);

    // Get or create Super Admin role
    let roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['Super Admin']
    );

    let superAdminRoleId: number;

    if (roleResult.rows.length === 0) {
      console.log('Creating Super Admin role...');
      const newRole = await pool.query(
        `INSERT INTO roles (name, description, is_system_role)
         VALUES ($1, $2, TRUE)
         RETURNING id`,
        ['Super Admin', 'Full unrestricted system access']
      );
      superAdminRoleId = newRole.rows[0].id;
      console.log(`✅ Created Super Admin role (ID: ${superAdminRoleId})`);
    } else {
      superAdminRoleId = roleResult.rows[0].id;
      console.log(`✅ Found existing Super Admin role (ID: ${superAdminRoleId})`);
    }

    // Assign Super Admin role to user
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, superAdminRoleId]
    );

    console.log(`✅ Assigned Super Admin role to user ${adminEmail}`);

    // Grant all permissions to Super Admin role (if permissions exist)
    const permissionsResult = await pool.query('SELECT id FROM permissions');

    if (permissionsResult.rows.length > 0) {
      for (const perm of permissionsResult.rows) {
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [superAdminRoleId, perm.id]
        );
      }
      console.log(`✅ Granted ${permissionsResult.rows.length} permissions to Super Admin role`);
    }

    console.log('\n✅ Railway admin user seeded successfully!');
    console.log('\n📝 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

  } catch (error) {
    console.error('❌ Error seeding Railway admin:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedRailwayAdmin()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed:', err);
      process.exit(1);
    });
}

export { seedRailwayAdmin };
