/**
 * Signature Hash Generator Utility
 * Generates cryptographically secure hash signatures for payslip approvals
 */

/**
 * Generate a SHA-256 hash from a string
 * @param data - The data to hash
 * @returns Promise<string> - The hexadecimal hash string
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Generate a random salt for the signature
 * @param length - The length of the salt in bytes (default: 16)
 * @returns string - The hexadecimal salt string
 */
function generateSalt(length: number = 16): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a unique signature hash for payslip approvals
 * @param userId - The ID of the user signing
 * @param payslipId - The ID of the payslip being signed
 * @param role - The role of the signer (JUNIOR_ACCOUNTANT, STAFF_ACCOUNTANT, ADMIN, EMPLOYEE)
 * @returns Promise<string> - The signature hash
 */
export async function generateSignatureHash(
  userId: number,
  payslipId: number,
  role: string
): Promise<string> {
  const timestamp = Date.now()
  const salt = generateSalt(16)
  const data = `${userId}-${payslipId}-${role}-${timestamp}-${salt}`
  return await sha256(data)
}

/**
 * Verify if a signature hash is valid (basic format check)
 * @param hash - The hash to verify
 * @returns boolean - True if the hash appears to be valid
 */
export function isValidSignatureHash(hash: string): boolean {
  // SHA-256 produces a 64-character hexadecimal string
  return /^[a-f0-9]{64}$/i.test(hash)
}

/**
 * Truncate a signature hash for display purposes
 * @param hash - The full hash
 * @param length - Number of characters to show from start and end (default: 8)
 * @returns string - Truncated hash like "abc12345...xyz98765"
 */
export function truncateSignatureHash(hash: string, length: number = 8): string {
  if (!hash || hash.length <= length * 2) {
    return hash
  }
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`
}
