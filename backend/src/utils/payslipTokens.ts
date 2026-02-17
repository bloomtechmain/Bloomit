import crypto from 'crypto'
import { pool } from '../db'

/**
 * Payslip Signature Token Utility
 * Phase 11 Implementation
 * 
 * Provides secure token generation and validation for email-based payslip signing.
 * Tokens are time-limited (24 hours) and single-use for security.
 */

export interface PayslipToken {
  id: number
  payslipId: number
  employeeId: number
  token: string
  expiresAt: Date
  isUsed: boolean
  usedAt: Date | null
  createdAt: Date
}

export interface TokenValidationResult {
  valid: boolean
  token?: PayslipToken
  error?: string
  errorCode?: 'EXPIRED' | 'ALREADY_USED' | 'NOT_FOUND' | 'INVALID'
}

/**
 * Generate a secure random token
 * Format: random 32-byte hex string
 * 
 * @returns Secure random token string
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a new payslip signature token
 * Token expires after 24 hours
 * 
 * @param payslipId - Payslip ID
 * @param employeeId - Employee ID
 * @param ipAddress - Optional IP address of requester
 * @param userAgent - Optional user agent string
 * @returns Token string
 */
export async function generatePayslipToken(
  payslipId: number,
  employeeId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  try {
    // Generate secure random token
    const token = generateSecureToken()
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Invalidate any existing unused tokens for this payslip/employee
    await pool.query(
      `UPDATE payslip_signature_tokens 
       SET is_used = true, used_at = NOW() 
       WHERE payslip_id = $1 AND employee_id = $2 AND is_used = false`,
      [payslipId, employeeId]
    )

    // Insert new token
    const query = `
      INSERT INTO payslip_signature_tokens (
        payslip_id,
        employee_id,
        token,
        expires_at,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING token
    `

    const result = await pool.query(query, [
      payslipId,
      employeeId,
      token,
      expiresAt,
      ipAddress || null,
      userAgent || null
    ])

    console.log(`✅ Generated payslip signature token for employee ${employeeId}, payslip ${payslipId}`)
    return result.rows[0].token

  } catch (error) {
    console.error('❌ Error generating payslip token:', error)
    throw new Error('Failed to generate signature token')
  }
}

/**
 * Validate a payslip signature token
 * Checks if token exists, is not expired, and has not been used
 * 
 * @param token - Token string to validate
 * @returns Validation result with token data or error
 */
export async function validatePayslipToken(token: string): Promise<TokenValidationResult> {
  try {
    // Query for token
    const query = `
      SELECT 
        id,
        payslip_id,
        employee_id,
        token,
        expires_at,
        is_used,
        used_at,
        created_at
      FROM payslip_signature_tokens
      WHERE token = $1
    `

    const result = await pool.query(query, [token])

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: 'Token not found',
        errorCode: 'NOT_FOUND'
      }
    }

    const tokenData = result.rows[0]

    // Check if already used
    if (tokenData.is_used) {
      return {
        valid: false,
        error: 'Token has already been used',
        errorCode: 'ALREADY_USED',
        token: {
          id: tokenData.id,
          payslipId: tokenData.payslip_id,
          employeeId: tokenData.employee_id,
          token: tokenData.token,
          expiresAt: tokenData.expires_at,
          isUsed: tokenData.is_used,
          usedAt: tokenData.used_at,
          createdAt: tokenData.created_at
        }
      }
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (now > expiresAt) {
      // Auto-mark as used if expired
      await pool.query(
        `UPDATE payslip_signature_tokens SET is_used = true WHERE id = $1`,
        [tokenData.id]
      )

      return {
        valid: false,
        error: 'Token has expired',
        errorCode: 'EXPIRED',
        token: {
          id: tokenData.id,
          payslipId: tokenData.payslip_id,
          employeeId: tokenData.employee_id,
          token: tokenData.token,
          expiresAt: tokenData.expires_at,
          isUsed: true,
          usedAt: tokenData.used_at,
          createdAt: tokenData.created_at
        }
      }
    }

    // Token is valid
    return {
      valid: true,
      token: {
        id: tokenData.id,
        payslipId: tokenData.payslip_id,
        employeeId: tokenData.employee_id,
        token: tokenData.token,
        expiresAt: tokenData.expires_at,
        isUsed: tokenData.is_used,
        usedAt: tokenData.used_at,
        createdAt: tokenData.created_at
      }
    }

  } catch (error) {
    console.error('❌ Error validating payslip token:', error)
    return {
      valid: false,
      error: 'Error validating token',
      errorCode: 'INVALID'
    }
  }
}

