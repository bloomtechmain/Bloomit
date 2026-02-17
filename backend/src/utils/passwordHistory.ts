import { pool } from '../db'
import bcrypt from 'bcryptjs'

/**
 * Checks if a password matches any of the user's last 3 passwords
 * @param userId - The user's ID
 * @param newPasswordPlainText - The new password in plain text
 * @returns true if password was used recently, false if it's a new password
 */
export async function isPasswordRecentlyUsed(
  userId: number,
  newPasswordPlainText: string
): Promise<boolean> {
  try {
    // Get last 3 password hashes for this user
    const result = await pool.query(
      `SELECT password_hash 
       FROM password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 3`,
      [userId]
    )
    
    // If no password history exists, password is not recently used
    if (!result.rows || result.rows.length === 0) {
      console.log(`No password history found for user ${userId}`)
      return false
    }
    
    // Check if new password matches any of the last 3
    for (const row of result.rows) {
      const matches = await bcrypt.compare(newPasswordPlainText, row.password_hash)
      if (matches) {
        return true // Password was used recently
      }
    }
    
    return false // Password is new
  } catch (error) {
    console.error('Error checking password history:', error)
    // Don't fail password change if history check fails - just log it
    console.warn('Proceeding with password change despite history check error')
    return false
  }
}

/**
 * Adds a new password hash to the history and maintains only the last 3
 * @param userId - The user's ID
 * @param passwordHash - The hashed password to add
 */
export async function addToPasswordHistory(
  userId: number,
  passwordHash: string
): Promise<void> {
  try {
    // Add new password to history
    await pool.query(
      `INSERT INTO password_history (user_id, password_hash) 
       VALUES ($1, $2)`,
      [userId, passwordHash]
    )
    
    // Keep only the last 3 passwords - delete older ones
    await pool.query(
      `DELETE FROM password_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 3
       )`,
      [userId]
    )
  } catch (error) {
    console.error('Error adding to password history:', error)
    throw error
  }
}

/**
 * Gets the count of passwords in history for a user
 * @param userId - The user's ID
 * @returns Number of passwords in history
 */
export async function getPasswordHistoryCount(userId: number): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM password_history 
       WHERE user_id = $1`,
      [userId]
    )
    
    return parseInt(result.rows[0].count)
  } catch (error) {
    console.error('Error getting password history count:', error)
    throw error
  }
}
