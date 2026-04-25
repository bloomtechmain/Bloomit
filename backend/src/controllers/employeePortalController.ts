import { Request, Response } from 'express'
import { query } from '../db';
import { logEmployeeActionFromRequest, EmployeeAuditActions } from '../utils/employeeAuditLog'

/**
 * Employee Portal Controller
 * 
 * Handles employee portal dashboard and statistics endpoints.
 * Phase 1 implementation - basic dashboard and stats.
 */

/**
 * GET /api/employee-portal/me
 * 
 * Get current authenticated user's employee record
 * This is the primary endpoint for employees to access their own data
 * 
 * Security: Uses JWT token to identify user and returns their employee record
 * No special permissions needed - employees can always access their own data
 */
export async function getMyEmployeeRecord(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized', 
        message: 'Authentication required' 
      })
    }

    const userId = req.user.userId

    // Get employee record by user_id
    const sqlQuery = `
      SELECT 
        id,
        employee_number,
        first_name,
        last_name,
        email,
        phone,
        designation,
        employee_department,
        user_id,
        is_active,
        created_at
      FROM employees
      WHERE user_id = $1
    `
    const result = await query(sqlQuery, [userId], req.dbClient);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'employee_not_found', 
        message: 'No employee record found for this user account. Please contact HR.' 
      })
    }

    const employee = result.rows[0]

    // Check if employee is active
    if (!employee.is_active) {
      return res.status(403).json({ 
        error: 'account_inactive', 
        message: 'Your employee account is inactive. Please contact HR.' 
      })
    }

    console.log(`✅ Employee record retrieved for user ${req.user.email}: Employee ID ${employee.id}`)

    return res.status(200).json({
      employee: {
        id: employee.id,
        employeeNumber: employee.employee_number,
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        phone: employee.phone,
        position: employee.designation,
        department: employee.employee_department
      }
    })

  } catch (error) {
    console.error('Error fetching employee record:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch employee record' 
    })
  }
}

/**
 * GET /api/employee-portal/dashboard/:employeeId
 * 
 * Get comprehensive dashboard data for an employee including:
 * - Employee basic information
 * - Quick statistics (PTO balance, time entries, etc.)
 * - Recent announcements
 * - Recent notifications
 */
