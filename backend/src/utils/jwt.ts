import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.')
  process.exit(1)
}

const JWT_EXPIRES_IN = '30m'
const REFRESH_TOKEN_EXPIRES_IN = '7d'

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

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN })
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRES_IN })
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as DecodedToken
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET!) as DecodedToken
  } catch {
    return null
  }
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken
  } catch {
    return null
  }
}
