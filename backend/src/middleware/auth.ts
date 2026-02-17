import { Request, Response, NextFunction } from 'express'
import { verifyToken, DecodedToken } from '../utils/jwt'
import { pool } from '../db'

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken
    }
  }
}

/**
 * Authentication middleware - Verifies JWT token and adds user to request
 * Also checks account status to block suspended/terminated users
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized', message: 'No token provided' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' })
    }

    // Check account status in database (if column exists)
    try {
      const userStatusResult = await pool.query(
        'SELECT account_status FROM users WHERE id = $1',
        [decoded.userId]
      )

      if (userStatusResult.rows.length === 0) {
        return res.status(401).json({ error: 'unauthorized', message: 'User account not found' })
      }

      const accountStatus = userStatusResult.rows[0].account_status

      // Block suspended users
      if (accountStatus === 'suspended') {
        return res.status(403).json({ 
          error: 'account_suspended', 
          message: 'Your account has been suspended. Please contact your administrator.' 
        })
      }

      // Block terminated users
      if (accountStatus === 'terminated') {
        return res.status(403).json({ 
          error: 'account_terminated', 
          message: 'Your account has been terminated. Access is no longer available.' 
        })
      }
    } catch (statusError: any) {
      // If account_status column doesn't exist yet, just verify user exists
      if (statusError.code === '42703') { // PostgreSQL error code for undefined column
        console.warn('[AUTH] account_status column not found, skipping status check')
        const userExistsResult = await pool.query(
          'SELECT id FROM users WHERE id = $1',
          [decoded.userId]
        )
        if (userExistsResult.rows.length === 0) {
          return res.status(401).json({ error: 'unauthorized', message: 'User account not found' })
        }
      } else {
        throw statusError
      }
    }

    // Attach user data to request
    req.user = decoded
    
    next()
  } catch (error) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication failed' })
  }
}

/**
 * Optional authentication - Adds user to request if token is valid, but doesn't reject if missing
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      
      if (decoded) {
        req.user = decoded
      }
    }
    
    next()
  } catch (error) {
    // Silently continue without authentication
    next()
  }
}
