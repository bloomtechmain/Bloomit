"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRailwayAdmin = ensureRailwayAdmin;
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = __importDefault(require("./logger"));
/**
 * Ensures Railway admin user exists on startup
 * Automatically creates the user if not found
 * This runs on every server start in production
 */
async function ensureRailwayAdmin() {
    // Only run in production (Railway)
    if (process.env.NODE_ENV !== 'production') {
        logger_1.default.system('⏭️  Skipping Railway admin check (not production)');
        return;
    }
    const adminEmail = 'dilantha@bloomtech.lk';
    const adminName = 'Dilantha';
    const adminPassword = '729297Dmk@';
    try {
        logger_1.default.system('🔍 Checking for Railway admin user...');
        // Get or create admin user
        const existingUser = await db_1.pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        let userId;
        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].id;
            logger_1.default.system(`✅ Admin user ${adminEmail} exists (ID: ${userId})`);
        }
        else {
            logger_1.default.system('🔄 Admin user not found, creating...');
            const passwordHash = await bcryptjs_1.default.hash(adminPassword, 10);
            const userResult = await db_1.pool.query(`INSERT INTO users (name, email, password_hash, password_must_change)
         VALUES ($1, $2, $3, FALSE)
         RETURNING id`, [adminName, adminEmail, passwordHash]);
            userId = userResult.rows[0].id;
            logger_1.default.system(`✅ Created admin user: ${adminEmail} (ID: ${userId})`);
        }
        // Get or create Super Admin role
        let roleResult = await db_1.pool.query('SELECT id FROM roles WHERE name = $1', ['Super Admin']);
        let superAdminRoleId;
        if (roleResult.rows.length === 0) {
            logger_1.default.system('Creating Super Admin role...');
            const newRole = await db_1.pool.query(`INSERT INTO roles (name, description, is_system_role)
         VALUES ($1, $2, TRUE)
         RETURNING id`, ['Super Admin', 'Full unrestricted system access']);
            superAdminRoleId = newRole.rows[0].id;
            logger_1.default.system(`✅ Created Super Admin role (ID: ${superAdminRoleId})`);
        }
        else {
            superAdminRoleId = roleResult.rows[0].id;
            logger_1.default.system(`✅ Found existing Super Admin role (ID: ${superAdminRoleId})`);
        }
        // Assign Super Admin role to user (safe to run every startup)
        await db_1.pool.query(`INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`, [userId, superAdminRoleId]);
        logger_1.default.system(`✅ Assigned Super Admin role to user ${adminEmail}`);
        // Ensure critical permissions exist before granting them
        const criticalPermissions = [
            { resource: 'settings', action: 'manage', description: 'Manage roles, permissions, and system settings' },
            { resource: 'settings', action: 'view', description: 'View system settings' },
            { resource: 'settings', action: 'configure', description: 'Configure application-wide settings' },
        ];
        for (const p of criticalPermissions) {
            await db_1.pool.query(`INSERT INTO permissions (resource, action, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (resource, action) DO NOTHING`, [p.resource, p.action, p.description]);
        }
        // Grant ALL permissions to Super Admin role (runs every startup — idempotent)
        const permissionsResult = await db_1.pool.query('SELECT id FROM permissions');
        if (permissionsResult.rows.length > 0) {
            for (const perm of permissionsResult.rows) {
                await db_1.pool.query(`INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`, [superAdminRoleId, perm.id]);
            }
            logger_1.default.system(`✅ Granted ${permissionsResult.rows.length} permissions to Super Admin role`);
        }
        logger_1.default.system('═══════════════════════════════════════════════════════');
        logger_1.default.system('✅ Railway Admin User Created Successfully!');
        logger_1.default.system('═══════════════════════════════════════════════════════');
        logger_1.default.system(`📝 Login Credentials:`);
        logger_1.default.system(`   Email: ${adminEmail}`);
        logger_1.default.system(`   Password: ${adminPassword}`);
        logger_1.default.system(`⚠️  IMPORTANT: Change this password after first login!`);
        logger_1.default.system('═══════════════════════════════════════════════════════');
    }
    catch (error) {
        logger_1.default.error('❌ Error ensuring Railway admin user:', error);
        // Don't throw - let the server start anyway
        logger_1.default.system('⚠️  Server will continue starting, but admin user may not exist');
    }
}
