"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPasswordRecentlyUsed = isPasswordRecentlyUsed;
exports.addToPasswordHistory = addToPasswordHistory;
exports.getPasswordHistoryCount = getPasswordHistoryCount;
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Checks if a password matches any of the user's last 3 passwords
 * @param userId - The user's ID
 * @param newPasswordPlainText - The new password in plain text
 * @returns true if password was used recently, false if it's a new password
 */
async function isPasswordRecentlyUsed(userId, newPasswordPlainText) {
    try {
        // Get last 3 password hashes for this user
        const result = await db_1.pool.query(`SELECT password_hash 
       FROM password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 3`, [userId]);
        // If no password history exists, password is not recently used
        if (!result.rows || result.rows.length === 0) {
            console.log(`No password history found for user ${userId}`);
            return false;
        }
        // Check if new password matches any of the last 3
        for (const row of result.rows) {
            const matches = await bcryptjs_1.default.compare(newPasswordPlainText, row.password_hash);
            if (matches) {
                return true; // Password was used recently
            }
        }
        return false; // Password is new
    }
    catch (error) {
        console.error('Error checking password history:', error);
        // Don't fail password change if history check fails - just log it
        console.warn('Proceeding with password change despite history check error');
        return false;
    }
}
/**
 * Adds a new password hash to the history and maintains only the last 3
 * @param userId - The user's ID
 * @param passwordHash - The hashed password to add
 */
async function addToPasswordHistory(userId, passwordHash) {
    try {
        // Add new password to history
        await db_1.pool.query(`INSERT INTO password_history (user_id, password_hash) 
       VALUES ($1, $2)`, [userId, passwordHash]);
        // Keep only the last 3 passwords - delete older ones
        await db_1.pool.query(`DELETE FROM password_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 3
       )`, [userId]);
    }
    catch (error) {
        console.error('Error adding to password history:', error);
        throw error;
    }
}
/**
 * Gets the count of passwords in history for a user
 * @param userId - The user's ID
 * @returns Number of passwords in history
 */
async function getPasswordHistoryCount(userId) {
    try {
        const result = await db_1.pool.query(`SELECT COUNT(*) as count 
       FROM password_history 
       WHERE user_id = $1`, [userId]);
        return parseInt(result.rows[0].count);
    }
    catch (error) {
        console.error('Error getting password history count:', error);
        throw error;
    }
}
