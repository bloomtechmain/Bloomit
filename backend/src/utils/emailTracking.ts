import { pool } from '../db'

/**
 * Email Tracking Utility for Phase 19
 * 
 * Provides basic email logging functionality
 * Tracks: sent/delivered/failed status only (simplified tracking)
 */

export type EmailType = 
  | 'welcome'
  | 'password_reset'
  | 'pto_approved'
  | 'pto_denied'
  | 'payslip_ready'
  | 'payslip_signed'
  | 'time_entry_reminder'
  | 'announcement'
  | 'po_created'
  | 'po_approved'
  | 'po_rejected'
  | 'other'

export type DeliveryStatus = 'sent' | 'delivered' | 'failed'

export interface EmailLogEntry {
  id: number
  employee_id: number | null
  email_type: EmailType
  recipient_email: string
  subject: string | null
  sent_at: Date
  delivery_status: DeliveryStatus
  error_message: string | null
  metadata: any
}

export interface LogEmailParams {
  employeeId?: number | null
  emailType: EmailType
  recipientEmail: string
  subject?: string
  deliveryStatus?: DeliveryStatus
  errorMessage?: string | null
  metadata?: any
}

/**
 * Log an email that was sent
 * Call this immediately after attempting to send an email
 */
export async function logEmail(params: LogEmailParams): Promise<EmailLogEntry | null> {
  const {
    employeeId = null,
    emailType,
    recipientEmail,
    subject = null,
    deliveryStatus = 'sent',
    errorMessage = null,
    metadata = null
  } = params

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
    `

    const values = [
      employeeId,
      emailType,
      recipientEmail,
      subject,
      deliveryStatus,
      errorMessage,
      metadata ? JSON.stringify(metadata) : null
    ]

    const result = await pool.query(query, values)
    const logEntry = result.rows[0]

    console.log(`📧 Email logged: ${emailType} to ${recipientEmail} - ${deliveryStatus}`)

    return logEntry
  } catch (error) {
    console.error('Error logging email:', error)
    // Don't throw - logging failure shouldn't break email sending
    return null
  }
}

/**
 * Update delivery status of a logged email
 * Useful if you get delivery confirmation asynchronously
 */
export async function updateEmailDeliveryStatus(
  logId: number,
  deliveryStatus: DeliveryStatus,
  errorMessage?: string | null
): Promise<boolean> {
  try {
    const query = `
      UPDATE email_log
      SET delivery_status = $1,
          error_message = $2
      WHERE id = $3
      RETURNING id
    `

    const result = await pool.query(query, [deliveryStatus, errorMessage, logId])
    
    if (result.rows.length > 0) {
      console.log(`✓ Email log ${logId} updated to ${deliveryStatus}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error updating email delivery status:', error)
    return false
  }
}

/**
 * Get email logs for an employee
 * Useful for debugging and admin dashboards
 */
export async function getEmailLogsForEmployee(
  employeeId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: EmailLogEntry[]; total: number }> {
  try {
    // Count total
    const countQuery = `
      SELECT COUNT(*) as count
      FROM email_log
      WHERE employee_id = $1
    `
    const countResult = await pool.query(countQuery, [employeeId])
    const total = parseInt(countResult.rows[0].count)

    // Get paginated results
    const query = `
      SELECT *
      FROM email_log
      WHERE employee_id = $1
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `
    const result = await pool.query(query, [employeeId, limit, offset])

    return {
      logs: result.rows,
      total
    }
  } catch (error) {
    console.error('Error fetching email logs for employee:', error)
    return { logs: [], total: 0 }
  }
}

/**
 * Get email logs by type
 * Useful for analytics
 */
export async function getEmailLogsByType(
  emailType: EmailType,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
): Promise<EmailLogEntry[]> {
  try {
    let query = `
      SELECT *
      FROM email_log
      WHERE email_type = $1
    `
    const params: any[] = [emailType]
    let paramCount = 1

    if (startDate) {
      paramCount++
      query += ` AND sent_at >= $${paramCount}`
      params.push(startDate)
    }

    if (endDate) {
      paramCount++
      query += ` AND sent_at <= $${paramCount}`
      params.push(endDate)
    }

    query += ` ORDER BY sent_at DESC LIMIT $${paramCount + 1}`
    params.push(limit)

    const result = await pool.query(query, params)
    return result.rows
  } catch (error) {
    console.error('Error fetching email logs by type:', error)
    return []
  }
}