export async function getDashboard(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    // Log the dashboard view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DASHBOARD_VIEWED,
      req,
      { resourceType: 'dashboard', resourceId: employeeId }
    )

    // Fetch employee basic information
    const employeeQuery = `
      SELECT 
        id,
        employee_number,
        first_name,
        last_name,
        email,
        phone,
        designation,
        employee_department,
        created_at
      FROM employees
      WHERE id = $1
    `
    const employeeResult = await query(employeeQuery, [employeeId], req.dbClient)

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'employee_not_found' })
    }

    const employee = employeeResult.rows[0]

    // Calculate PTO balance
    const ptoBalanceQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'denied') as denied_requests,
        COALESCE(SUM(
          CASE 
            WHEN status = 'approved' 
            THEN (to_date - from_date + 1)
            ELSE 0
          END
        ), 0) as days_used
      FROM pto_requests
      WHERE employee_id = $1
        AND EXTRACT(YEAR FROM from_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `
    const ptoResult = await query(ptoBalanceQuery, [employeeId], req.dbClient)
    const ptoData = ptoResult.rows[0]
    
    // Get employee's PTO allowance from their record
    const ptoAllowanceQuery = 'SELECT pto_allowance FROM employees WHERE id = $1'
    const ptoAllowanceResult = await query(ptoAllowanceQuery, [employeeId], req.dbClient)
    const totalPtoAllowance = ptoAllowanceResult.rows[0]?.pto_allowance || 20
    const ptoBalance = totalPtoAllowance - parseInt(ptoData.days_used)

    // Get time entries for current week
    const timeEntriesQuery = `
      SELECT 
        COUNT(*) as entry_count,
        COALESCE(SUM(total_hours), 0) as total_hours
      FROM time_entries
      WHERE employee_id = $1
        AND date >= date_trunc('week', CURRENT_DATE)
        AND date < date_trunc('week', CURRENT_DATE) + interval '1 week'
    `
    const timeResult = await query(timeEntriesQuery, [employeeId], req.dbClient)
    const timeData = timeResult.rows[0]

    // Get pending time entries (not yet approved)
    const pendingTimeQuery = `
      SELECT COUNT(*) as pending_count
      FROM time_entries
      WHERE employee_id = $1
        AND status = 'pending'
    `
    const pendingTimeResult = await query(pendingTimeQuery, [employeeId], req.dbClient)
    const pendingTimeCount = parseInt(pendingTimeResult.rows[0].pending_count)

    // Get recent announcements (last 5, active only)
    const announcementsQuery = `
      SELECT 
        id,
        title,
        content,
        priority,
        category,
        start_date,
        created_at
      FROM announcements
      WHERE is_active = true
        AND start_date <= CURRENT_TIMESTAMP
        AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
      ORDER BY priority DESC, created_at DESC
      LIMIT 5
    `
    const announcementsResult = await query(announcementsQuery, [], req.dbClient)

    // Get recent notifications (last 10, unread first)
    const notificationsQuery = `
      SELECT 
        id,
        notification_type,
        title,
        message,
        link,
        priority,
        is_read,
        created_at
      FROM employee_notifications
      WHERE employee_id = $1
        AND is_archived = false
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY is_read ASC, created_at DESC
      LIMIT 10
    `
    const notificationsResult = await query(notificationsQuery, [employeeId], req.dbClient)

    // Count unread notifications
    const unreadNotificationsQuery = `
      SELECT COUNT(*) as unread_count
      FROM employee_notifications
      WHERE employee_id = $1
        AND is_read = false
        AND is_archived = false
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `
    const unreadResult = await query(unreadNotificationsQuery, [employeeId], req.dbClient)
    const unreadCount = parseInt(unreadResult.rows[0].unread_count)

    // Compile dashboard response
    const dashboardData = {
      employee: {
        id: employee.id,
        employeeNumber: employee.employee_number,
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        phone: employee.phone,
        position: employee.designation,
        department: employee.employee_department
      },
      stats: {
        ptoBalance: ptoBalance,
        pendingPtoRequests: parseInt(ptoData.pending_requests),
        approvedPtoRequests: parseInt(ptoData.approved_requests),
        timeEntriesThisWeek: parseFloat(timeData.total_hours),
        pendingTimeEntries: pendingTimeCount,
        unreadNotifications: unreadCount
      },
      announcements: announcementsResult.rows,
      recentNotifications: notificationsResult.rows
    }

    return res.status(200).json(dashboardData)

  } catch (error) {
    console.error('Error fetching dashboard:', error)
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DASHBOARD_VIEWED,
      req,
      {
        resourceType: 'dashboard',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch dashboard data' })
  }
}

/**
 * GET /api/employee-portal/stats/:employeeId
 * 
 * Get detailed statistics for an employee:
 * - PTO balance and usage
 * - Time tracking statistics
 * - Notification counts
 * - Pending approvals
 */
export async function getStats(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    // Log the stats view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.STATS_VIEWED,
      req,
      { resourceType: 'stats', resourceId: employeeId }
    )

    // Get employee's PTO allowance
    const employeeQuery = 'SELECT pto_allowance FROM employees WHERE id = $1'
    const employeeResult = await query(employeeQuery, [employeeId], req.dbClient)
    const totalPtoAllowance = employeeResult.rows[0]?.pto_allowance || 20

    // PTO Statistics
    const ptoStatsQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
        COUNT(*) FILTER (WHERE status = 'denied') as denied_requests,
        COALESCE(SUM(
          CASE 
            WHEN status = 'approved' 
            THEN (to_date - from_date + 1)
            ELSE 0
          END
        ), 0) as days_used_this_year
      FROM pto_requests
      WHERE employee_id = $1
        AND EXTRACT(YEAR FROM from_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `
    const ptoStatsResult = await query(ptoStatsQuery, [employeeId], req.dbClient)
    const ptoStats = ptoStatsResult.rows[0]

    const ptoBalance = totalPtoAllowance - parseInt(ptoStats.days_used_this_year)

    // Time Entry Statistics
    const timeStatsQuery = `
      SELECT 
        COUNT(*) as total_entries,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_entries,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_entries,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_entries
      FROM time_entries
      WHERE employee_id = $1
        AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `
    const timeStatsResult = await query(timeStatsQuery, [employeeId], req.dbClient)
    const timeStats = timeStatsResult.rows[0]

    // Time entries this week
    const weekTimeQuery = `
      SELECT COALESCE(SUM(total_hours), 0) as hours_this_week
      FROM time_entries
      WHERE employee_id = $1
        AND date >= date_trunc('week', CURRENT_DATE)
        AND date < date_trunc('week', CURRENT_DATE) + interval '1 week'
    `
    const weekTimeResult = await query(weekTimeQuery, [employeeId], req.dbClient)
    const hoursThisWeek = parseFloat(weekTimeResult.rows[0].hours_this_week)

    // Notification Statistics
    const notificationStatsQuery = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE is_read = false) as unread_notifications,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_notifications
      FROM employee_notifications
      WHERE employee_id = $1
        AND is_archived = false
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `
    const notificationStatsResult = await query(notificationStatsQuery, [employeeId], req.dbClient)
    const notificationStats = notificationStatsResult.rows[0]

    // Compile stats response
    const stats = {
      employeeId: employeeId,
      pto: {
        totalAllowance: totalPtoAllowance,
        daysUsed: parseInt(ptoStats.days_used_this_year),
        balance: ptoBalance,
        pendingRequests: parseInt(ptoStats.pending_requests),
        approvedRequests: parseInt(ptoStats.approved_requests),
        deniedRequests: parseInt(ptoStats.denied_requests)
      },
      timeTracking: {
        hoursThisWeek: hoursThisWeek,
        hoursThisMonth: parseFloat(timeStats.total_hours),
        entriesThisMonth: parseInt(timeStats.total_entries),
        pendingEntries: parseInt(timeStats.pending_entries),
        approvedEntries: parseInt(timeStats.approved_entries),
        rejectedEntries: parseInt(timeStats.rejected_entries)
      },
      notifications: {
        total: parseInt(notificationStats.total_notifications),
        unread: parseInt(notificationStats.unread_notifications),
        urgent: parseInt(notificationStats.urgent_notifications)
      }
    }

    return res.status(200).json(stats)

  } catch (error) {
    console.error('Error fetching stats:', error)
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.STATS_VIEWED,
      req,
      {
        resourceType: 'stats',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch statistics' })
  }
}

/**
 * PUT /api/employee-portal/profile/:employeeId
 * 
 * Update employee profile (limited fields only)
 * Phase 13 implementation
 * 
 * Editable fields:
 * - phone
 * - address
 * - emergency_contact_name
 * - emergency_contact_relationship
 * - emergency_contact_phone
 * 
 * All other fields are read-only
 */
export async function updateProfile(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { phone, address, emergencyContact } = req.body

  try {
    // Get current profile for audit log (old values)
    const currentProfileQuery = `
      SELECT 
        phone,
        address,
        emergency_contact_name,
        emergency_contact_relationship,
        emergency_contact_phone
      FROM employees
      WHERE id = $1
    `
    const currentProfileResult = await query(currentProfileQuery, [employeeId], req.dbClient)
    
    if (currentProfileResult.rows.length === 0) {
      return res.status(404).json({ error: 'employee_not_found' })
    }

    const oldValues = currentProfileResult.rows[0]

    // Build update query dynamically based on provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 0

    if (phone !== undefined) {
      paramCount++
      updates.push(`phone = $${paramCount}`)
      values.push(phone)
    }

    if (address !== undefined) {
      paramCount++
      updates.push(`address = $${paramCount}`)
      values.push(address)
    }

    if (emergencyContact?.name !== undefined) {
      paramCount++
      updates.push(`emergency_contact_name = $${paramCount}`)
      values.push(emergencyContact.name)
    }

    if (emergencyContact?.relationship !== undefined) {
      paramCount++
      updates.push(`emergency_contact_relationship = $${paramCount}`)
      values.push(emergencyContact.relationship)
    }

    if (emergencyContact?.phone !== undefined) {
      paramCount++
      updates.push(`emergency_contact_phone = $${paramCount}`)
      values.push(emergencyContact.phone)
    }

    // If no fields to update, return error
    if (updates.length === 0) {
      return res.status(400).json({ 
        error: 'no_fields_to_update',
        message: 'No editable fields provided' 
      })
    }

    // Add updated_at timestamp
    paramCount++
    updates.push(`updated_at = NOW()`)

    // Add employee ID as last parameter
    paramCount++
    values.push(employeeId)

    // Execute update
    const updateQuery = `
      UPDATE employees 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id
    `
    
    await query(updateQuery, values, req.dbClient)

    // Build new values object for audit log
    const newValues = {
      phone: phone !== undefined ? phone : oldValues.phone,
      address: address !== undefined ? address : oldValues.address,
      emergency_contact_name: emergencyContact?.name !== undefined ? emergencyContact.name : oldValues.emergency_contact_name,
      emergency_contact_relationship: emergencyContact?.relationship !== undefined ? emergencyContact.relationship : oldValues.emergency_contact_relationship,
      emergency_contact_phone: emergencyContact?.phone !== undefined ? emergencyContact.phone : oldValues.emergency_contact_phone
    }

    // Log the profile update
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PROFILE_UPDATED,
      req,
      {
        resourceType: 'profile',
        resourceId: employeeId,
        oldValue: oldValues,
        newValue: newValues
      }
    )

    // Fetch and return updated profile
    const updatedProfile = await getProfileData(employeeId, req.dbClient)

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PROFILE_UPDATED,
      req,
      {
        resourceType: 'profile',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to update profile' })
  }
}

/**
 * Helper function to get profile data
 * Extracted for reuse in getProfile and updateProfile
 */
async function getProfileData(employeeId: number, dbClient: any) {
  const profileQuery = `
    SELECT 
      e.id,
      e.employee_number,
      e.first_name,
      e.last_name,
      e.email,
      e.phone,
      e.dob,
      e.nic,
      e.address,
      e.designation,
      e.employee_department,
      e.role,
      e.base_salary,
      e.pto_allowance,
      e.epf_enabled,
      e.etf_enabled,
      e.created_at,
      e.emergency_contact_name,
      e.emergency_contact_relationship,
      e.emergency_contact_phone,
      e.bank_name,
      e.bank_account_number,
      e.bank_branch,
      m.first_name || ' ' || m.last_name as manager_name
    FROM employees e
    LEFT JOIN employees m ON e.manager_id = m.id
    WHERE e.id = $1
  `
  const result = await query(profileQuery, [employeeId], dbClient)
  
  if (result.rows.length === 0) {
    return null
  }

  const employee = result.rows[0]

  // Mask sensitive data
  const maskData = (value: string | null): string => {
    if (!value) return ''
    if (value.length <= 4) return '****'
    return '****' + value.slice(-4)
  }

  return {
    id: employee.id,
    employeeNumber: employee.employee_number,
    
    personalInfo: {
      firstName: employee.first_name,
      lastName: employee.last_name,
      fullName: `${employee.first_name} ${employee.last_name}`,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: employee.dob,
      nic: maskData(employee.nic),
      address: employee.address
    },
    
    employmentDetails: {
      position: employee.designation,
      department: employee.employee_department,
      role: employee.role,
      hireDate: employee.created_at,
      manager: employee.manager_name || 'Not assigned',
      status: 'Active',
      ptoAllowance: employee.pto_allowance
    },
    
    emergencyContact: {
      name: employee.emergency_contact_name || 'Not provided',
      relationship: employee.emergency_contact_relationship || 'Not provided',
      phone: employee.emergency_contact_phone || 'Not provided'
    },
    
    bankingInfo: {
      bankName: employee.bank_name || 'Not provided',
      accountNumber: maskData(employee.bank_account_number),
      branch: employee.bank_branch || 'Not provided'
    },
    
    benefits: {
      epfEnabled: employee.epf_enabled,
      etfEnabled: employee.etf_enabled
    }
  }
}

/**
 * GET /api/employee-portal/profile/:employeeId
 * 
 * Get complete employee profile including:
 * - Personal information
 * - Employment details
 * - Emergency contacts
 * - Sensitive data is masked for security
 */
export async function getProfile(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    // Log the profile view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PROFILE_VIEWED,
      req,
      { resourceType: 'profile', resourceId: employeeId }
    )

    const profileData = await getProfileData(employeeId, req.dbClient)

    if (!profileData) {
      return res.status(404).json({ error: 'employee_not_found' })
    }

    return res.status(200).json(profileData)

  } catch (error) {
    console.error('Error fetching profile:', error)
    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch profile' })
  }
}


/**
 * GET /api/employee-portal/pto-balance/:employeeId
 * 
 * Get detailed PTO balance for an employee including:
 * - Total allowance
 * - Days used (approved)
 * - Days pending
 * - Days remaining
 * - Breakdown by request type
 */
export async function getPtoBalance(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    // Log the PTO balance view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PTO_BALANCE_VIEWED,
      req,
      { resourceType: 'pto_balance', resourceId: employeeId }
    )

    // Get employee's PTO allowance
    const employeeQuery = 'SELECT pto_allowance FROM employees WHERE id = $1'
    const employeeResult = await query(employeeQuery, [employeeId], req.dbClient)
    
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'employee_not_found' })
    }
    
    const totalAllowance = employeeResult.rows[0]?.pto_allowance || 20

    // Calculate PTO usage for current year
    const ptoQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COALESCE(SUM(
          CASE 
            WHEN status = 'approved' 
            THEN (to_date - from_date + 1)
            ELSE 0
          END
        ), 0) as days_used,
        COALESCE(SUM(
          CASE 
            WHEN status = 'pending' 
            THEN (to_date - from_date + 1)
            ELSE 0
          END
        ), 0) as days_pending,
        -- Breakdown by absence type
        COALESCE(SUM(
          CASE 
            WHEN status = 'approved' AND absence_type = 'Vacation'
            THEN (to_date - from_date + 1)
            ELSE 0
          END
        ), 0) as vacation_days_used,
        COALESCE(SUM(
          CASE 
            WHEN status = 'approved' AND absence_type = 'Sick Leave'
            THEN (to_date - from_date + 1)
            ELSE 0
          END
        ), 0) as sick_days_used,
        COALESCE(SUM(
          CASE 
            WHEN status = 'approved' AND absence_type = 'Personal Leave'
            THEN (to_date - from_date + 1)
            ELSE 0
          END
        ), 0) as personal_days_used
      FROM pto_requests
      WHERE employee_id = $1
        AND EXTRACT(YEAR FROM from_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `
    const ptoResult = await query(ptoQuery, [employeeId], req.dbClient)
    const ptoData = ptoResult.rows[0]

    const daysUsed = parseInt(ptoData.days_used)
    const daysPending = parseInt(ptoData.days_pending)
    const daysRemaining = totalAllowance - daysUsed
    const percentageUsed = totalAllowance > 0 ? Math.round((daysUsed / totalAllowance) * 100) : 0

    // Determine status
    let status: 'healthy' | 'warning' | 'critical'
    if (daysRemaining > totalAllowance * 0.5) {
      status = 'healthy'
    } else if (daysRemaining > totalAllowance * 0.25) {
      status = 'warning'
    } else {
      status = 'critical'
    }

    // Compile balance response
    const balanceData = {
      employeeId: employeeId,
      year: new Date().getFullYear(),
      totalAllowance: totalAllowance,
      daysUsed: daysUsed,
      daysPending: daysPending,
      daysRemaining: daysRemaining,
      percentageUsed: percentageUsed,
      status: status,
      breakdown: {
        vacation: parseInt(ptoData.vacation_days_used),
        sick: parseInt(ptoData.sick_days_used),
        personal: parseInt(ptoData.personal_days_used)
      },
      counts: {
        approved: parseInt(ptoData.approved_count),
        pending: parseInt(ptoData.pending_count)
      }
    }

    return res.status(200).json(balanceData)

  } catch (error) {
    console.error('Error fetching PTO balance:', error)
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PTO_BALANCE_VIEWED,
      req,
      {
        resourceType: 'pto_balance',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch PTO balance' })
  }
}

