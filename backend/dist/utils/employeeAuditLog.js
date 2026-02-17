"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeAuditActions = void 0;
exports.logEmployeeAction = logEmployeeAction;
exports.logEmployeeActionFromRequest = logEmployeeActionFromRequest;
exports.getEmployeeAuditLog = getEmployeeAuditLog;
const db_1 = require("../db");
/**
 * Log an employee action to the audit log
 *
 * @param entry - Audit log entry details
 * @returns Promise<void>
 */
async function logEmployeeAction(entry) {
    try {
        const query = `
      INSERT INTO employee_audit_log (
        employee_id,
        action,
        resource_type,
        resource_id,
        old_value,
        new_value,
        ip_address,
        user_agent,
        session_id,
        status,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
        const values = [
            entry.employeeId,
            entry.action,
            entry.resourceType || null,
            entry.resourceId || null,
            entry.oldValue ? JSON.stringify(entry.oldValue) : null,
            entry.newValue ? JSON.stringify(entry.newValue) : null,
            entry.ipAddress || null,
            entry.userAgent || null,
            entry.sessionId || null,
            entry.status || 'success',
            entry.errorMessage || null
        ];
        await db_1.pool.query(query, values);
    }
    catch (error) {
        // Don't throw - we don't want audit logging to break the application
        console.error('❌ Error logging employee action:', error);
    }
}
/**
 * Log an employee action from an Express request
 * Convenience function that extracts IP and user agent from request
 *
 * @param employeeId - Employee ID
 * @param action - Action being performed
 * @param req - Express request object
 * @param details - Additional details (resourceType, resourceId, etc.)
 */
async function logEmployeeActionFromRequest(employeeId, action, req, details) {
    const ipAddress = req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.ip ||
        req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await logEmployeeAction({
        employeeId,
        action,
        resourceType: details?.resourceType,
        resourceId: details?.resourceId,
        oldValue: details?.oldValue,
        newValue: details?.newValue,
        ipAddress: ipAddress,
        userAgent,
        status: details?.status,
        errorMessage: details?.errorMessage
    });
}
/**
 * Get recent audit log entries for an employee
 *
 * @param employeeId - Employee ID
 * @param limit - Number of entries to return (default: 50)
 * @returns Promise<any[]>
 */
async function getEmployeeAuditLog(employeeId, limit = 50) {
    try {
        const query = `
      SELECT 
        id,
        action,
        resource_type,
        resource_id,
        old_value,
        new_value,
        ip_address,
        status,
        error_message,
        created_at
      FROM employee_audit_log
      WHERE employee_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
        const result = await db_1.pool.query(query, [employeeId, limit]);
        return result.rows;
    }
    catch (error) {
        console.error('❌ Error fetching audit log:', error);
        return [];
    }
}
/**
 * Common employee portal actions for consistent logging
 */
exports.EmployeeAuditActions = {
    // Authentication
    LOGIN: 'EMPLOYEE_LOGIN',
    LOGOUT: 'EMPLOYEE_LOGOUT',
    // Dashboard
    DASHBOARD_VIEWED: 'DASHBOARD_VIEWED',
    STATS_VIEWED: 'STATS_VIEWED',
    // Profile
    PROFILE_VIEWED: 'PROFILE_VIEWED',
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    // Payroll
    PAYSLIP_VIEWED: 'PAYSLIP_VIEWED',
    PAYSLIP_DOWNLOADED: 'PAYSLIP_DOWNLOADED',
    PAYSLIP_SIGNED: 'PAYSLIP_SIGNED',
    YTD_EARNINGS_VIEWED: 'YTD_EARNINGS_VIEWED',
    // PTO
    PTO_REQUEST_SUBMITTED: 'PTO_REQUEST_SUBMITTED',
    PTO_REQUEST_CANCELLED: 'PTO_REQUEST_CANCELLED',
    PTO_BALANCE_VIEWED: 'PTO_BALANCE_VIEWED',
    PTO_HISTORY_VIEWED: 'PTO_HISTORY_VIEWED',
    // Time Tracking
    TIME_ENTRY_CREATED: 'TIME_ENTRY_CREATED',
    TIME_ENTRY_UPDATED: 'TIME_ENTRY_UPDATED',
    TIME_ENTRY_DELETED: 'TIME_ENTRY_DELETED',
    TIME_REPORT_VIEWED: 'TIME_REPORT_VIEWED',
    // Documents
    DOCUMENT_VIEWED: 'DOCUMENT_VIEWED',
    DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
    DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
    // Notifications
    NOTIFICATION_VIEWED: 'NOTIFICATION_VIEWED',
    NOTIFICATION_READ: 'NOTIFICATION_READ',
    // Settings
    SETTINGS_UPDATED: 'SETTINGS_UPDATED',
    // Announcements
    ANNOUNCEMENT_VIEWED: 'ANNOUNCEMENT_VIEWED',
    // Directory (Phase 24)
    DIRECTORY_VIEWED: 'DIRECTORY_VIEWED'
};