/**
 * Mark a token as used
 * Called after successful signature submission
 * 
 * @param token - Token string
 * @param ipAddress - Optional IP address
 * @param userAgent - Optional user agent
 * @returns Success boolean
 */
export async function markTokenAsUsed(
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const query = `
      UPDATE payslip_signature_tokens
      SET 
        is_used = true,
        used_at = NOW(),
        ip_address = COALESCE($2, ip_address),
        user_agent = COALESCE($3, user_agent)
      WHERE token = $1 AND is_used = false
      RETURNING id
    `

    const result = await pool.query(query, [token, ipAddress || null, userAgent || null])

    if (result.rows.length === 0) {
      console.warn(`⚠️ Attempted to mark already-used or non-existent token as used`)
      return false
    }

    console.log(`✅ Marked token as used: ${token.substring(0, 10)}...`)
    return true

  } catch (error) {
    console.error('❌ Error marking token as used:', error)
    return false
  }
}

/**
 * Revoke a token (admin function)
 * Marks token as used without requiring signature
 * 
 * @param token - Token string to revoke
 * @returns Success boolean
 */
export async function revokePayslipToken(token: string): Promise<boolean> {
  try {
    const query = `
      UPDATE payslip_signature_tokens
      SET is_used = true, used_at = NOW()
      WHERE token = $1
      RETURNING id
    `

    const result = await pool.query(query, [token])

    if (result.rows.length === 0) {
      return false
    }

    console.log(`✅ Revoked token: ${token.substring(0, 10)}...`)
    return true

  } catch (error) {
    console.error('❌ Error revoking token:', error)
    return false
  }
}

/**
 * Get token by payslip and employee
 * Useful for checking if a valid token already exists
 * 
 * @param payslipId - Payslip ID
 * @param employeeId - Employee ID
 * @returns Token data or null
 */
export async function getTokenByPayslipAndEmployee(
  payslipId: number,
  employeeId: number
): Promise<PayslipToken | null> {
  try {
    const query = `
      SELECT 
        id,
        payslip_id,
        employee_id,
        token,
        expires_at,
        is_used,
        used_at,
        created_at
      FROM payslip_signature_tokens
      WHERE payslip_id = $1 
        AND employee_id = $2 
        AND is_used = false
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    const result = await pool.query(query, [payslipId, employeeId])

    if (result.rows.length === 0) {
      return null
    }

    const tokenData = result.rows[0]
    return {
      id: tokenData.id,
      payslipId: tokenData.payslip_id,
      employeeId: tokenData.employee_id,
      token: tokenData.token,
      expiresAt: tokenData.expires_at,
      isUsed: tokenData.is_used,
      usedAt: tokenData.used_at,
      createdAt: tokenData.created_at
    }

  } catch (error) {
    console.error('❌ Error getting token:', error)
    return null
  }
}

/**
 * Clean up expired tokens
 * Should be run periodically (e.g., daily cron job)
 * 
 * @returns Number of tokens cleaned up
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await pool.query(`SELECT cleanup_expired_tokens()`)
    const count = result.rows[0].cleanup_expired_tokens
    
    if (count > 0) {
      console.log(`✅ Cleaned up ${count} expired tokens`)
    }
    
    return count

  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error)
    return 0
  }
}
