"use strict";
/**
 * Centralized logging utility for Bloomtech ERP Backend
 *
 * This logger provides environment-aware logging:
 * - Production: Only errors and critical warnings
 * - Development: Full debug logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const isDevelopment = process.env.NODE_ENV !== 'production';
exports.logger = {
    /**
     * Log informational messages (only in development)
     */
    info: (...args) => {
        if (isDevelopment) {
            console.log('[INFO]', ...args);
        }
    },
    /**
     * Log debug messages (only in development)
     */
    debug: (...args) => {
        if (isDevelopment) {
            console.log('[DEBUG]', ...args);
        }
    },
    /**
     * Log warnings (always logged)
     */
    warn: (...args) => {
        console.warn('[WARN]', ...args);
    },
    /**
     * Log errors (always logged)
     */
    error: (...args) => {
        console.error('[ERROR]', ...args);
    },
    /**
     * Log critical system events (always logged)
     * Use for: startup, shutdown, database connections, cron jobs, etc.
     */
    system: (...args) => {
        console.log('[SYSTEM]', ...args);
    },
    /**
     * Log successful operations (only in development, use sparingly)
     */
    success: (...args) => {
        if (isDevelopment) {
            console.log('[SUCCESS]', ...args);
        }
    }
};
exports.default = exports.logger;