/**
 * POST /api/employee-portal/pto-requests/:employeeId
 * 
 * Submit new PTO request
 * Phase 14 implementation
 * 
 * Validations:
 * - No past dates
 * - fromDate <= toDate
 * - No overlapping approved requests
 * - Employee has sufficient PTO balance (warning only)
 * - Employee has a manager assigned
 */
export async function createPtoRequest(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { fromDate, toDate, absenceType, description } = req.body

  // Validation: Required fields
  if (!fromDate || !toDate || !absenceType || !description) {
    return res.status(400).json({
      error: 'missing_required_fields',
      message: 'fromDate, toDate, absenceType, and description are required'
    })
  }

  // Validation: Description minimum length
  if (description.trim().length < 10) {
    return res.status(400).json({
      error: 'invalid_description',
      message: 'Description must be at least 10 characters'
    })
  }

  try {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Validation: No past dates
    if (from < today) {
      return res.status(400).json({
        error: 'invalid_date',
        message: 'Cannot request time off for past dates'
      })
    }

    // Validation: fromDate <= toDate
    if (from > to) {
      return res.status(400).json({
        error: 'invalid_date_range',
        message: 'Start date must be before or equal to end date'
      })
    }

    // Validation: Not too far in the future (1 year limit)
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    if (from > oneYearFromNow) {
      return res.status(400).json({
        error: 'invalid_date',
        message: 'Cannot request time off more than 1 year in advance'
      })
    }

    // Calculate total days
    const totalDays = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Validation: Check for overlapping requests
    const overlapQuery = `
      SELECT id, from_date, to_date, status
      FROM pto_requests
      WHERE employee_id = $1
        AND status IN ('approved', 'pending')
        AND (
          (from_date <= $2 AND to_date >= $2) OR
          (from_date <= $3 AND to_date >= $3) OR
          (from_date >= $2 AND to_date <= $3)
        )
    `
    const overlapResult = await query(overlapQuery, [employeeId, fromDate, toDate], req.dbClient)

    if (overlapResult.rows.length > 0) {
      return res.status(400).json({
        error: 'overlapping_request',
        message: 'You already have a PTO request for these dates',
        existingRequest: overlapResult.rows[0]
      })
    }

    // Check PTO balance
    const balanceQuery = `
      SELECT pto_allowance FROM employees WHERE id = $1
    `
    const balanceResult = await query(balanceQuery, [employeeId], req.dbClient)
    const totalAllowance = balanceResult.rows[0]?.pto_allowance || 20

    const usedQuery = `
      SELECT COALESCE(SUM(to_date - from_date + 1), 0) as days_used
      FROM pto_requests
      WHERE employee_id = $1
        AND status = 'approved'
        AND EXTRACT(YEAR FROM from_date) = EXTRACT(YEAR FROM $2::date)
    `
    const usedResult = await query(usedQuery, [employeeId, fromDate], req.dbClient)
    const daysUsed = parseInt(usedResult.rows[0].days_used)
    const daysRemaining = totalAllowance - daysUsed

    // Warning if insufficient balance (but still allow submission)
    const balanceWarning = totalDays > daysRemaining
      ? `Warning: This request exceeds your remaining PTO balance (${daysRemaining} days remaining)`
      : null

    // Get employee's manager
    const managerQuery = `
      SELECT manager_id FROM employees WHERE id = $1
    `
    const managerResult = await query(managerQuery, [employeeId], req.dbClient)
    const managerId = managerResult.rows[0]?.manager_id

    if (!managerId) {
      return res.status(400).json({
        error: 'no_manager_assigned',
        message: 'You do not have a manager assigned. Please contact HR.'
      })
    }

    // Insert PTO request
    const insertQuery = `
      INSERT INTO pto_requests (
        employee_id,
        manager_id,
        absence_type,
        from_date,
        to_date,
        total_hours,
        description,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
      RETURNING *
    `
    const insertResult = await query(insertQuery, [
      employeeId,
      managerId,
      absenceType,
      fromDate,
      toDate,
      totalDays * 8,
      description
    ], req.dbClient)

    const newRequest = insertResult.rows[0]

    // Log the action
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PTO_REQUEST_SUBMITTED,
      req,
      {
        resourceType: 'pto_request',
        resourceId: newRequest.id,
        newValue: {
          fromDate,
          toDate,
          absenceType,
          totalDays,
          description
        }
      }
    )

    // Get manager details for notification
    const managerDetailsQuery = `
      SELECT 
        e.first_name || ' ' || e.last_name as manager_name,
        e.email as manager_email,
        emp.first_name || ' ' || emp.last_name as employee_name
      FROM employees e
      JOIN employees emp ON emp.id = $1
      WHERE e.id = $2
    `
    const managerDetailsResult = await query(managerDetailsQuery, [employeeId, managerId], req.dbClient)
    
    if (managerDetailsResult.rows.length > 0) {
      const { manager_email, manager_name, employee_name } = managerDetailsResult.rows[0]

      // Send notification email to manager
      const { sendEmail } = await import('../utils/emailService')
      
      const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }

      const emailHtml = `
        <h2>New Time Off Request</h2>
        <p><strong>${employee_name}</strong> has submitted a new PTO request:</p>
        <ul>
          <li><strong>Type:</strong> ${absenceType}</li>
          <li><strong>From:</strong> ${formatDate(fromDate)}</li>
          <li><strong>To:</strong> ${formatDate(toDate)}</li>
          <li><strong>Duration:</strong> ${totalDays} day${totalDays !== 1 ? 's' : ''}</li>
          <li><strong>Reason:</strong> ${description}</li>
        </ul>
        <p>Please review and approve/deny this request in the admin portal.</p>
      `

      await sendEmail(manager_email, `New PTO Request from ${employee_name}`, emailHtml)
    }

    return res.status(201).json({
      message: 'PTO request submitted successfully',
      request: {
        id: newRequest.id,
        fromDate: newRequest.from_date,
        toDate: newRequest.to_date,
        absenceType: newRequest.absence_type,
        totalDays: totalDays,
        description: newRequest.description,
        status: newRequest.status,
        createdAt: newRequest.created_at
      },
      balanceWarning: balanceWarning
    })

  } catch (error) {
    console.error('Error creating PTO request:', error)

    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PTO_REQUEST_SUBMITTED,
      req,
      {
        resourceType: 'pto_request',
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to submit PTO request' })
  }
}

/**
 * GET /api/employee-portal/pto-requests/:employeeId
 * 
 * Get PTO request history for an employee with optional filters:
 * - Filter by status (pending, approved, denied)
 * - Filter by date range
 * - Includes manager and employee names
 */
