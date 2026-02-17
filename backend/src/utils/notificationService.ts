import { pool } from '../db'

/**
 * Notification Service for Phase 18
 * 
 * Creates and manages employee notifications
 * Integrates with WebSocket for real-time delivery
 */

export enum NotificationType {
  // PTO Related
  PTO_APPROVED = 'PTO_APPROVED',
  PTO_DENIED = 'PTO_DENIED',
  PTO_CANCELLED = 'PTO_CANCELLED',
  PTO_REQUEST_RECEIVED = 'PTO_REQUEST_RECEIVED',
  
  // Payroll Related
  PAYSLIP_READY = 'PAYSLIP_READY',
  PAYSLIP_SIGNED = 'PAYSLIP_SIGNED',
  
  // Time Tracking Related
  TIME_ENTRY_APPROVED = 'TIME_ENTRY_APPROVED',
  TIME_ENTRY_REJECTED = 'TIME_ENTRY_REJECTED',
  TIME_ENTRY_REMINDER = 'TIME_ENTRY_REMINDER',
  
  // Document Related
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  
  // Announcement Related
  ANNOUNCEMENT_NEW = 'ANNOUNCEMENT_NEW',
  ANNOUNCEMENT_URGENT = 'ANNOUNCEMENT_URGENT',
  
