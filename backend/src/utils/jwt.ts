import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const JWT_EXPIRES_IN = '30m' // Access token expires in 30 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d' // Refresh token expires in 7 days

export interface JWTPayload {
  userId: number
  tenantId: number
  email: string
  roleIds: number[]
  roleNames: string[]
  permissions: string[]
  sessionToken: string
}

export interface DecodedToken extends JWTPayload {
  iat: number
  exp: number
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN })
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Decode token without verifying (useful for getting info from expired tokens)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token) as DecodedToken
    return decoded
  } catch (error) {
    return null
  }
}