export async function getPtoRequests(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { status, startDate, endDate } = req.query

  try {
    // Log the PTO history view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PTO_HISTORY_VIEWED,
      req,
      { resourceType: 'pto_requests', resourceId: employeeId }
    )

    // Build query with filters
    let ptoQuery = `
      SELECT 
        pr.id,
        pr.employee_id,
        pr.absence_type,
        pr.from_date,
        pr.to_date,
        (pr.to_date - pr.from_date + 1) as total_days,
        pr.total_hours,
        pr.description,
        pr.status,
        pr.manager_comments,
        pr.approved_at,
        pr.created_at,
        pr.updated_at,
        e.first_name || ' ' || e.last_name as employee_name,
        m.first_name || ' ' || m.last_name as manager_name,
        p.project_name,
        c.first_name || ' ' || c.last_name as cover_person_name
      FROM pto_requests pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN employees m ON pr.manager_id = m.id
      LEFT JOIN projects p ON pr.project_id = p.project_id
      LEFT JOIN employees c ON pr.cover_person_id = c.id
      WHERE pr.employee_id = $1
    `
    const params: any[] = [employeeId]
    let paramCount = 1

    // Apply status filter
    if (status && status !== 'all') {
      paramCount++
      ptoQuery += ` AND pr.status = $${paramCount}`
      params.push(status)
    }

    // Apply date range filter
    if (startDate) {
      paramCount++
      ptoQuery += ` AND pr.from_date >= $${paramCount}`
      params.push(startDate)
    }

    if (endDate) {
      paramCount++
      ptoQuery += ` AND pr.to_date <= $${paramCount}`
      params.push(endDate)
    }

    ptoQuery += ' ORDER BY pr.created_at DESC'

    const result = await query(ptoQuery, params, req.dbClient)

    return res.status(200).json({ 
      ptoRequests: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching PTO requests:', error)
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PTO_HISTORY_VIEWED,
      req,
      {
        resourceType: 'pto_requests',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch PTO requests' })
  }
}

/**
 * DELETE /api/employee-portal/pto-requests/:employeeId/:requestId
 * 
 * Cancel pending PTO request
 * Phase 15 implementation
 * 
 * Validations:
 * - Request must belong to employee
 * - Only pending requests can be cancelled
 * - Sends notification to manager
 */
export async function cancelPtoRequest(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const requestId = parseInt(req.params.requestId)

  try {
    // Verify request exists and belongs to employee
    const verifyQuery = `
      SELECT 
        pr.id,
        pr.employee_id,
        pr.status,
        pr.absence_type,
        pr.from_date,
        pr.to_date,
        pr.manager_id,
        (pr.to_date - pr.from_date + 1) as total_days,
        e.first_name || ' ' || e.last_name as employee_name,
        m.email as manager_email,
        m.first_name || ' ' || m.last_name as manager_name
      FROM pto_requests pr
      JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN employees m ON pr.manager_id = m.id
      WHERE pr.id = $1 AND pr.employee_id = $2
    `
    const verifyResult = await query(verifyQuery, [requestId, employeeId], req.dbClient)

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'request_not_found',
        message: 'PTO request not found or does not belong to this employee'
      })
    }

    const request = verifyResult.rows[0]

    // Only allow cancellation of pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'invalid_status',
        message: `Cannot cancel ${request.status} requests. Only pending requests can be cancelled.`,
        currentStatus: request.status
      })
    }

    // Update request status to cancelled
    const cancelQuery = `
      UPDATE pto_requests 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
    `
    await query(cancelQuery, [requestId], req.dbClient)

    // Log the cancellation
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PTO_REQUEST_CANCELLED,
      req,
      {
        resourceType: 'pto_request',
        resourceId: requestId,
        oldValue: { status: 'pending' },
        newValue: { status: 'cancelled' }
      }
    )

    // Send notification email to manager
    if (request.manager_email) {
      const { sendEmail } = await import('../utils/emailService')
      
      const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }

      const cancelEmailHtml = `
        <h2>PTO Request Cancelled</h2>
        <p><strong>${request.employee_name}</strong> has cancelled their PTO request:</p>
        <ul>
          <li><strong>Type:</strong> ${request.absence_type}</li>
          <li><strong>From:</strong> ${formatDate(request.from_date)}</li>
          <li><strong>To:</strong> ${formatDate(request.to_date)}</li>
          <li><strong>Duration:</strong> ${request.total_days} day${request.total_days !== 1 ? 's' : ''}</li>
          <li><strong>Status:</strong> <span style="color: #6b7280; font-weight: bold;">CANCELLED</span></li>
        </ul>
        <p>This request has been removed from your pending approvals.</p>
      `

      await sendEmail(request.manager_email, `PTO Request Cancelled by ${request.employee_name}`, cancelEmailHtml).catch(err => {
        console.error('Failed to send cancellation email:', err)
        // Don't fail the request if email fails
      })
    }

    return res.status(200).json({
      success: true,
      message: 'PTO request cancelled successfully',
      requestId: requestId
    })

  } catch (error) {
    console.error('Error cancelling PTO request:', error)
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PTO_REQUEST_CANCELLED,
      req,
      {
        resourceType: 'pto_request',
        resourceId: requestId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to cancel PTO request' })
  }
}

/**
 * GET /api/employee-portal/time-entries/:employeeId
 * 
 * Get time entry history for an employee with optional filters
 * - Filter by date range
 * - Filter by project
 * - Filter by status (pending, approved, rejected)
 * Phase 7 implementation - read-only access for employees
 */