/**
 * Get failed email logs
 * Useful for monitoring and debugging
 */
export async function getFailedEmails(
  limit: number = 50,
  hoursBack: number = 24
): Promise<EmailLogEntry[]> {
  try {
    const query = `
      SELECT *
      FROM email_log
      WHERE delivery_status = 'failed'
        AND sent_at >= NOW() - INTERVAL '${hoursBack} hours'
      ORDER BY sent_at DESC
      LIMIT $1
    `
    const result = await pool.query(query, [limit])
    return result.rows
  } catch (error) {
    console.error('Error fetching failed emails:', error)
    return []
  }
}

/**
 * Get email statistics
 * Useful for admin dashboards
 */
export async function getEmailStatistics(
  startDate: Date,
  endDate: Date
): Promise<{
  total: number
  sent: number
  delivered: number
  failed: number
  byType: Record<EmailType, number>
}> {
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
    `
    const statsResult = await pool.query(statsQuery, [startDate, endDate])
    const stats = statsResult.rows[0]

    // By type
    const byTypeQuery = `
      SELECT 
        email_type,
        COUNT(*) as count
      FROM email_log
      WHERE sent_at >= $1 AND sent_at <= $2
      GROUP BY email_type
    `
    const byTypeResult = await pool.query(byTypeQuery, [startDate, endDate])

    const byType: Record<string, number> = {}
    byTypeResult.rows.forEach(row => {
      byType[row.email_type] = parseInt(row.count)
    })

    return {
      total: parseInt(stats.total),
      sent: parseInt(stats.sent),
      delivered: parseInt(stats.delivered),
      failed: parseInt(stats.failed),
      byType: byType as Record<EmailType, number>
    }
  } catch (error) {
    console.error('Error fetching email statistics:', error)
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      byType: {} as Record<EmailType, number>
    }
  }
}

/**
 * Check if an employee has email preferences that allow this email type
 * Returns true if email should be sent, false if blocked by preferences
 */
export async function checkEmailPreferences(
  employeeId: number,
  emailType: EmailType
): Promise<boolean> {
  try {
    // Critical emails that can't be disabled
    const criticalEmailTypes: EmailType[] = ['payslip_ready', 'payslip_signed', 'welcome', 'password_reset']
    
    if (criticalEmailTypes.includes(emailType)) {
      return true // Always send critical emails
    }

    // Check employee preferences
    const query = `
      SELECT email_preferences
      FROM employee_portal_settings
      WHERE employee_id = $1
    `
    const result = await pool.query(query, [employeeId])

    if (result.rows.length === 0) {
      // No preferences set, default to allowing all
      return true
    }

    const emailPreferences = result.rows[0].email_preferences || {}

    // Map email types to preference keys
    const preferenceMap: Record<string, string> = {
      'pto_approved': 'pto_notifications',
      'pto_denied': 'pto_notifications',
      'time_entry_reminder': 'time_entry_reminders',
      'announcement': 'announcement_notifications'
    }

    const preferenceKey = preferenceMap[emailType]
    
    if (!preferenceKey) {
      // No specific preference for this type, allow by default
      return true
    }

    // Check if preference is explicitly set to false
    return emailPreferences[preferenceKey] !== false
  } catch (error) {
    console.error('Error checking email preferences:', error)
    // On error, allow the email (fail open)
    return true
  }
}

/**
 * Helper: Log and send pattern
 * Wraps email sending with automatic logging
 */
export async function logAndSend<T>(
  params: LogEmailParams,
  sendFunction: () => Promise<T>
): Promise<T> {
  let deliveryStatus: DeliveryStatus = 'sent'
  let errorMessage: string | null = null

  try {
    const result = await sendFunction()
    deliveryStatus = 'sent' // Or 'delivered' if you get confirmation
    return result
  } catch (error) {
    deliveryStatus = 'failed'
    errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw error
  } finally {
    // Log regardless of success/failure
    await logEmail({
      ...params,
      deliveryStatus,
      errorMessage
    })
  }
}
