"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAdminPassword = resetAdminPassword;
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Reset admin password to the standard Railway password
 * Run this script once if admin user exists but password doesn't match
 *
 * Usage: npx ts-node src/scripts/resetAdminPassword.ts
 */
async function resetAdminPassword() {
    const adminEmail = 'dilantha@bloomtech.lk';
    const newPassword = '729297Dmk@';
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 Resetting Admin Password');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Email: ${adminEmail}`);
    console.log('');
    try {
        // Check if admin exists
        const userResult = await db_1.pool.query('SELECT id, name, email FROM users WHERE email = $1', [adminEmail]);
        if (userResult.rows.length === 0) {
            console.error(`❌ User ${adminEmail} not found in database`);
            console.log('');
            console.log('💡 Tip: Run npm run railway:setup to create the user first');
            process.exit(1);
        }
        const user = userResult.rows[0];
        console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);
        console.log('');
        // Hash the new password
        console.log('🔐 Generating password hash...');
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        console.log('✅ Password hash generated');
        console.log('');
        // Update the password
        console.log('🔄 Updating password in database...');
        await db_1.pool.query(`UPDATE users 
       SET password_hash = $1, 
           password_must_change = FALSE
       WHERE id = $2`, [passwordHash, user.id]);
        console.log('✅ Password updated successfully');
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ Admin Password Reset Complete!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('📝 Login Credentials:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${newPassword}`);
        console.log('');
        console.log('🌐 You can now login at: https://erpbloom.com');
        console.log('');
        console.log('⚠️  Remember to change this password after first login!');
        console.log('═══════════════════════════════════════════════════════');
    }
    catch (error) {
        console.error('❌ Error resetting admin password:', error);
        throw error;
    }
}
// Run if executed directly
if (require.main === module) {
    resetAdminPassword()
        .then(() => {
        console.log('✅ Done!');
        process.exit(0);
    })
        .catch((err) => {
        console.error('❌ Failed:', err);
        process.exit(1);
    });
}