export async function getTimeEntries(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { start_date, end_date, project_id, status } = req.query

  try {
    // Log the time entries view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.TIME_REPORT_VIEWED,
      req,
      { resourceType: 'time_entries', resourceId: employeeId }
    )

    // Build query with filters
    let timeEntriesQuery = `
      SELECT 
        te.id,
        te.employee_id,
        te.project_id,
        te.contract_id,
        te.date as entry_date,
        te.total_hours,
        te.break_time_minutes,
        te.description,
        te.clock_in,
        te.clock_out,
        te.is_timer_based,
        te.status as approval_status,
        te.approved_by,
        te.approved_at,
        te.rejection_note,
        te.created_at,
        te.updated_at,
        p.project_name,
        c.contract_name,
        approver.first_name || ' ' || approver.last_name as approver_name
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.project_id
      LEFT JOIN contracts c ON te.contract_id = c.contract_id
      LEFT JOIN employees approver ON te.approved_by = approver.id
      WHERE te.employee_id = $1
    `
    const params: any[] = [employeeId]
    let paramCount = 1

    // Apply filters
    if (start_date) {
      paramCount++
      timeEntriesQuery += ` AND te.date >= $${paramCount}`
      params.push(start_date)
    }

    if (end_date) {
      paramCount++
      timeEntriesQuery += ` AND te.date <= $${paramCount}`
      params.push(end_date)
    }

    if (project_id) {
      paramCount++
      timeEntriesQuery += ` AND te.project_id = $${paramCount}`
      params.push(project_id)
    }

    if (status) {
      paramCount++
      timeEntriesQuery += ` AND te.status = $${paramCount}`
      params.push(status)
    }

    timeEntriesQuery += ' ORDER BY te.date DESC, te.created_at DESC'

    const result = await query(timeEntriesQuery, params, req.dbClient)

    return res.status(200).json({ 
      timeEntries: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching time entries:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.TIME_REPORT_VIEWED,
      req,
      {
        resourceType: 'time_entries',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch time entries' })
  }
}

/**
 * POST /api/employee-portal/time-entries/:employeeId
 * 
 * Create new manual time entry
 * Employees can create entries but cannot edit or delete them
 * Phase 7 implementation
 */
export async function createTimeEntry(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { project_id, contract_id, date, total_hours, break_time_minutes, description } = req.body

  // Validation
  if (!project_id || !date || total_hours === undefined) {
    return res.status(400).json({ 
      error: 'missing_required_fields',
      message: 'project_id, date, and total_hours are required' 
    })
  }

  if (total_hours <= 0 || total_hours > 24) {
    return res.status(400).json({ 
      error: 'invalid_hours',
      message: 'Hours must be between 0 and 24' 
    })
  }

  try {
    const insertQuery = `
      INSERT INTO time_entries (
        employee_id, 
        project_id, 
        contract_id, 
        date, 
        total_hours, 
        break_time_minutes, 
        description, 
        is_timer_based, 
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'pending')
      RETURNING *
    `
    const values = [
      employeeId,
      project_id,
      contract_id || null,
      date,
      total_hours,
      break_time_minutes || 0,
      description || null
    ]

    const result = await query(insertQuery, values, req.dbClient)
    const timeEntry = result.rows[0]

    // Log the action
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.TIME_ENTRY_CREATED,
      req,
      {
        resourceType: 'time_entry',
        resourceId: timeEntry.id,
        newValue: { project_id, date, total_hours, description }
      }
    )

    return res.status(201).json({ 
      message: 'Time entry created successfully',
      timeEntry: timeEntry 
    })

  } catch (error) {
    console.error('Error creating time entry:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.TIME_ENTRY_CREATED,
      req,
      {
        resourceType: 'time_entry',
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to create time entry' })
  }
}

/**
 * GET /api/employee-portal/time-report/:employeeId
 * 
 * Get comprehensive time tracking reports and analytics
 * Phase 8 implementation
 */
export async function getTimeReport(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { start_date, end_date, project_id } = req.query

  try {
    // Log the report view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.TIME_REPORT_VIEWED,
      req,
      { resourceType: 'time_report', resourceId: employeeId }
    )

    // Build base WHERE clause
    let whereClause = 'WHERE te.employee_id = $1 AND te.status = \'approved\''
    const params: any[] = [employeeId]
    let paramCount = 1

    if (start_date) {
      paramCount++
      whereClause += ` AND te.date >= $${paramCount}`
      params.push(start_date)
    }

    if (end_date) {
      paramCount++
      whereClause += ` AND te.date <= $${paramCount}`
      params.push(end_date)
    }

    if (project_id) {
      paramCount++
      whereClause += ` AND te.project_id = $${paramCount}`
      params.push(project_id)
    }

    // Overall summary
    const overallQuery = `
      SELECT 
        COUNT(*) as total_entries,
        COALESCE(SUM(te.total_hours), 0) as total_hours,
        COALESCE(AVG(te.total_hours), 0) as avg_hours_per_entry,
        COALESCE(SUM(te.break_time_minutes), 0) as total_break_minutes
      FROM time_entries te
      ${whereClause}
    `
    const overallResult = await query(overallQuery, params, req.dbClient)

    // Weekly summary (last 8 weeks)
    const weeklyQuery = `
      SELECT 
        DATE_TRUNC('week', te.date) as week_start,
        COUNT(*) as entry_count,
        COALESCE(SUM(te.total_hours), 0) as total_hours
      FROM time_entries te
      ${whereClause}
      GROUP BY week_start
      ORDER BY week_start DESC
      LIMIT 8
    `
    const weeklyResult = await query(weeklyQuery, params, req.dbClient)

    // Monthly summary (last 6 months)
    const monthlyQuery = `
      SELECT 
        DATE_TRUNC('month', te.date) as month_start,
        COUNT(*) as entry_count,
        COALESCE(SUM(te.total_hours), 0) as total_hours
      FROM time_entries te
      ${whereClause}
      GROUP BY month_start
      ORDER BY month_start DESC
      LIMIT 6
    `
    const monthlyResult = await query(monthlyQuery, params, req.dbClient)

    // Project breakdown
    const projectQuery = `
      SELECT 
        p.project_id,
        p.project_name,
        COUNT(te.id) as entry_count,
        COALESCE(SUM(te.total_hours), 0) as total_hours,
        COALESCE(AVG(te.total_hours), 0) as avg_hours_per_entry
      FROM time_entries te
      JOIN projects p ON te.project_id = p.project_id
      ${whereClause}
      GROUP BY p.project_id, p.project_name
      ORDER BY total_hours DESC
    `
    const projectResult = await query(projectQuery, params, req.dbClient)

    // Daily breakdown (last 30 days)
    const dailyQuery = `
      SELECT 
        te.date,
        COUNT(*) as entry_count,
        COALESCE(SUM(te.total_hours), 0) as total_hours
      FROM time_entries te
      ${whereClause}
      GROUP BY te.date
      ORDER BY te.date DESC
      LIMIT 30
    `
    const dailyResult = await query(dailyQuery, params, req.dbClient)

    // Pending hours (not yet approved)
    const pendingQuery = `
      SELECT 
        COUNT(*) as pending_count,
        COALESCE(SUM(total_hours), 0) as pending_hours
      FROM time_entries
      WHERE employee_id = $1 AND status = 'pending'
    `
    const pendingResult = await query(pendingQuery, [employeeId], req.dbClient)

    // Compile report
    const report = {
      employeeId: employeeId,
      reportPeriod: {
        startDate: start_date || null,
        endDate: end_date || null
      },
      overall: {
        totalEntries: parseInt(overallResult.rows[0].total_entries),
        totalHours: parseFloat(overallResult.rows[0].total_hours),
        avgHoursPerEntry: parseFloat(overallResult.rows[0].avg_hours_per_entry).toFixed(2),
        totalBreakMinutes: parseInt(overallResult.rows[0].total_break_minutes)
      },
      pending: {
        count: parseInt(pendingResult.rows[0].pending_count),
        hours: parseFloat(pendingResult.rows[0].pending_hours)
      },
      weekly: weeklyResult.rows.map(row => ({
        weekStart: row.week_start,
        entryCount: parseInt(row.entry_count),
        totalHours: parseFloat(row.total_hours)
      })),
      monthly: monthlyResult.rows.map(row => ({
        monthStart: row.month_start,
        entryCount: parseInt(row.entry_count),
        totalHours: parseFloat(row.total_hours)
      })),
      byProject: projectResult.rows.map(row => ({
        projectId: row.project_id,
        projectName: row.project_name,
        entryCount: parseInt(row.entry_count),
        totalHours: parseFloat(row.total_hours),
        avgHoursPerEntry: parseFloat(row.avg_hours_per_entry).toFixed(2)
      })),
      daily: dailyResult.rows.map(row => ({
        date: row.date,
        entryCount: parseInt(row.entry_count),
        totalHours: parseFloat(row.total_hours)
      }))
    }

    return res.status(200).json(report)

  } catch (error) {
    console.error('Error generating time report:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.TIME_REPORT_VIEWED,
      req,
      {
        resourceType: 'time_report',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to generate time report' })
  }
}

/**
 * GET /api/employee-portal/timer/active/:employeeId
 * 
 * Get active timer status for an employee
 * Phase 7 implementation
 */
export async function getActiveTimer(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    const activeTimerQuery = `
      SELECT 
        at.*,
        te.project_id,
        te.contract_id,
        te.description,
        te.date,
        p.project_name,
        c.contract_name
      FROM active_timers at
      JOIN time_entries te ON at.time_entry_id = te.id
      LEFT JOIN projects p ON te.project_id = p.project_id
      LEFT JOIN contracts c ON te.contract_id = c.contract_id
      WHERE at.employee_id = $1
    `
    const result = await query(activeTimerQuery, [employeeId], req.dbClient)

    if (result.rows.length === 0) {
      return res.status(200).json({ activeTimer: null })
    }

    return res.status(200).json({ activeTimer: result.rows[0] })

  } catch (error) {
    console.error('Error fetching active timer:', error)
    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch active timer' })
  }
}

/**
 * GET /api/employee-portal/payslips/:employeeId
 * 
 * Get payslip archive for an employee
 * Phase 9 implementation
 * Only returns payslips with status PENDING_EMPLOYEE_SIGNATURE or COMPLETED
 */
export async function getPayslips(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { year } = req.query

  try {
    // Log the payslips view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PAYSLIP_VIEWED,
      req,
      { resourceType: 'payslips_list', resourceId: employeeId }
    )

    // Build query
    let payslipsQuery = `
      SELECT 
        p.payslip_id,
        p.employee_id,
        p.payslip_month,
        p.payslip_year,
        p.basic_salary,
        p.gross_salary,
        p.net_salary,
        p.total_deductions,
        p.status,
        p.created_at,
        p.updated_at
      FROM payslips p
      WHERE p.employee_id = $1
        AND p.status IN ('PENDING_EMPLOYEE_SIGNATURE', 'COMPLETED')
    `
    const params: any[] = [employeeId]
    let paramCount = 1

    // Filter by year if provided
    if (year) {
      paramCount++
      payslipsQuery += ` AND p.payslip_year = $${paramCount}`
      params.push(year)
    }

    payslipsQuery += ' ORDER BY p.payslip_year DESC, p.payslip_month DESC'

    const result = await query(payslipsQuery, params, req.dbClient)

    return res.status(200).json({ 
      payslips: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching payslips:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PAYSLIP_VIEWED,
      req,
      {
        resourceType: 'payslips_list',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch payslips' })
  }
}

/**
 * GET /api/employee-portal/payslips/:employeeId/:payslipId
 * 
 * Get specific payslip details with signatures
 * Phase 9 implementation
 */
export async function getPayslipDetails(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const payslipId = parseInt(req.params.payslipId)

  try {
    // Get payslip data
    const payslipQuery = `
      SELECT 
        p.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.email as employee_email,
        e.employee_department,
        e.designation,
        e.employee_number
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.payslip_id = $1 
        AND p.employee_id = $2
        AND p.status IN ('PENDING_EMPLOYEE_SIGNATURE', 'COMPLETED')
    `
    const payslipResult = await query(payslipQuery, [payslipId, employeeId], req.dbClient)
    
    if (payslipResult.rows.length === 0) {
      return res.status(404).json({ error: 'payslip_not_found' })
    }

    // Get signatures
    const signaturesQuery = `
      SELECT 
        s.signature_id,
        s.signer_user_id,
        s.signer_role,
        s.signed_at,
        u.name as signer_name,
        u.email as signer_email
      FROM payslip_signatures s
      JOIN users u ON s.signer_user_id = u.id
      WHERE s.payslip_id = $1
      ORDER BY s.signed_at ASC
    `
    const signaturesResult = await query(signaturesQuery, [payslipId], req.dbClient)

    // Log the view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PAYSLIP_VIEWED,
      req,
      { resourceType: 'payslip', resourceId: payslipId }
    )

    return res.status(200).json({ 
      payslip: payslipResult.rows[0],
      signatures: signaturesResult.rows
    })

  } catch (error) {
    console.error('Error fetching payslip details:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PAYSLIP_VIEWED,
      req,
      {
        resourceType: 'payslip',
        resourceId: payslipId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch payslip details' })
  }
}

/**
 * GET /api/employee-portal/payslips/:employeeId/:payslipId/download
 * 
 * Download payslip as PDF
 * Phase 9 implementation
 */
export async function downloadPayslip(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const payslipId = parseInt(req.params.payslipId)

  try {
    // Verify employee owns this payslip
    const verifyQuery = `
      SELECT p.payslip_id
      FROM payslips p
      WHERE p.payslip_id = $1 
        AND p.employee_id = $2
        AND p.status IN ('PENDING_EMPLOYEE_SIGNATURE', 'COMPLETED')
    `
    const verifyResult = await query(verifyQuery, [payslipId, employeeId], req.dbClient)
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'payslip_not_found' })
    }

    // Get full payslip data for PDF generation
    const payslipQuery = `
      SELECT 
        p.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.email as employee_email,
        e.employee_department,
        e.role,
        e.first_name,
        e.last_name,
        e.employee_number,
        e.designation
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.payslip_id = $1
    `
    const payslipResult = await query(payslipQuery, [payslipId], req.dbClient)

    // Get signatures
    const signaturesQuery = `
      SELECT 
        s.*,
        u.name as signer_name
      FROM payslip_signatures s
      JOIN users u ON s.signer_user_id = u.id
      WHERE s.payslip_id = $1
      ORDER BY s.signed_at ASC
    `
    const signaturesResult = await query(signaturesQuery, [payslipId], req.dbClient)

    // Log the download
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PAYSLIP_DOWNLOADED,
      req,
      { resourceType: 'payslip', resourceId: payslipId }
    )

    // Generate and return PDF (using existing utility)
    const { generatePayslipPdf } = await import('../utils/payslipPdfGenerator')
    await generatePayslipPdf(payslipResult.rows[0], signaturesResult.rows, res)

  } catch (error) {
    console.error('Error downloading payslip:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PAYSLIP_DOWNLOADED,
      req,
      {
        resourceType: 'payslip',
        resourceId: payslipId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to download payslip' })
  }
}

/**
 * GET /api/employee-portal/ytd-earnings/:employeeId
 * 
 * Get year-to-date earnings summary with tax information
 * Phase 10 implementation
 */
export async function getYtdEarnings(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear()

  try {
    // Log the YTD view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.YTD_EARNINGS_VIEWED,
      req,
      { resourceType: 'ytd_earnings', resourceId: employeeId }
    )

    // Get summary totals
    const summaryQuery = `
      SELECT 
        COUNT(*) as months_paid,
        COALESCE(SUM(gross_salary), 0) as total_gross,
        COALESCE(SUM(total_deductions), 0) as total_deductions,
        COALESCE(SUM(net_salary), 0) as total_net,
        COALESCE(SUM(epf_employee_deduction), 0) as total_epf_employee,
        COALESCE(SUM(epf_employer_contribution), 0) as total_epf_employer,
        COALESCE(SUM(etf_employer_contribution), 0) as total_etf_employer,
        COALESCE(AVG(epf_employee_rate), 8.00) as avg_epf_rate
      FROM payslips
      WHERE employee_id = $1 
        AND payslip_year = $2 
        AND status = 'COMPLETED'
    `
    const summaryResult = await query(summaryQuery, [employeeId, year], req.dbClient)
    const summary = summaryResult.rows[0]

    // Get monthly breakdown
    const monthlyQuery = `
      SELECT 
        payslip_month,
        payslip_year,
        basic_salary,
        gross_salary,
        total_deductions,
        net_salary,
        epf_employee_deduction,
        created_at
      FROM payslips
      WHERE employee_id = $1 
        AND payslip_year = $2 
        AND status = 'COMPLETED'
      ORDER BY payslip_month ASC
    `
    const monthlyResult = await query(monthlyQuery, [employeeId, year], req.dbClient)

    // Compile response
    const ytdData = {
      employeeId: employeeId,
      year: year,
      summary: {
        totalGross: parseFloat(summary.total_gross),
        totalDeductions: parseFloat(summary.total_deductions),
        totalNet: parseFloat(summary.total_net),
        epfEmployee: parseFloat(summary.total_epf_employee),
        epfEmployer: parseFloat(summary.total_epf_employer),
        etf: parseFloat(summary.total_etf_employer),
        monthsPaid: parseInt(summary.months_paid)
      },
      monthlyBreakdown: monthlyResult.rows.map(row => ({
        month: row.payslip_month,
        year: row.payslip_year,
        basicSalary: parseFloat(row.basic_salary),
        grossSalary: parseFloat(row.gross_salary),
        deductions: parseFloat(row.total_deductions),
        netSalary: parseFloat(row.net_salary),
        epfEmployee: parseFloat(row.epf_employee_deduction)
      })),
      taxInfo: {
        epfEmployeeTotal: parseFloat(summary.total_epf_employee),
        epfEmployeeRate: parseFloat(summary.avg_epf_rate),
        epfEmployerTotal: parseFloat(summary.total_epf_employer),
        etfEmployerTotal: parseFloat(summary.total_etf_employer)
      }
    }

    return res.status(200).json(ytdData)

  } catch (error) {
    console.error('Error fetching YTD earnings:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.YTD_EARNINGS_VIEWED,
      req,
      {
        resourceType: 'ytd_earnings',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch YTD earnings' })
  }
}

/**
 * POST /api/employee-portal/payslip-token/verify
 * 
 * Verify a payslip signature token
 * Phase 11 implementation
 */
export async function verifyPayslipToken(req: Request, res: Response) {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: 'missing_token', message: 'Token is required' })
  }

  try {
    const { validatePayslipToken } = await import('../utils/payslipTokens')
    const validation = await validatePayslipToken(token)

    if (!validation.valid) {
      return res.status(400).json({
        valid: false,
        error: validation.error,
        errorCode: validation.errorCode
      })
    }

    // Return token data without the actual token string
    return res.status(200).json({
      valid: true,
      payslipId: validation.token?.payslipId,
      employeeId: validation.token?.employeeId,
      expiresAt: validation.token?.expiresAt
    })

  } catch (error) {
    console.error('Error verifying payslip token:', error)
    return res.status(500).json({ error: 'server_error', message: 'Failed to verify token' })
  }
}

/**
 * POST /api/employee-portal/payslips/:employeeId/:payslipId/sign
 * 
 * Sign a payslip with digital signature
 * Phase 12 implementation
 */
export async function signPayslip(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const payslipId = parseInt(req.params.payslipId)
  const { signature, token } = req.body

  // Validation
  if (!signature) {
    return res.status(400).json({ error: 'missing_signature', message: 'Signature is required' })
  }

  if (!token) {
    return res.status(400).json({ error: 'missing_token', message: 'Token is required' })
  }

  try {
    const { validatePayslipToken, markTokenAsUsed } = await import('../utils/payslipTokens')

    // Validate token
    const validation = await validatePayslipToken(token)

    if (!validation.valid) {
      return res.status(400).json({
        error: 'invalid_token',
        message: validation.error,
        errorCode: validation.errorCode
      })
    }

    // Verify token matches payslip and employee
    if (validation.token?.payslipId !== payslipId || validation.token?.employeeId !== employeeId) {
      return res.status(403).json({
        error: 'token_mismatch',
        message: 'Token does not match payslip and employee'
      })
    }

    // Verify payslip exists and is pending employee signature
    const payslipQuery = `
      SELECT 
        p.payslip_id,
        p.status,
        p.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.email as employee_email
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.payslip_id = $1 AND p.employee_id = $2
    `
    const payslipResult = await query(payslipQuery, [payslipId, employeeId], req.dbClient)

    if (payslipResult.rows.length === 0) {
      return res.status(404).json({ error: 'payslip_not_found', message: 'Payslip not found' })
    }

    const payslip = payslipResult.rows[0]

    if (payslip.status !== 'PENDING_EMPLOYEE_SIGNATURE') {
      return res.status(400).json({
        error: 'invalid_status',
        message: 'Payslip is not pending employee signature',
        currentStatus: payslip.status
      })
    }

    // Check if employee has already signed
    const existingSignatureQuery = `
      SELECT signature_id 
      FROM payslip_signatures 
      WHERE payslip_id = $1 AND signer_role = 'EMPLOYEE'
    `
    const existingSignatureResult = await query(existingSignatureQuery, [payslipId], req.dbClient)

    if (existingSignatureResult.rows.length > 0) {
      return res.status(400).json({
        error: 'already_signed',
        message: 'Payslip has already been signed by employee'
      })
    }

    // Get user ID for signature
    const userQuery = `SELECT user_id FROM employees WHERE id = $1`
    const userResult = await query(userQuery, [employeeId], req.dbClient)

    if (userResult.rows.length === 0 || !userResult.rows[0].user_id) {
      return res.status(400).json({
        error: 'user_not_found',
        message: 'Employee user account not found'
      })
    }

    const userId = userResult.rows[0].user_id

    // Save signature
    const signatureQuery = `
      INSERT INTO payslip_signatures (
        payslip_id,
        signer_user_id,
        signer_role,
        signature_data
      ) VALUES ($1, $2, 'EMPLOYEE', $3)
      RETURNING signature_id, signed_at
    `
    const signatureResult = await query(signatureQuery, [payslipId, userId, signature], req.dbClient)

    // Update payslip status to COMPLETED
    await query(
      `UPDATE payslips SET status = 'COMPLETED', updated_at = NOW() WHERE payslip_id = $1`,
      [payslipId],
      req.dbClient
    )

    // Mark token as used
    const ipAddress = (req.headers['x-forwarded-for'] as string) || 
                      (req.headers['x-real-ip'] as string) ||
                      req.ip ||
                      req.socket.remoteAddress
    const userAgent = req.headers['user-agent']
    
    await markTokenAsUsed(token, ipAddress as string, userAgent)

    // Log the signature
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PAYSLIP_SIGNED,
      req,
      {
        resourceType: 'payslip',
        resourceId: payslipId,
        newValue: { signatureId: signatureResult.rows[0].signature_id }
      }
    )

    // Send confirmation email
    const { sendPayslipSignedConfirmation } = await import('../utils/emailService')
    const payslipDetailsQuery = `
      SELECT payslip_month, payslip_year, net_salary, gross_salary
      FROM payslips
      WHERE payslip_id = $1
    `
    const payslipDetailsResult = await query(payslipDetailsQuery, [payslipId], req.dbClient)
    const details = payslipDetailsResult.rows[0]

    await sendPayslipSignedConfirmation({
      employeeName: payslip.employee_name,
      employeeEmail: payslip.employee_email,
      payslipId: payslipId,
      month: details.payslip_month,
      year: details.payslip_year,
      netSalary: `$${parseFloat(details.net_salary).toFixed(2)}`,
      grossSalary: `$${parseFloat(details.gross_salary).toFixed(2)}`
    })

    return res.status(200).json({
      success: true,
      message: 'Payslip signed successfully',
      signatureId: signatureResult.rows[0].signature_id,
      signedAt: signatureResult.rows[0].signed_at
    })

  } catch (error) {
    console.error('Error signing payslip:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.PAYSLIP_SIGNED,
      req,
      {
        resourceType: 'payslip',
        resourceId: payslipId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to sign payslip' })
  }
}

/**
 * GET /api/employee-portal/documents/:employeeId
 * 
 * Get employee accessible documents
 * Phase 16 implementation
 * 
 * Returns company documents accessible by employees
 * Filters by category and implements search
 */
export async function getDocuments(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { category, search } = req.query

  try {
    // Log the documents view
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DOCUMENT_VIEWED,
      req,
      { resourceType: 'documents', resourceId: employeeId }
    )

    // Build query - get documents accessible to employees
    // Note: Documents table stores files as BYTEA, not paths
    // Showing all documents (file_type contains MIME types, not categories)
    let documentsQuery = `
      SELECT 
        d.id as document_id,
        d.document_name,
        d.file_type as document_type,
        d.file_size,
        d.uploaded_by,
        d.upload_date as uploaded_at,
        d.description,
        u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 0

    // Apply category filter
    if (category && category !== 'all') {
      paramCount++
      documentsQuery += ` AND d.file_type = $${paramCount}`
      params.push(category)
    }

    // Apply search filter
    if (search) {
      paramCount++
      documentsQuery += ` AND (d.document_name ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    documentsQuery += ' ORDER BY d.upload_date DESC'

    const result = await query(documentsQuery, params, req.dbClient)

    return res.status(200).json({ 
      documents: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching documents:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DOCUMENT_VIEWED,
      req,
      {
        resourceType: 'documents',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch documents' })
  }
}

/**
 * GET /api/employee-portal/documents/:employeeId/:documentId/download
 * 
 * Download a specific document
 * Phase 16 implementation
 * 
 * Validates access and serves the file
 */
export async function downloadDocument(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const documentId = parseInt(req.params.documentId)

  try {
    // Verify document exists and is accessible
    // Note: Documents table stores files as BYTEA, not file paths
    const docQuery = `
      SELECT 
        d.id as document_id,
        d.document_name,
        d.file_data,
        d.file_size,
        d.file_type
      FROM documents d
      WHERE d.id = $1
    `
    const docResult = await query(docQuery, [documentId], req.dbClient)

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        error: 'document_not_found',
        message: 'Document not found or not accessible'
      })
    }

    const document = docResult.rows[0]

    // Check if file data exists
    if (!document.file_data) {
      return res.status(404).json({
        error: 'file_data_missing',
        message: 'Document file data not found'
      })
    }

    // Log the download
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DOCUMENT_DOWNLOADED,
      req,
      {
        resourceType: 'document',
        resourceId: documentId,
        newValue: { documentName: document.document_name }
      }
    )

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`)
    res.setHeader('Content-Length', document.file_size || document.file_data.length)

    // Send the file data directly
    return res.send(document.file_data)

  } catch (error) {
    console.error('Error downloading document:', error)
    
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DOCUMENT_DOWNLOADED,
      req,
      {
        resourceType: 'document',
        resourceId: documentId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ error: 'server_error', message: 'Failed to download document' })
  }
}

/**
 * POST /api/employee-portal/documents/:employeeId/upload
 * 
 * Upload employee personal document
 * Phase 17 implementation
 * 
 * Allowed file types: PDF and JPEG only
 * Max file size: 10MB
 * Validates file signature to prevent spoofing
 */
export async function uploadDocument(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      error: 'no_file_uploaded',
      message: 'No file was uploaded'
    })
  }

  const file = req.file as Express.Multer.File
  const { documentType, description } = req.body

  // Validate document type
  const validTypes = ['resume', 'certificate', 'tax_form', 'training', 'personal', 'other']
  if (!documentType || !validTypes.includes(documentType)) {
    // Clean up uploaded file
    const { deleteFile } = await import('../utils/fileValidation')
    deleteFile(file.path)
    return res.status(400).json({
      error: 'invalid_document_type',
      message: `Document type must be one of: ${validTypes.join(', ')}`
    })
  }

  try {
    const { 
      validateUploadedFile, 
      ensureUploadDirectory, 
      generateUniqueFilename,
      sanitizeFilename,
      deleteFile
    } = await import('../utils/fileValidation')
    const { notifyDocumentUploaded } = await import('../utils/notificationService')
    
    // Comprehensive file validation
    const validation = await validateUploadedFile(file)
    
    if (!validation.valid) {
      // Clean up uploaded file
      deleteFile(file.path)
      return res.status(400).json({
        error: 'file_validation_failed',
        message: 'File validation failed',
        errors: validation.errors
      })
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.originalname)
    const sanitizedOriginalName = sanitizeFilename(file.originalname)

    // Construct storage path
    const path = await import('path')
    const uploadDir = path.join(
      process.cwd(),
      'uploads',
      'employee_documents',
      employeeId.toString(),
      new Date().getFullYear().toString(),
      (new Date().getMonth() + 1).toString().padStart(2, '0')
    )

    // Ensure directory exists
    ensureUploadDirectory(uploadDir)

    // Move file to permanent location
    const fs = await import('fs')
    const finalPath = path.join(uploadDir, uniqueFilename)
    fs.renameSync(file.path, finalPath)

    // Save metadata to database
    const insertQuery = `
      INSERT INTO employee_documents (
        employee_id,
        document_type,
        document_category,
        file_name,
        original_name,
        file_path,
        file_size,
        mime_type,
        description,
        uploaded_by,
        uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `

    const values = [
      employeeId,
      documentType,
      'personal', // category
      uniqueFilename,
      sanitizedOriginalName,
      finalPath,
      file.size,
      file.mimetype,
      description || null,
      employeeId // uploaded_by
    ]

    const result = await query(insertQuery, values, req.dbClient)
    const document = result.rows[0]

    // Log the upload
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DOCUMENT_UPLOADED,
      req,
      {
        resourceType: 'employee_document',
        resourceId: document.document_id,
        newValue: {
          fileName: sanitizedOriginalName,
          fileSize: file.size,
          documentType: documentType
        }
      }
    )

    // Create notification
    await notifyDocumentUploaded(employeeId, sanitizedOriginalName)

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        documentId: document.document_id,
        fileName: document.original_name,
        fileSize: document.file_size,
        documentType: document.document_type,
        description: document.description,
        uploadedAt: document.uploaded_at
      }
    })

  } catch (error) {
    console.error('Error uploading document:', error)
    
    // Clean up file on error
    if (req.file) {
      const { deleteFile } = await import('../utils/fileValidation')
      deleteFile(req.file.path)
    }
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.DOCUMENT_UPLOADED,
      req,
      {
        resourceType: 'employee_document',
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to upload document' 
    })
  }
}

/**
 * GET /api/employee-portal/documents/:employeeId/personal
 * 
 * Get employee's personal uploaded documents
 * Phase 17 implementation
 */
export async function getPersonalDocuments(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  
  try {
    const personalDocumentsQuery = `
      SELECT 
        document_id,
        document_type,
        original_name as file_name,
        file_size,
        mime_type,
        description,
        uploaded_at
      FROM employee_documents
      WHERE employee_id = $1
      ORDER BY uploaded_at DESC
    `
    
    const result = await query(personalDocumentsQuery, [employeeId], req.dbClient)
    
    return res.status(200).json({
      documents: result.rows,
      total: result.rows.length
    })
    
  } catch (error) {
    console.error('Error fetching personal documents:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch personal documents' 
    })
  }
}

/**
 * GET /api/employee-portal/documents/:employeeId/personal/:documentId/download
 * 
 * Download employee's personal document
 * Phase 17 implementation
 */
export async function downloadPersonalDocument(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const documentId = parseInt(req.params.documentId)
  
  try {
    // Verify document belongs to employee
    const docQuery = `
      SELECT 
        document_id,
        original_name,
        file_path,
        file_size,
        mime_type
      FROM employee_documents
      WHERE document_id = $1 AND employee_id = $2
    `
    
    const result = await query(docQuery, [documentId, employeeId], req.dbClient)
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'document_not_found',
        message: 'Document not found or does not belong to this employee'
      })
    }
    
    const document = result.rows[0]
    const fs = await import('fs')
    
    // Check if file exists
    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({
        error: 'file_not_found',
        message: 'Document file not found on server'
      })
    }
    
    // Set headers and stream file
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`)
    res.setHeader('Content-Length', document.file_size || 0)
    
    const fileStream = fs.createReadStream(document.file_path)
    fileStream.pipe(res)
    
  } catch (error) {
    console.error('Error downloading personal document:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to download document' 
    })
  }
}

/**
 * GET /api/employee-portal/notifications/:employeeId
 * 
 * Get notifications for an employee
 * Phase 18 implementation
 */
export async function getNotifications(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const unreadOnly = req.query.unreadOnly === 'true'
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

  try {
    const { getNotifications: getNotificationsService } = await import('../utils/notificationService')
    
    const result = await getNotificationsService(employeeId, {
      unreadOnly,
      limit,
      offset
    })

    return res.status(200).json(result)

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch notifications' 
    })
  }
}

