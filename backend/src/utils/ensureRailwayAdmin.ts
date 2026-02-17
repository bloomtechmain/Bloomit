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

    // Check if admin already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      logger.system(`✅ Admin user ${adminEmail} already exists`);
      return;
    }

    logger.system('🔄 Admin user not found, creating...');

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
    logger.system(`✅ Created admin user: ${adminEmail} (ID: ${userId})`);

    // Get or create Admin role
    let roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['Admin']
    );

    let adminRoleId: number;

    if (roleResult.rows.length === 0) {
      // Create Admin role if it doesn't exist
      logger.system('Creating Admin role...');
      const newRole = await pool.query(
        `INSERT INTO roles (name, description)
         VALUES ($1, $2)
         RETURNING id`,
        ['Admin', 'Full system administrator with all permissions']
      );
      adminRoleId = newRole.rows[0].id;
      logger.system(`✅ Created Admin role (ID: ${adminRoleId})`);
    } else {
      adminRoleId = roleResult.rows[0].id;
      logger.system(`✅ Found existing Admin role (ID: ${adminRoleId})`);
    }

    // Assign Admin role to user
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, adminRoleId]
    );

    logger.system(`✅ Assigned Admin role to user ${adminEmail}`);

    // Grant all permissions to Admin role (if permissions exist)
    const permissionsResult = await pool.query('SELECT id FROM permissions');
    
    if (permissionsResult.rows.length > 0) {
      for (const perm of permissionsResult.rows) {
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [adminRoleId, perm.id]
        );
      }
      logger.system(`✅ Granted ${permissionsResult.rows.length} permissions to Admin role`);
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
