"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEmail = logEmail;
exports.updateEmailDeliveryStatus = updateEmailDeliveryStatus;
exports.getEmailLogsForEmployee = getEmailLogsForEmployee;
exports.getEmailLogsByType = getEmailLogsByType;
exports.getFailedEmails = getFailedEmails;
exports.getEmailStatistics = getEmailStatistics;
exports.checkEmailPreferences = checkEmailPreferences;
exports.logAndSend = logAndSend;
const db_1 = require("../db");
/**
 * Log an email that was sent
 * Call this immediately after attempting to send an email
 */
async function logEmail(params) {
    const { employeeId = null, emailType, recipientEmail, subject = null, deliveryStatus = 'sent', errorMessage = null, metadata = null } = params;
    try {
        const query = `
      INSERT INTO email_log (
        employee_id,
        email_type,
        recipient_email,
        subject,
        delivery_status,
        error_message,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            employeeId,
            emailType,
            recipientEmail,
            subject,
            deliveryStatus,
            errorMessage,
            metadata ? JSON.stringify(metadata) : null
        ];
        const result = await db_1.pool.query(query, values);
        const logEntry = result.rows[0];
        console.log(`📧 Email logged: ${emailType} to ${recipientEmail} - ${deliveryStatus}`);
        return logEntry;
    }
    catch (error) {
        console.error('Error logging email:', error);
        // Don't throw - logging failure shouldn't break email sending
        return null;
    }
}
/**
 * Update delivery status of a logged email
 * Useful if you get delivery confirmation asynchronously
 */
async function updateEmailDeliveryStatus(logId, deliveryStatus, errorMessage) {
    try {
        const query = `
      UPDATE email_log
      SET delivery_status = $1,
          error_message = $2
      WHERE id = $3
      RETURNING id
    `;
        const result = await db_1.pool.query(query, [deliveryStatus, errorMessage, logId]);
        if (result.rows.length > 0) {
            console.log(`✓ Email log ${logId} updated to ${deliveryStatus}`);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Error updating email delivery status:', error);
        return false;
    }
}
/**
 * Get email logs for an employee
 * Useful for debugging and admin dashboards
 */
async function getEmailLogsForEmployee(employeeId, limit = 50, offset = 0) {
    try {
        // Count total
        const countQuery = `
      SELECT COUNT(*) as count
      FROM email_log
      WHERE employee_id = $1
    `;
        const countResult = await db_1.pool.query(countQuery, [employeeId]);
        const total = parseInt(countResult.rows[0].count);
        // Get paginated results
        const query = `
      SELECT *
      FROM email_log
      WHERE employee_id = $1
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `;
        const result = await db_1.pool.query(query, [employeeId, limit, offset]);
        return {
            logs: result.rows,
            total
        };
    }
    catch (error) {
        console.error('Error fetching email logs for employee:', error);
        return { logs: [], total: 0 };
    }
}
/**
 * Get email logs by type
 * Useful for analytics
 */
async function getEmailLogsByType(emailType, startDate, endDate, limit = 100) {
    try {
        let query = `
      SELECT *
      FROM email_log
      WHERE email_type = $1
    `;
        const params = [emailType];
        let paramCount = 1;
        if (startDate) {
            paramCount++;
            query += ` AND sent_at >= $${paramCount}`;
            params.push(startDate);
        }
        if (endDate) {
            paramCount++;
            query += ` AND sent_at <= $${paramCount}`;
            params.push(endDate);
        }
        query += ` ORDER BY sent_at DESC LIMIT $${paramCount + 1}`;
        params.push(limit);
        const result = await db_1.pool.query(query, params);
        return result.rows;
    }
    catch (error) {
        console.error('Error fetching email logs by type:', error);
        return [];
    }
}
/**
 * Get failed email logs
 * Useful for monitoring and debugging
 */
async function getFailedEmails(limit = 50, hoursBack = 24) {
    try {
        const query = `
      SELECT *
      FROM email_log
      WHERE delivery_status = 'failed'
        AND sent_at >= NOW() - INTERVAL '${hoursBack} hours'
      ORDER BY sent_at DESC
      LIMIT $1
    `;
        const result = await db_1.pool.query(query, [limit]);
        return result.rows;
    }
    catch (error) {
        console.error('Error fetching failed emails:', error);
        return [];
    }
}
/**
 * Get email statistics
 * Useful for admin dashboards
 */
async function getEmailStatistics(startDate, endDate) {
    try {
        // Overall stats
        const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE delivery_status = 'sent') as sent,
        COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed
      FROM email_log
      WHERE sent_at >= $1 AND sent_at <= $2
    `;
        const statsResult = await db_1.pool.query(statsQuery, [startDate, endDate]);
        const stats = statsResult.rows[0];
        // By type
        const byTypeQuery = `
      SELECT 
        email_type,
        COUNT(*) as count
      FROM email_log
      WHERE sent_at >= $1 AND sent_at <= $2
      GROUP BY email_type
    `;
        const byTypeResult = await db_1.pool.query(byTypeQuery, [startDate, endDate]);
        const byType = {};
        byTypeResult.rows.forEach(row => {
            byType[row.email_type] = parseInt(row.count);
        });
        return {
            total: parseInt(stats.total),
            sent: parseInt(stats.sent),
            delivered: parseInt(stats.delivered),
            failed: parseInt(stats.failed),
            byType: byType
        };
    }
    catch (error) {
        console.error('Error fetching email statistics:', error);
        return {
            total: 0,
            sent: 0,
            delivered: 0,
            failed: 0,
            byType: {}
        };
    }
}
/**
 * Check if an employee has email preferences that allow this email type
 * Returns true if email should be sent, false if blocked by preferences
 */
async function checkEmailPreferences(employeeId, emailType) {
    try {
        // Critical emails that can't be disabled
        const criticalEmailTypes = ['payslip_ready', 'payslip_signed', 'welcome', 'password_reset'];
        if (criticalEmailTypes.includes(emailType)) {
            return true; // Always send critical emails
        }
        // Check employee preferences
        const query = `
      SELECT email_preferences
      FROM employee_portal_settings
      WHERE employee_id = $1
    `;
        const result = await db_1.pool.query(query, [employeeId]);
        if (result.rows.length === 0) {
            // No preferences set, default to allowing all
            return true;
        }
        const emailPreferences = result.rows[0].email_preferences || {};
        // Map email types to preference keys
        const preferenceMap = {
            'pto_approved': 'pto_notifications',
            'pto_denied': 'pto_notifications',
            'time_entry_reminder': 'time_entry_reminders',
            'announcement': 'announcement_notifications'
        };
        const preferenceKey = preferenceMap[emailType];
        if (!preferenceKey) {
            // No specific preference for this type, allow by default
            return true;
        }
        // Check if preference is explicitly set to false
        return emailPreferences[preferenceKey] !== false;
    }
    catch (error) {
        console.error('Error checking email preferences:', error);
        // On error, allow the email (fail open)
        return true;
    }
}
/**
 * Helper: Log and send pattern
 * Wraps email sending with automatic logging
 */
async function logAndSend(params, sendFunction) {
    let deliveryStatus = 'sent';
    let errorMessage = null;
    try {
        const result = await sendFunction();
        deliveryStatus = 'sent'; // Or 'delivered' if you get confirmation
        return result;
    }
    catch (error) {
        deliveryStatus = 'failed';
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
    }
    finally {
        // Log regardless of success/failure
        await logEmail({
            ...params,
            deliveryStatus,
            errorMessage
        });
    }
}