  // Profile Related
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // General
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  REMINDER = 'REMINDER'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface CreateNotificationParams {
  employeeId: number
  type: NotificationType
  title: string
  message?: string
  link?: string
  priority?: NotificationPriority
  expiresAt?: Date
}

export interface Notification {
  notification_id: number
  employee_id: number
  notification_type: string
  title: string
  message: string | null
  link: string | null
  priority: string
  is_read: boolean
  is_archived: boolean
  created_at: Date
  read_at: Date | null
  expires_at: Date | null
}

/**
 * Create a new notification
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification> {
  const {
    employeeId,
    type,
    title,
    message = null,
    link = null,
    priority = NotificationPriority.NORMAL,
    expiresAt = null
  } = params

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
  `

  const values = [employeeId, type, title, message, link, priority, expiresAt]

  try {
    const result = await pool.query(query, values)
    const notification = result.rows[0]

    console.log(`✓ Notification created: ${type} for employee ${employeeId}`)

    // Emit WebSocket event (will be handled by WebSocket service)
    const globalAny = global as any
    if (globalAny.io) {
      globalAny.io.to(`employee_${employeeId}`).emit('new_notification', notification)
    }

    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Get notifications for an employee
 */
export async function getNotifications(
  employeeId: number,
  filters?: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
  }
): Promise<{ notifications: Notification[]; total: number }> {
  const { unreadOnly = false, limit = 50, offset = 0 } = filters || {}

  let query = `
    SELECT * FROM employee_notifications
    WHERE employee_id = $1
      AND is_archived = false
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  `

  const params: any[] = [employeeId]
  let paramCount = 1

  if (unreadOnly) {
    paramCount++
    query += ` AND is_read = false`
  }

  // Count total
  const countResult = await pool.query(
    query.replace('SELECT *', 'SELECT COUNT(*)'),
    params
  )
  const total = parseInt(countResult.rows[0].count)

  // Get paginated results
  query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
  params.push(limit, offset)

  const result = await pool.query(query, params)

  return {
    notifications: result.rows,
    total
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: number,
  employeeId: number
): Promise<boolean> {
  const query = `
    UPDATE employee_notifications
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE notification_id = $1 AND employee_id = $2
    RETURNING notification_id
  `

  const result = await pool.query(query, [notificationId, employeeId])
  return result.rows.length > 0
}

/**
 * Mark all notifications as read for an employee
 */
export async function markAllNotificationsAsRead(
  employeeId: number
): Promise<number> {
  const query = `
    UPDATE employee_notifications
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE employee_id = $1 AND is_read = false
    RETURNING notification_id
  `

  const result = await pool.query(query, [employeeId])
  return result.rows.length
}

/**
 * Archive notification
 */
export async function archiveNotification(
  notificationId: number,
  employeeId: number
): Promise<boolean> {
  const query = `
    UPDATE employee_notifications
    SET is_archived = true
    WHERE notification_id = $1 AND employee_id = $2
    RETURNING notification_id
  `

  const result = await pool.query(query, [notificationId, employeeId])
  return result.rows.length > 0
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(employeeId: number): Promise<number> {
  const query = `
    SELECT COUNT(*) as count
    FROM employee_notifications
    WHERE employee_id = $1
      AND is_read = false
      AND is_archived = false
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  `

  const result = await pool.query(query, [employeeId])
  return parseInt(result.rows[0].count)
}

/**
 * Delete expired notifications (for cron job)
 */
export async function deleteExpiredNotifications(): Promise<number> {
  const query = `
    DELETE FROM employee_notifications
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    RETURNING notification_id
  `

  const result = await pool.query(query)
  const deletedCount = result.rows.length

  if (deletedCount > 0) {
    console.log(`✓ Deleted ${deletedCount} expired notifications`)
  }

  return deletedCount
}

// ==================== NOTIFICATION HELPERS ====================

/**
 * Notify employee when PTO request is approved
 */
export async function notifyPTOApproved(
  employeeId: number,
  requestId: number,
  fromDate: string,
  toDate: string,
  totalDays: number
): Promise<Notification> {
  return createNotification({
    employeeId,
    type: NotificationType.PTO_APPROVED,
    title: '✅ Time Off Request Approved',
    message: `Your time off request from ${fromDate} to ${toDate} (${totalDays} days) has been approved.`,
    link: `/employee/time-off`,
    priority: NotificationPriority.HIGH
  })
}

/**
 * Notify employee when PTO request is denied
 */
export async function notifyPTODenied(
  employeeId: number,
  requestId: number,
  reason: string | null
): Promise<Notification> {
  const message = reason
    ? `Your time off request was denied. Reason: ${reason}`
    : 'Your time off request was denied. Please contact your manager for details.'

  return createNotification({
    employeeId,
    type: NotificationType.PTO_DENIED,
    title: '❌ Time Off Request Denied',
    message,
    link: `/employee/time-off`,
    priority: NotificationPriority.HIGH
  })
}

/**
 * Notify employee when payslip is ready for signature
 */
export async function notifyPayslipReady(
  employeeId: number,
  payslipId: number,
  month: number,
  year: number
): Promise<Notification> {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[month - 1]

  return createNotification({
    employeeId,
    type: NotificationType.PAYSLIP_READY,
    title: '💰 Payslip Ready for Signature',
    message: `Your payslip for ${monthName} ${year} is ready. Please review and sign it.`,
    link: `/employee/payroll`,
    priority: NotificationPriority.URGENT
  })
}

/**
 * Notify employee when time entry is approved
 */
export async function notifyTimeEntryApproved(
  employeeId: number,
  entryId: number,
  date: string,
  hours: number
): Promise<Notification> {
  return createNotification({
    employeeId,
    type: NotificationType.TIME_ENTRY_APPROVED,
    title: '✅ Time Entry Approved',
    message: `Your time entry for ${date} (${hours} hours) has been approved.`,
    link: `/employee/time-tracker`,
    priority: NotificationPriority.NORMAL
  })
}

/**
 * Notify employee when time entry is rejected
 */
export async function notifyTimeEntryRejected(
  employeeId: number,
  entryId: number,
  date: string,
  reason: string | null
): Promise<Notification> {
  const message = reason
    ? `Your time entry for ${date} was rejected. Reason: ${reason}`
    : `Your time entry for ${date} was rejected.`

  return createNotification({
    employeeId,
    type: NotificationType.TIME_ENTRY_REJECTED,
    title: '❌ Time Entry Rejected',
    message,
    link: `/employee/time-tracker`,
    priority: NotificationPriority.HIGH
  })
}

/**
 * Notify employee when document is uploaded
 */
export async function notifyDocumentUploaded(
  employeeId: number,
  documentName: string
): Promise<Notification> {
  return createNotification({
    employeeId,
    type: NotificationType.DOCUMENT_UPLOADED,
    title: '📄 Document Uploaded Successfully',
    message: `Your document "${documentName}" has been uploaded successfully.`,
    link: `/employee/documents`,
    priority: NotificationPriority.NORMAL
  })
}

/**
 * Notify employee of new announcement
 */
export async function notifyNewAnnouncement(
  employeeId: number,
  announcementId: number,
  title: string,
  priority: 'normal' | 'urgent'
): Promise<Notification> {
  return createNotification({
    employeeId,
    type: priority === 'urgent' ? NotificationType.ANNOUNCEMENT_URGENT : NotificationType.ANNOUNCEMENT_NEW,
    title: priority === 'urgent' ? `🚨 Urgent: ${title}` : `📢 ${title}`,
    message: 'Click to view the full announcement.',
    link: `/employee/dashboard`,
    priority: priority === 'urgent' ? NotificationPriority.URGENT : NotificationPriority.NORMAL
  })
}
