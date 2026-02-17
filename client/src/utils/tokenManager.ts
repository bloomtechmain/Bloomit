/**
 * Token Manager Utility
 * Handles token expiration checking and management
 */

interface DecodedToken {
  userId: number
  email: string
  roleIds: number[]
  roleNames: string[]
  permissions: string[]
  iat: number
  exp: number
}

/**
 * Decode JWT token without verification
 * Returns null if token is invalid
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode token:', error)
    return null
  }
}

/**
 * Check if token is expired
 * Returns true if expired or invalid
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  
  // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
  const now = Date.now() / 1000
  return decoded.exp < now
}

/**
 * Get time until token expires in milliseconds
 * Returns 0 if token is already expired or invalid
 */
export function getTimeUntilExpiry(token: string | null): number {
  if (!token) return 0
  
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return 0
  
  const now = Date.now() / 1000
  const timeLeft = decoded.exp - now
  
  return timeLeft > 0 ? timeLeft * 1000 : 0
}

/**
 * Get token expiration date
 * Returns null if token is invalid
 */
export function getTokenExpiryDate(token: string | null): Date | null {
  if (!token) return null
  
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return null
  
  return new Date(decoded.exp * 1000)
}

/**
 * Check if token will expire soon (within specified minutes)
 * Default: 5 minutes
 */
export function isTokenExpiringSoon(token: string | null, minutesThreshold: number = 5): boolean {
  const timeLeft = getTimeUntilExpiry(token)
  return timeLeft > 0 && timeLeft < minutesThreshold * 60 * 1000
}

/**
 * Format time remaining until expiry
 * Returns human-readable string like "5 minutes" or "2 hours"
 */
export function formatTimeUntilExpiry(token: string | null): string {
  const timeLeft = getTimeUntilExpiry(token)
  
  if (timeLeft <= 0) return 'Expired'
  
  const seconds = Math.floor(timeLeft / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`
  return `${seconds} second${seconds > 1 ? 's' : ''}`
}