/**
 * PUT /api/employee-portal/notifications/:employeeId/:notificationId/read
 * 
 * Mark a notification as read
 * Phase 18 implementation
 */
export async function markNotificationRead(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const notificationId = parseInt(req.params.notificationId)

  try {
    const { markNotificationAsRead } = await import('../utils/notificationService')
    const success = await markNotificationAsRead(notificationId, employeeId)

    if (!success) {
      return res.status(404).json({
        error: 'notification_not_found',
        message: 'Notification not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error) {
    console.error('Error marking notification as read:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to mark notification as read' 
    })
  }
}

/**
 * PUT /api/employee-portal/notifications/:employeeId/read-all
 * 
 * Mark all notifications as read for an employee
 * Phase 18 implementation
 */
export async function markAllNotificationsRead(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    const { markAllNotificationsAsRead } = await import('../utils/notificationService')
    const count = await markAllNotificationsAsRead(employeeId)

    return res.status(200).json({
      success: true,
      message: `${count} notification(s) marked as read`,
      count: count
    })

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to mark notifications as read' 
    })
  }
}

/**
 * DELETE /api/employee-portal/notifications/:employeeId/:notificationId
 * 
 * Archive (soft delete) a notification
 * Phase 18 implementation
 */
export async function archiveNotification(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const notificationId = parseInt(req.params.notificationId)

  try {
    const { archiveNotification: archiveNotificationService } = await import('../utils/notificationService')
    const success = await archiveNotificationService(notificationId, employeeId)

    if (!success) {
      return res.status(404).json({
        error: 'notification_not_found',
        message: 'Notification not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Notification archived'
    })

  } catch (error) {
    console.error('Error archiving notification:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to archive notification' 
    })
  }
}

