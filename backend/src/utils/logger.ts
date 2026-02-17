/**
 * Centralized logging utility for Bloomtech ERP Backend
 * 
 * This logger provides environment-aware logging:
 * - Production: Only errors and critical warnings
 * - Development: Full debug logging
 */

const isDevelopment = process.env.NODE_ENV !== 'production'

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
   * Log warnings (always logged)
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },

  /**
   * Log errors (always logged)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  },

  /**
   * Log critical system events (always logged)
   * Use for: startup, shutdown, database connections, cron jobs, etc.
   */
  system: (...args: any[]) => {
    console.log('[SYSTEM]', ...args)
  },

  /**
   * Log successful operations (only in development, use sparingly)
   */
  success: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[SUCCESS]', ...args)
    }
  }
}

export default logger
