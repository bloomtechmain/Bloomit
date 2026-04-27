import { Request, Response, NextFunction } from 'express'
import { verifyToken, DecodedToken } from '../utils/jwt'
import { query } from '../db';

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

    // Check account status and validate active session
    const userStatusResult = await query(
      'SELECT account_status, tenant_id FROM users WHERE id = $1',
      [decoded.userId],
      req.dbClient
    )

    if (userStatusResult.rows.length === 0) {
      return res.status(401).json({ error: 'unauthorized', message: 'User account not found' })
    }

    const { account_status, tenant_id } = userStatusResult.rows[0]
    decoded.tenantId = tenant_id

    if (account_status === 'suspended') {
      return res.status(403).json({
        error: 'account_suspended',
        message: 'Your account has been suspended. Please contact your administrator.'
      })
    }

    if (account_status === 'terminated') {
      return res.status(403).json({
        error: 'account_terminated',
        message: 'Your account has been terminated. Access is no longer available.'
      })
    }

    // Validate active session — ensures only one device is logged in at a time
    if (decoded.sessionToken) {
      const sessionResult = await query(
        `SELECT id, last_activity_at FROM public.active_sessions
         WHERE user_id = $1 AND session_token = $2 AND expires_at > NOW()`,
        [decoded.userId, decoded.sessionToken],
        req.dbClient
      )

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({
          error: 'session_invalidated',
          message: 'Your session is no longer valid. Another device may have logged into this account. Please log in again.'
        })
      }

      // Idle session timeout: 8 hours
      const lastActivity: Date | null = sessionResult.rows[0].last_activity_at
      if (lastActivity) {
        const idleMs = Date.now() - new Date(lastActivity).getTime()
        if (idleMs > 8 * 60 * 60 * 1000) {
          await query(
            `DELETE FROM public.active_sessions WHERE user_id = $1 AND session_token = $2`,
            [decoded.userId, decoded.sessionToken],
            req.dbClient
          )
          return res.status(401).json({
            error: 'session_expired',
            message: 'Your session has expired due to inactivity. Please log in again.'
          })
        }
      }

      // Refresh last activity timestamp
      await query(
        `UPDATE public.active_sessions SET last_activity_at = NOW()
         WHERE user_id = $1 AND session_token = $2`,
        [decoded.userId, decoded.sessionToken],
        req.dbClient
      )
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