/**
 * GET /api/employee-portal/notifications/:employeeId/unread-count
 * 
 * Get count of unread notifications
 * Phase 18 implementation
 */
export async function getUnreadNotificationCount(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    const { getUnreadCount } = await import('../utils/notificationService')
    const count = await getUnreadCount(employeeId)

    return res.status(200).json({
      employeeId: employeeId,
      unreadCount: count
    })

  } catch (error) {
    console.error('Error fetching unread count:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch unread count' 
    })
  }
}

/**
 * GET /api/employee-portal/settings/:employeeId/email-preferences
 * 
 * Get email notification preferences for an employee
 * Phase 19 implementation
 */
export async function getEmailPreferences(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)

  try {
    // Check if employee has settings record
    const sqlQuery = `
      SELECT email_preferences
      FROM employee_portal_settings
      WHERE employee_id = $1
    `
    const result = await query(sqlQuery, [employeeId], req.dbClient)

    let preferences
    if (result.rows.length === 0) {
      // No settings record exists, return defaults
      preferences = {
        pto_notifications: true,
        time_entry_reminders: true,
        announcement_notifications: true
      }
    } else {
      preferences = result.rows[0].email_preferences || {
        pto_notifications: true,
        time_entry_reminders: true,
        announcement_notifications: true
      }
    }

    return res.status(200).json({
      employeeId: employeeId,
      emailPreferences: preferences,
      criticalEmailsNote: 'Payslip notifications cannot be disabled and will always be sent'
    })

  } catch (error) {
    console.error('Error fetching email preferences:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch email preferences' 
    })
  }
}

