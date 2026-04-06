import { Request, Response } from 'express'

type TimeEntryPayload = {
  employee_id?: number
  project_id?: number
  contract_id?: number
  date?: string
  total_hours?: number
  break_time_minutes?: number
  description?: string
  clock_in?: string
  clock_out?: string
}

// Get employee's own time entries
export const getMyTimeEntries = async (req: Request, res: Response) => {
  try {
    const employeeId = req.query.employee_id
    const { start_date, end_date, project_id, status } = req.query

    let query = `
      SELECT
        te.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        p.project_name as project_name,
        c.contract_name,
        CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
      FROM time_entries te
      LEFT JOIN employees e ON te.employee_id = e.id
      LEFT JOIN projects p ON te.project_id = p.project_id
      LEFT JOIN contracts c ON te.contract_id = c.contract_id
      LEFT JOIN employees approver ON te.approved_by = approver.id
      WHERE te.employee_id = $1
    `
    const params: any[] = [employeeId]
    let paramCount = 1

    if (start_date) {
      paramCount++
      query += ` AND te.date >= $${paramCount}`
      params.push(start_date)
    }

    if (end_date) {
      paramCount++
      query += ` AND te.date <= $${paramCount}`
      params.push(end_date)
    }

    if (project_id) {
      paramCount++
      query += ` AND te.project_id = $${paramCount}`
      params.push(project_id)
    }

    if (status) {
      paramCount++
      query += ` AND te.status = $${paramCount}`
      params.push(status)
    }

    query += ' ORDER BY te.date DESC, te.created_at DESC'

    const result = await req.dbClient!.query(query, params)
    return res.status(200).json({ timeEntries: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get pending time entries for manager approval
export const getPendingTimeEntries = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        te.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.email as employee_email,
        p.project_name as project_name,
        c.contract_name
      FROM time_entries te
      LEFT JOIN employees e ON te.employee_id = e.id
      LEFT JOIN projects p ON te.project_id = p.project_id
      LEFT JOIN contracts c ON te.contract_id = c.contract_id
      WHERE te.status = 'pending'
      ORDER BY te.date DESC, te.created_at DESC
    `
    const result = await req.dbClient!.query(query)
    return res.status(200).json({ timeEntries: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Create manual time entry
export const createTimeEntry = async (req: Request, res: Response) => {
  const { employee_id, project_id, contract_id, date, total_hours, break_time_minutes, description }: TimeEntryPayload = req.body

  if (!employee_id || !project_id || !date || total_hours === undefined) {
    return res.status(400).json({ error: 'missing_required_fields' })
  }

  try {
    const query = `
      INSERT INTO time_entries (
        employee_id, project_id, contract_id, date, total_hours,
        break_time_minutes, description, is_timer_based, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'pending')
      RETURNING *
    `
    const values = [
      employee_id,
      project_id,
      contract_id || null,
      date,
      total_hours,
      break_time_minutes || 0,
      description || null
    ]

    const result = await req.dbClient!.query(query, values)
    return res.status(201).json({ timeEntry: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Start timer
export const startTimer = async (req: Request, res: Response) => {
  const { employee_id, project_id, contract_id, description } = req.body

  if (!employee_id || !project_id) {
    return res.status(400).json({ error: 'missing_required_fields' })
  }

  try {
    // Check if employee already has an active timer
    const checkQuery = 'SELECT * FROM active_timers WHERE employee_id = $1'
    const checkResult = await req.dbClient!.query(checkQuery, [employee_id])

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'timer_already_running' })
    }

    // Create time entry
    const now = new Date()
    const timeEntryQuery = `
      INSERT INTO time_entries (
        employee_id, project_id, contract_id, date, clock_in,
        description, is_timer_based, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, 'pending')
      RETURNING *
    `
    const timeEntryValues = [
      employee_id,
      project_id,
      contract_id || null,
      now.toISOString().split('T')[0],
      now,
      description || null
    ]

    const timeEntryResult = await req.dbClient!.query(timeEntryQuery, timeEntryValues)
    const timeEntry = timeEntryResult.rows[0]

    // Create active timer
    const timerQuery = `
      INSERT INTO active_timers (employee_id, time_entry_id, started_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `
    const timerResult = await req.dbClient!.query(timerQuery, [employee_id, timeEntry.id, now])

    return res.status(201).json({
      timeEntry,
      activeTimer: timerResult.rows[0]
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get active timer status
export const getActiveTimer = async (req: Request, res: Response) => {
  const { employeeId } = req.params

  try {
    const query = `
      SELECT
        at.*,
        te.project_id,
        te.contract_id,
        te.description,
        p.project_name as project_name,
        c.contract_name
      FROM active_timers at
      JOIN time_entries te ON at.time_entry_id = te.id
      LEFT JOIN projects p ON te.project_id = p.project_id
      LEFT JOIN contracts c ON te.contract_id = c.contract_id
      WHERE at.employee_id = $1
    `
    const result = await req.dbClient!.query(query, [employeeId])

    if (result.rows.length === 0) {
      return res.status(200).json({ activeTimer: null })
    }

    return res.status(200).json({ activeTimer: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Pause timer (start break)
export const pauseTimer = async (req: Request, res: Response) => {
  const { employee_id } = req.body

  if (!employee_id) {
    return res.status(400).json({ error: 'missing_employee_id' })
  }

  try {
    const now = new Date()
    const query = `
      UPDATE active_timers
      SET is_on_break = true, last_break_start = $1
      WHERE employee_id = $2 AND is_on_break = false
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [now, employee_id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'no_active_timer_or_already_on_break' })
    }

    return res.status(200).json({ activeTimer: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Resume timer (end break)
export const resumeTimer = async (req: Request, res: Response) => {
  const { employee_id } = req.body

  if (!employee_id) {
    return res.status(400).json({ error: 'missing_employee_id' })
  }

  try {
    const now = new Date()

    // Get current timer
    const getQuery = 'SELECT * FROM active_timers WHERE employee_id = $1 AND is_on_break = true'
    const getResult = await req.dbClient!.query(getQuery, [employee_id])

    if (getResult.rows.length === 0) {
      return res.status(404).json({ error: 'no_active_break' })
    }

    const timer = getResult.rows[0]
    const breakStart = new Date(timer.last_break_start)
    const breakDurationMinutes = Math.round((now.getTime() - breakStart.getTime()) / 60000)

    // Update timer
    const updateQuery = `
      UPDATE active_timers
      SET
        is_on_break = false,
        total_break_time_minutes = total_break_time_minutes + $1,
        last_break_start = NULL
      WHERE employee_id = $2
      RETURNING *
    `
    const result = await req.dbClient!.query(updateQuery, [breakDurationMinutes, employee_id])

    return res.status(200).json({ activeTimer: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Stop timer
export const stopTimer = async (req: Request, res: Response) => {
  const { employee_id, description } = req.body

  if (!employee_id) {
    return res.status(400).json({ error: 'missing_employee_id' })
  }

  try {
    const now = new Date()

    // Get active timer
    const getTimerQuery = 'SELECT * FROM active_timers WHERE employee_id = $1'
    const timerResult = await req.dbClient!.query(getTimerQuery, [employee_id])

    if (timerResult.rows.length === 0) {
      return res.status(404).json({ error: 'no_active_timer' })
    }

    const timer = timerResult.rows[0]
    let totalBreakTime = timer.total_break_time_minutes

    // If on break, add current break time
    if (timer.is_on_break && timer.last_break_start) {
      const breakStart = new Date(timer.last_break_start)
      const breakDurationMinutes = Math.round((now.getTime() - breakStart.getTime()) / 60000)
      totalBreakTime += breakDurationMinutes
    }

    // Calculate total hours
    const startTime = new Date(timer.started_at)
    const totalMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000)
    const workMinutes = totalMinutes - totalBreakTime
    const totalHours = Math.round((workMinutes / 60) * 100) / 100 // Round to 2 decimals

    // Update time entry
    const updateEntryQuery = `
      UPDATE time_entries
      SET
        clock_out = $1,
        total_hours = $2,
        break_time_minutes = $3,
        description = COALESCE($4, description),
        updated_at = $1
      WHERE id = $5
      RETURNING *
    `
    const entryResult = await req.dbClient!.query(updateEntryQuery, [
      now,
      totalHours,
      totalBreakTime,
      description || null,
      timer.time_entry_id
    ])

    // Delete active timer
    await req.dbClient!.query('DELETE FROM active_timers WHERE employee_id = $1', [employee_id])

    return res.status(200).json({ timeEntry: entryResult.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Update time entry
export const updateTimeEntry = async (req: Request, res: Response) => {
  const { id } = req.params
  const { total_hours, break_time_minutes, description, date } = req.body

  try {
    // Check if entry is pending (only pending entries can be edited)
    const checkQuery = 'SELECT status FROM time_entries WHERE id = $1'
    const checkResult = await req.dbClient!.query(checkQuery, [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'time_entry_not_found' })
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'cannot_edit_approved_or_rejected_entry' })
    }

    const query = `
      UPDATE time_entries
      SET
        total_hours = COALESCE($1, total_hours),
        break_time_minutes = COALESCE($2, break_time_minutes),
        description = COALESCE($3, description),
        date = COALESCE($4, date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `
    const values = [total_hours, break_time_minutes, description, date, id]
    const result = await req.dbClient!.query(query, values)

    return res.status(200).json({ timeEntry: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Delete time entry
export const deleteTimeEntry = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    // Check if entry is pending
    const checkQuery = 'SELECT status FROM time_entries WHERE id = $1'
    const checkResult = await req.dbClient!.query(checkQuery, [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'time_entry_not_found' })
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'cannot_delete_approved_or_rejected_entry' })
    }

    const query = 'DELETE FROM time_entries WHERE id = $1 RETURNING id'
    const result = await req.dbClient!.query(query, [id])

    return res.status(200).json({ message: 'time_entry_deleted', id: result.rows[0].id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Approve time entry
export const approveTimeEntry = async (req: Request, res: Response) => {
  const { id } = req.params
  const { approved_by } = req.body

  if (!approved_by) {
    return res.status(400).json({ error: 'missing_approved_by' })
  }

  try {
    const query = `
      UPDATE time_entries
      SET
        status = 'approved',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [approved_by, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'time_entry_not_found_or_already_processed' })
    }

    return res.status(200).json({ timeEntry: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Reject time entry
export const rejectTimeEntry = async (req: Request, res: Response) => {
  const { id } = req.params
  const { approved_by, rejection_note } = req.body

  if (!approved_by) {
    return res.status(400).json({ error: 'missing_approved_by' })
  }

  try {
    const query = `
      UPDATE time_entries
      SET
        status = 'rejected',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        rejection_note = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [approved_by, rejection_note || null, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'time_entry_not_found_or_already_processed' })
    }

    return res.status(200).json({ timeEntry: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get summary statistics
export const getTimeSummary = async (req: Request, res: Response) => {
  try {
    const { employee_id, project_id, start_date, end_date } = req.query

    let whereClause = "WHERE te.status != 'rejected'"
    const params: any[] = []
    let paramCount = 0

    if (employee_id) {
      paramCount++
      whereClause += ` AND te.employee_id = $${paramCount}`
      params.push(employee_id)
    }

    if (project_id) {
      paramCount++
      whereClause += ` AND te.project_id = $${paramCount}`
      params.push(project_id)
    }

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

    // Total hours by project
    const projectQuery = `
      SELECT
        p.project_id,
        p.project_name as project_name,
        SUM(te.total_hours) as total_hours,
        SUM(te.break_time_minutes) as total_break_minutes,
        COUNT(te.id) as entry_count
      FROM time_entries te
      JOIN projects p ON te.project_id = p.project_id
      ${whereClause}
      GROUP BY p.project_id, p.project_name
      ORDER BY total_hours DESC
    `
    const projectResult = await req.dbClient!.query(projectQuery, params)

    // Total hours by employee
    const employeeQuery = `
      SELECT
        e.id as employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        SUM(te.total_hours) as total_hours,
        SUM(te.break_time_minutes) as total_break_minutes,
        COUNT(te.id) as entry_count
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      ${whereClause}
      GROUP BY e.id, e.first_name, e.last_name
      ORDER BY total_hours DESC
    `
    const employeeResult = await req.dbClient!.query(employeeQuery, params)

    // Overall summary
    const overallQuery = `
      SELECT
        SUM(total_hours) as total_hours,
        SUM(break_time_minutes) as total_break_minutes,
        COUNT(id) as total_entries,
        AVG(total_hours) as avg_hours_per_entry
      FROM time_entries te
      ${whereClause}
    `
    const overallResult = await req.dbClient!.query(overallQuery, params)

    return res.status(200).json({
      byProject: projectResult.rows,
      byEmployee: employeeResult.rows,
      overall: overallResult.rows[0]
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
