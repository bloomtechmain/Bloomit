/**
 * Centralized logging utility for Bloomtech ERP Frontend
 * 
 * This logger provides environment-aware logging:
 * - Production: Only errors
 * - Development: Full debug logging
 */

const isDevelopment = import.meta.env.DEV

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args)
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args)
    }
  },

  /**
   * Log errors (always logged)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  }
}

export default logger
