"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriority = exports.NotificationType = void 0;
exports.createNotification = createNotification;
exports.getNotifications = getNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
exports.archiveNotification = archiveNotification;
exports.getUnreadCount = getUnreadCount;
exports.deleteExpiredNotifications = deleteExpiredNotifications;
exports.notifyPTOApproved = notifyPTOApproved;
exports.notifyPTODenied = notifyPTODenied;
exports.notifyPayslipReady = notifyPayslipReady;
exports.notifyTimeEntryApproved = notifyTimeEntryApproved;
exports.notifyTimeEntryRejected = notifyTimeEntryRejected;
exports.notifyDocumentUploaded = notifyDocumentUploaded;
exports.notifyNewAnnouncement = notifyNewAnnouncement;
const db_1 = require("../db");
/**
 * Notification Service for Phase 18
 *
 * Creates and manages employee notifications
 * Integrates with WebSocket for real-time delivery
 */
var NotificationType;
(function (NotificationType) {
    // PTO Related
    NotificationType["PTO_APPROVED"] = "PTO_APPROVED";
    NotificationType["PTO_DENIED"] = "PTO_DENIED";
    NotificationType["PTO_CANCELLED"] = "PTO_CANCELLED";
    NotificationType["PTO_REQUEST_RECEIVED"] = "PTO_REQUEST_RECEIVED";
    // Payroll Related
    NotificationType["PAYSLIP_READY"] = "PAYSLIP_READY";
    NotificationType["PAYSLIP_SIGNED"] = "PAYSLIP_SIGNED";
    // Time Tracking Related
    NotificationType["TIME_ENTRY_APPROVED"] = "TIME_ENTRY_APPROVED";
    NotificationType["TIME_ENTRY_REJECTED"] = "TIME_ENTRY_REJECTED";
    NotificationType["TIME_ENTRY_REMINDER"] = "TIME_ENTRY_REMINDER";
    // Document Related
    NotificationType["DOCUMENT_UPLOADED"] = "DOCUMENT_UPLOADED";
    NotificationType["DOCUMENT_SHARED"] = "DOCUMENT_SHARED";
    // Announcement Related
    NotificationType["ANNOUNCEMENT_NEW"] = "ANNOUNCEMENT_NEW";
    NotificationType["ANNOUNCEMENT_URGENT"] = "ANNOUNCEMENT_URGENT";
    // Profile Related
    NotificationType["PROFILE_UPDATED"] = "PROFILE_UPDATED";
    NotificationType["PASSWORD_CHANGED"] = "PASSWORD_CHANGED";
    // General
    NotificationType["SYSTEM_ALERT"] = "SYSTEM_ALERT";
    NotificationType["REMINDER"] = "REMINDER";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["NORMAL"] = "normal";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["URGENT"] = "urgent";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
/**
 * Create a new notification
 */
async function createNotification(params) {
    const { employeeId, type, title, message = null, link = null, priority = NotificationPriority.NORMAL, expiresAt = null } = params;
    const query = `
    INSERT INTO employee_notifications (
      employee_id,
      notification_type,
      title,
      message,
      link,
      priority,
      expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
    const values = [employeeId, type, title, message, link, priority, expiresAt];
    try {
        const result = await db_1.pool.query(query, values);
        const notification = result.rows[0];
        console.log(`✓ Notification created: ${type} for employee ${employeeId}`);
        // Emit WebSocket event (will be handled by WebSocket service)
        const globalAny = global;
        if (globalAny.io) {
            globalAny.io.to(`employee_${employeeId}`).emit('new_notification', notification);
        }
        return notification;
    }
    catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}
/**
 * Get notifications for an employee
 */
async function getNotifications(employeeId, filters) {
    const { unreadOnly = false, limit = 50, offset = 0 } = filters || {};
    let query = `
    SELECT * FROM employee_notifications
    WHERE employee_id = $1
      AND is_archived = false
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  `;
    const params = [employeeId];
    let paramCount = 1;
    if (unreadOnly) {
        paramCount++;
        query += ` AND is_read = false`;
    }
    // Count total
    const countResult = await db_1.pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), params);
    const total = parseInt(countResult.rows[0].count);
    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    const result = await db_1.pool.query(query, params);
    return {
        notifications: result.rows,
        total
    };
}
/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId, employeeId) {
    const query = `
    UPDATE employee_notifications
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE notification_id = $1 AND employee_id = $2
    RETURNING notification_id
  `;
    const result = await db_1.pool.query(query, [notificationId, employeeId]);
    return result.rows.length > 0;
}
/**
 * Mark all notifications as read for an employee
 */
async function markAllNotificationsAsRead(employeeId) {
    const query = `
    UPDATE employee_notifications
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE employee_id = $1 AND is_read = false
    RETURNING notification_id
  `;
    const result = await db_1.pool.query(query, [employeeId]);
    return result.rows.length;
}
/**
 * Archive notification
 */
async function archiveNotification(notificationId, employeeId) {
    const query = `
    UPDATE employee_notifications
    SET is_archived = true
    WHERE notification_id = $1 AND employee_id = $2
    RETURNING notification_id
  `;
    const result = await db_1.pool.query(query, [notificationId, employeeId]);
    return result.rows.length > 0;
}
/**
 * Get unread notification count
 */
async function getUnreadCount(employeeId) {
    const query = `
    SELECT COUNT(*) as count
    FROM employee_notifications
    WHERE employee_id = $1
      AND is_read = false
      AND is_archived = false
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  `;
    const result = await db_1.pool.query(query, [employeeId]);
    return parseInt(result.rows[0].count);
}
/**
 * Delete expired notifications (for cron job)
 */
async function deleteExpiredNotifications() {
    const query = `
    DELETE FROM employee_notifications
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    RETURNING notification_id
  `;
    const result = await db_1.pool.query(query);
    const deletedCount = result.rows.length;
    if (deletedCount > 0) {
        console.log(`✓ Deleted ${deletedCount} expired notifications`);
    }
    return deletedCount;
}
// ==================== NOTIFICATION HELPERS ====================
/**
 * Notify employee when PTO request is approved
 */
async function notifyPTOApproved(employeeId, requestId, fromDate, toDate, totalDays) {
    return createNotification({
        employeeId,
        type: NotificationType.PTO_APPROVED,
        title: '✅ Time Off Request Approved',
        message: `Your time off request from ${fromDate} to ${toDate} (${totalDays} days) has been approved.`,
        link: `/employee/time-off`,
        priority: NotificationPriority.HIGH
    });
}
/**
 * Notify employee when PTO request is denied
 */
async function notifyPTODenied(employeeId, requestId, reason) {
    const message = reason
        ? `Your time off request was denied. Reason: ${reason}`
        : 'Your time off request was denied. Please contact your manager for details.';
    return createNotification({
        employeeId,
        type: NotificationType.PTO_DENIED,
        title: '❌ Time Off Request Denied',
        message,
        link: `/employee/time-off`,
        priority: NotificationPriority.HIGH
    });
}
/**
 * Notify employee when payslip is ready for signature
 */
async function notifyPayslipReady(employeeId, payslipId, month, year) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month - 1];
    return createNotification({
        employeeId,
        type: NotificationType.PAYSLIP_READY,
        title: '💰 Payslip Ready for Signature',
        message: `Your payslip for ${monthName} ${year} is ready. Please review and sign it.`,
        link: `/employee/payroll`,
        priority: NotificationPriority.URGENT
    });
}
/**
 * Notify employee when time entry is approved
 */
async function notifyTimeEntryApproved(employeeId, entryId, date, hours) {
    return createNotification({
        employeeId,
        type: NotificationType.TIME_ENTRY_APPROVED,
        title: '✅ Time Entry Approved',
        message: `Your time entry for ${date} (${hours} hours) has been approved.`,
        link: `/employee/time-tracker`,
        priority: NotificationPriority.NORMAL
    });
}
/**
 * Notify employee when time entry is rejected
 */
async function notifyTimeEntryRejected(employeeId, entryId, date, reason) {
    const message = reason
        ? `Your time entry for ${date} was rejected. Reason: ${reason}`
        : `Your time entry for ${date} was rejected.`;
    return createNotification({
        employeeId,
        type: NotificationType.TIME_ENTRY_REJECTED,
        title: '❌ Time Entry Rejected',
        message,
        link: `/employee/time-tracker`,
        priority: NotificationPriority.HIGH
    });
}
/**
 * Notify employee when document is uploaded
 */
async function notifyDocumentUploaded(employeeId, documentName) {
    return createNotification({
        employeeId,
        type: NotificationType.DOCUMENT_UPLOADED,
        title: '📄 Document Uploaded Successfully',
        message: `Your document "${documentName}" has been uploaded successfully.`,
        link: `/employee/documents`,
        priority: NotificationPriority.NORMAL
    });
}
/**
 * Notify employee of new announcement
 */
async function notifyNewAnnouncement(employeeId, announcementId, title, priority) {
    return createNotification({
        employeeId,
        type: priority === 'urgent' ? NotificationType.ANNOUNCEMENT_URGENT : NotificationType.ANNOUNCEMENT_NEW,
        title: priority === 'urgent' ? `🚨 Urgent: ${title}` : `📢 ${title}`,
        message: 'Click to view the full announcement.',
        link: `/employee/dashboard`,
        priority: priority === 'urgent' ? NotificationPriority.URGENT : NotificationPriority.NORMAL
    });
}
