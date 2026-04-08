import { pool } from '../db';
import bcrypt from 'bcryptjs';
import logger from './logger';

/**
 * Ensures Railway admin user exists on startup
 * Automatically creates the user if not found
 * This runs on every server start in production
 */
export async function ensureRailwayAdmin(): Promise<void> {
  // Only run in production (Railway)
  if (process.env.NODE_ENV !== 'production') {
    logger.system('⏭️  Skipping Railway admin check (not production)');
    return;
  }

  const adminEmail = 'dilantha@bloomtech.lk';
  const adminName = 'Dilantha';
  const adminPassword = '729297Dmk@';

  try {
    logger.system('🔍 Checking for Railway admin user...');

    // Get or create admin user
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    let userId: number;

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      logger.system(`✅ Admin user ${adminEmail} exists (ID: ${userId})`);
    } else {
      logger.system('🔄 Admin user not found, creating...');
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const userResult = await pool.query(
        `INSERT INTO users (name, email, password_hash, password_must_change)
         VALUES ($1, $2, $3, FALSE)
         RETURNING id`,
        [adminName, adminEmail, passwordHash]
      );
      userId = userResult.rows[0].id;
      logger.system(`✅ Created admin user: ${adminEmail} (ID: ${userId})`);
    }

    // Get or create Super Admin role
    let roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['Super Admin']
    );

    let superAdminRoleId: number;

    if (roleResult.rows.length === 0) {
      logger.system('Creating Super Admin role...');
      const newRole = await pool.query(
        `INSERT INTO roles (name, description, is_system_role)
         VALUES ($1, $2, TRUE)
         RETURNING id`,
        ['Super Admin', 'Full unrestricted system access']
      );
      superAdminRoleId = newRole.rows[0].id;
      logger.system(`✅ Created Super Admin role (ID: ${superAdminRoleId})`);
    } else {
      superAdminRoleId = roleResult.rows[0].id;
      logger.system(`✅ Found existing Super Admin role (ID: ${superAdminRoleId})`);
    }

    // Assign Super Admin role to user (safe to run every startup)
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, superAdminRoleId]
    );

    logger.system(`✅ Assigned Super Admin role to user ${adminEmail}`);

    // Grant all permissions to Super Admin role
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
      logger.system(`✅ Granted ${permissionsResult.rows.length} permissions to Super Admin role`);
    }

    logger.system('═══════════════════════════════════════════════════════');
    logger.system('✅ Railway Admin User Created Successfully!');
    logger.system('═══════════════════════════════════════════════════════');
    logger.system(`📝 Login Credentials:`);
    logger.system(`   Email: ${adminEmail}`);
    logger.system(`   Password: ${adminPassword}`);
    logger.system(`⚠️  IMPORTANT: Change this password after first login!`);
    logger.system('═══════════════════════════════════════════════════════');

  } catch (error) {
    logger.error('❌ Error ensuring Railway admin user:', error);
    // Don't throw - let the server start anyway
    logger.system('⚠️  Server will continue starting, but admin user may not exist');
  }
}
