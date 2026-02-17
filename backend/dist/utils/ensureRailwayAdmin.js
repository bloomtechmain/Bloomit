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
        // Check if admin already exists
        const existingUser = await db_1.pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        if (existingUser.rows.length > 0) {
            logger_1.default.system(`✅ Admin user ${adminEmail} already exists`);
            return;
        }
        logger_1.default.system('🔄 Admin user not found, creating...');
        // Hash the password
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, 10);
        // Insert admin user
        const userResult = await db_1.pool.query(`INSERT INTO users (name, email, password_hash, password_must_change)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id`, [adminName, adminEmail, passwordHash]);
        const userId = userResult.rows[0].id;
        logger_1.default.system(`✅ Created admin user: ${adminEmail} (ID: ${userId})`);
        // Get or create Admin role
        let roleResult = await db_1.pool.query('SELECT id FROM roles WHERE name = $1', ['Admin']);
        let adminRoleId;
        if (roleResult.rows.length === 0) {
            // Create Admin role if it doesn't exist
            logger_1.default.system('Creating Admin role...');
            const newRole = await db_1.pool.query(`INSERT INTO roles (name, description)
         VALUES ($1, $2)
         RETURNING id`, ['Admin', 'Full system administrator with all permissions']);
            adminRoleId = newRole.rows[0].id;
            logger_1.default.system(`✅ Created Admin role (ID: ${adminRoleId})`);
        }
        else {
            adminRoleId = roleResult.rows[0].id;
            logger_1.default.system(`✅ Found existing Admin role (ID: ${adminRoleId})`);
        }
        // Assign Admin role to user
        await db_1.pool.query(`INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`, [userId, adminRoleId]);
        logger_1.default.system(`✅ Assigned Admin role to user ${adminEmail}`);
        // Grant all permissions to Admin role (if permissions exist)
        const permissionsResult = await db_1.pool.query('SELECT id FROM permissions');
        if (permissionsResult.rows.length > 0) {
            for (const perm of permissionsResult.rows) {
                await db_1.pool.query(`INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`, [adminRoleId, perm.id]);
            }
            logger_1.default.system(`✅ Granted ${permissionsResult.rows.length} permissions to Admin role`);
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