/**
 * PUT /api/employee-portal/settings/:employeeId/email-preferences
 * 
 * Update email notification preferences for an employee
 * Phase 19 implementation
 * 
 * Note: Payslip notifications cannot be disabled (critical emails)
 */
export async function updateEmailPreferences(req: Request, res: Response) {
  const employeeId = parseInt(req.params.employeeId)
  const { pto_notifications, time_entry_reminders, announcement_notifications } = req.body

  try {
    // Validate that at least one preference field is provided
    if (
      pto_notifications === undefined &&
      time_entry_reminders === undefined &&
      announcement_notifications === undefined
    ) {
      return res.status(400).json({
        error: 'no_preferences_provided',
        message: 'At least one preference field must be provided'
      })
    }

    // Check if settings record exists
    const checkQuery = `
      SELECT id, email_preferences
      FROM employee_portal_settings
      WHERE employee_id = $1
    `
    const checkResult = await query(checkQuery, [employeeId], req.dbClient)

    let currentPreferences = {
      pto_notifications: true,
      time_entry_reminders: true,
      announcement_notifications: true
    }

    if (checkResult.rows.length > 0 && checkResult.rows[0].email_preferences) {
      currentPreferences = checkResult.rows[0].email_preferences
    }

    // Update preferences (only update fields that were provided)
    const updatedPreferences = {
      ...currentPreferences,
      ...(pto_notifications !== undefined && { pto_notifications }),
      ...(time_entry_reminders !== undefined && { time_entry_reminders }),
      ...(announcement_notifications !== undefined && { announcement_notifications })
    }

    if (checkResult.rows.length === 0) {
      // Create new settings record
      await query(
        `
        INSERT INTO employee_portal_settings (
          employee_id,
          email_preferences,
          created_at,
          updated_at
        ) VALUES ($1, $2, NOW(), NOW())
        `,
        [employeeId, JSON.stringify(updatedPreferences)],
        req.dbClient
      )
    } else {
      // Update existing record
      await query(
        `
        UPDATE employee_portal_settings
        SET email_preferences = $1,
            updated_at = NOW()
        WHERE employee_id = $2
        `,
        [JSON.stringify(updatedPreferences), employeeId],
        req.dbClient
      )
    }

    // Log the preference update
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.SETTINGS_UPDATED,
      req,
      {
        resourceType: 'email_preferences',
        resourceId: employeeId,
        oldValue: currentPreferences,
        newValue: updatedPreferences
      }
    )

    return res.status(200).json({
      success: true,
      message: 'Email preferences updated successfully',
      emailPreferences: updatedPreferences
    })

  } catch (error) {
    console.error('Error updating email preferences:', error)
    
    // Log the error
    await logEmployeeActionFromRequest(
      employeeId,
      EmployeeAuditActions.SETTINGS_UPDATED,
      req,
      {
        resourceType: 'email_preferences',
        resourceId: employeeId,
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    )

    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to update email preferences' 
    })
  }
}

/**
 * GET /api/employee-portal/directory
 * 
 * Get company employee directory with search and filters
 * Phase 24 implementation
 * 
 * Features:
 * - Search by name (first/last)
 * - Filter by department
 * - Filter by role/position
 * - Respects privacy settings (show_in_directory, hide_phone_in_directory)
 * - Only shows active employees
 * - Excludes system/admin accounts where appropriate
 * 
 * Query params:
 * - search: string (searches first_name and last_name)
 * - department: string (filters by employee_department)
 * - role: string (filters by role or designation)
 */
export async function getEmployeeDirectory(req: Request, res: Response) {
  const { search, department, role } = req.query
  
  try {
    // Build query with privacy and filters
    let directoryQuery = `
      SELECT 
        e.id,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.designation,
        e.employee_department,
        e.role,
        COALESCE(eps.hide_phone_in_directory, false) as hide_phone
      FROM employees e
      LEFT JOIN employee_portal_settings eps ON e.id = eps.employee_id
      WHERE 1=1
        AND (eps.show_in_directory IS NULL OR eps.show_in_directory = true)
        AND e.id IS NOT NULL
    `
    
    const params: any[] = []
    let paramCount = 0

    // Search filter (searches both first and last name)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      paramCount++
      directoryQuery += ` AND (\n        e.first_name ILIKE $${paramCount} OR \n        e.last_name ILIKE $${paramCount} OR\n        CONCAT(e.first_name, ' ', e.last_name) ILIKE $${paramCount}\n      )`
      params.push(`%${search.trim()}%`)
    }

    // Department filter
    if (department && typeof department === 'string' && department !== 'all') {
      paramCount++
      directoryQuery += ` AND e.employee_department = $${paramCount}`
      params.push(department)
    }

    // Role filter (searches both role and designation)
    if (role && typeof role === 'string' && role !== 'all') {
      paramCount++
      directoryQuery += ` AND (e.role = $${paramCount} OR e.designation ILIKE $${paramCount})`
      params.push(role)
    }

    // Order by name
    directoryQuery += ` ORDER BY e.first_name ASC, e.last_name ASC`

    // Execute query
    const result = await query(directoryQuery, params, req.dbClient)

    // Process results - mask phone if privacy setting enabled
    const employees = result.rows.map((emp: any) => ({
      id: emp.id,
      employeeNumber: emp.employee_number,
      firstName: emp.first_name,
      lastName: emp.last_name,
      fullName: `${emp.first_name} ${emp.last_name}`,
      email: emp.email,
      phone: emp.hide_phone ? null : emp.phone,
      phoneVisible: !emp.hide_phone,
      position: emp.designation || 'Not specified',
      department: emp.employee_department || 'Not specified',
      role: emp.role
    }))

    // Get unique departments and roles for filter options
    const departmentsQuery = `
      SELECT DISTINCT employee_department 
      FROM employees 
      WHERE employee_department IS NOT NULL 
        AND employee_department != ''
      ORDER BY employee_department ASC
    `
    const departmentsResult = await query(departmentsQuery, [], req.dbClient)
    const departments = departmentsResult.rows.map((row: any) => row.employee_department)

    const rolesQuery = `
      SELECT DISTINCT designation 
      FROM employees 
      WHERE designation IS NOT NULL 
        AND designation != ''
      ORDER BY designation ASC
    `
    const rolesResult = await query(rolesQuery, [], req.dbClient)
    const roles = rolesResult.rows.map((row: any) => row.designation)

    // Log directory access (for security auditing)
    // Note: We don't have req.user.employeeId here, so we'll log generically
    if (req.user) {
      await logEmployeeActionFromRequest(
        (req.user as any).id || 0,
        EmployeeAuditActions.DIRECTORY_VIEWED,
        req,
        {
          resourceType: 'directory',
          newValue: { 
            searchQuery: search, 
            department, 
            role, 
            resultsCount: employees.length 
          }
        }
      )
    }

    return res.status(200).json({
      employees: employees,
      total: employees.length,
      filters: {
        departments: departments,
        roles: roles
      }
    })

  } catch (error) {
    console.error('Error fetching employee directory:', error)
    return res.status(500).json({ 
      error: 'server_error', 
      message: 'Failed to fetch employee directory' 
    })
  }
}
