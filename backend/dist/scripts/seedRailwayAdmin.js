"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRailwayAdmin = seedRailwayAdmin;
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
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
        const existingUser = await db_1.pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        if (existingUser.rows.length > 0) {
            console.log(`✅ Admin user ${adminEmail} already exists. Skipping...`);
            return;
        }
        // Hash the password
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, 10);
        // Insert admin user
        const userResult = await db_1.pool.query(`INSERT INTO users (name, email, password_hash, password_must_change)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id`, [adminName, adminEmail, passwordHash]);
        const userId = userResult.rows[0].id;
        console.log(`✅ Created admin user: ${adminEmail} (ID: ${userId})`);
        // Get or create Admin role
        let roleResult = await db_1.pool.query('SELECT id FROM roles WHERE name = $1', ['Admin']);
        let adminRoleId;
        if (roleResult.rows.length === 0) {
            // Create Admin role if it doesn't exist
            console.log('Creating Admin role...');
            const newRole = await db_1.pool.query(`INSERT INTO roles (name, description)
         VALUES ($1, $2)
         RETURNING id`, ['Admin', 'Full system administrator with all permissions']);
            adminRoleId = newRole.rows[0].id;
            console.log(`✅ Created Admin role (ID: ${adminRoleId})`);
        }
        else {
            adminRoleId = roleResult.rows[0].id;
            console.log(`✅ Found existing Admin role (ID: ${adminRoleId})`);
        }
        // Assign Admin role to user
        await db_1.pool.query(`INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`, [userId, adminRoleId]);
        console.log(`✅ Assigned Admin role to user ${adminEmail}`);
        // Grant all permissions to Admin role (if permissions exist)
        const permissionsResult = await db_1.pool.query('SELECT id FROM permissions');
        if (permissionsResult.rows.length > 0) {
            for (const perm of permissionsResult.rows) {
                await db_1.pool.query(`INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`, [adminRoleId, perm.id]);
            }
            console.log(`✅ Granted ${permissionsResult.rows.length} permissions to Admin role`);
        }
        console.log('\n✅ Railway admin user seeded successfully!');
        console.log('\n📝 Login Credentials:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
    }
    catch (error) {
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
