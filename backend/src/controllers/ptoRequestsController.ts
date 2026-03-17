import { Request, Response } from 'express'

type PTORequestPayload = {
  employee_id?: number
  manager_id?: number
  absence_type?: string
  from_date?: string
  to_date?: string
  total_hours?: number
  project_id?: number
  cover_person_id?: number
  cover_person_name?: string
  description?: string
  manager_comments?: string
}

// Get all PTO requests (for managers)
export const getAllPTORequests = async (req: Request, res: Response) => {
  try {
    const { status, employee_id } = req.query

    let query = `
      SELECT
        pr.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.email as employee_email,
        CONCAT(m.first_name, ' ', m.last_name) as manager_name,
        p.project_name,
        CONCAT(c.first_name, ' ', c.last_name) as cover_employee_name
      FROM pto_requests pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN employees m ON pr.manager_id = m.id
      LEFT JOIN projects p ON pr.project_id = p.project_id
      LEFT JOIN employees c ON pr.cover_person_id = c.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramCount = 0

    if (status) {
      paramCount++
      query += ` AND pr.status = $${paramCount}`
      params.push(status)
    }

    if (employee_id) {
      paramCount++
      query += ` AND pr.employee_id = $${paramCount}`
      params.push(employee_id)
    }

    query += ' ORDER BY pr.created_at DESC'

    const result = await req.dbClient!.query(query, params)
    return res.status(200).json({ ptoRequests: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get employee's own PTO requests
export const getMyPTORequests = async (req: Request, res: Response) => {
  const { employeeId } = req.params

  try {
    const query = `
      SELECT
        pr.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        CONCAT(m.first_name, ' ', m.last_name) as manager_name,
        p.project_name,
        CONCAT(c.first_name, ' ', c.last_name) as cover_employee_name
      FROM pto_requests pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN employees m ON pr.manager_id = m.id
      LEFT JOIN projects p ON pr.project_id = p.project_id
      LEFT JOIN employees c ON pr.cover_person_id = c.id
      WHERE pr.employee_id = $1
      ORDER BY pr.created_at DESC
    `
    const result = await req.dbClient!.query(query, [employeeId])
    return res.status(200).json({ ptoRequests: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get pending PTO requests (for manager approval)
export const getPendingPTORequests = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        pr.*,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.email as employee_email,
        e.phone as employee_phone,
        p.project_name,
        CONCAT(c.first_name, ' ', c.last_name) as cover_employee_name
      FROM pto_requests pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN projects p ON pr.project_id = p.project_id
      LEFT JOIN employees c ON pr.cover_person_id = c.id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at ASC
    `
    const result = await req.dbClient!.query(query)
    return res.status(200).json({ ptoRequests: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Create PTO request
export const createPTORequest = async (req: Request, res: Response) => {
  const {
    employee_id,
    manager_id,
    absence_type,
    from_date,
    to_date,
    total_hours,
    project_id,
    cover_person_id,
    cover_person_name,
    description
  }: PTORequestPayload = req.body

  console.log('📝 Creating PTO request with data:', {
    employee_id,
    manager_id,
    absence_type,
    from_date,
    to_date,
    total_hours,
    project_id,
    cover_person_id,
    cover_person_name,
    description
  })

  if (!employee_id || !absence_type || !from_date || !to_date || total_hours === undefined) {
    console.log('❌ Missing required fields')
    return res.status(400).json({ error: 'missing_required_fields' })
  }

  try {
    const query = `
      INSERT INTO pto_requests (
        employee_id, manager_id, absence_type, from_date, to_date,
        total_hours, project_id, cover_person_id, cover_person_name, description, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *
    `
    const values = [
      employee_id,
      manager_id || null,
      absence_type,
      from_date,
      to_date,
      total_hours,
      project_id || null,
      cover_person_id || null,
      cover_person_name || null,
      description || null
    ]

    console.log('🔍 Executing query with values:', values)
    const result = await req.dbClient!.query(query, values)
    console.log('✅ PTO request created successfully:', result.rows[0])
    return res.status(201).json({ ptoRequest: result.rows[0] })
  } catch (err: unknown) {
    console.error('❌ Error creating PTO request:', err)
    const message = err instanceof Error ? err.message : 'server_error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('Error details:', { message, stack })
    return res.status(500).json({ error: message, details: stack })
  }
}

// Update PTO request (only pending requests)
export const updatePTORequest = async (req: Request, res: Response) => {
  const { id } = req.params
  const {
    manager_id,
    absence_type,
    from_date,
    to_date,
    total_hours,
    project_id,
    cover_person_id,
    cover_person_name,
    description
  }: PTORequestPayload = req.body

  try {
    // Check if request is still pending
    const checkQuery = 'SELECT status FROM pto_requests WHERE id = $1'
    const checkResult = await req.dbClient!.query(checkQuery, [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'pto_request_not_found' })
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'cannot_edit_processed_request' })
    }

    const query = `
      UPDATE pto_requests
      SET
        manager_id = COALESCE($1, manager_id),
        absence_type = COALESCE($2, absence_type),
        from_date = COALESCE($3, from_date),
        to_date = COALESCE($4, to_date),
        total_hours = COALESCE($5, total_hours),
        project_id = COALESCE($6, project_id),
        cover_person_id = COALESCE($7, cover_person_id),
        cover_person_name = COALESCE($8, cover_person_name),
        description = COALESCE($9, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `
    const values = [
      manager_id,
      absence_type,
      from_date,
      to_date,
      total_hours,
      project_id,
      cover_person_id,
      cover_person_name,
      description,
      id
    ]

    const result = await req.dbClient!.query(query, values)
    return res.status(200).json({ ptoRequest: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Delete PTO request (only pending requests)
export const deletePTORequest = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    // Check if request is still pending
    const checkQuery = 'SELECT status FROM pto_requests WHERE id = $1'
    const checkResult = await req.dbClient!.query(checkQuery, [id])

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'pto_request_not_found' })
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'cannot_delete_processed_request' })
    }

    const query = 'DELETE FROM pto_requests WHERE id = $1 RETURNING id'
    const result = await req.dbClient!.query(query, [id])

    return res.status(200).json({ message: 'pto_request_deleted', id: result.rows[0].id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Approve PTO request
export const approvePTORequest = async (req: Request, res: Response) => {
  const { id } = req.params
  const { manager_id, manager_comments }: { manager_id?: number; manager_comments?: string } = req.body

  if (!manager_id) {
    return res.status(400).json({ error: 'missing_manager_id' })
  }

  try {
    const query = `
      UPDATE pto_requests
      SET
        status = 'approved',
        manager_id = $1,
        manager_comments = $2,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [manager_id, manager_comments || null, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'pto_request_not_found_or_already_processed' })
    }

    return res.status(200).json({ ptoRequest: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Deny PTO request
export const denyPTORequest = async (req: Request, res: Response) => {
  const { id } = req.params
  const { manager_id, manager_comments }: { manager_id?: number; manager_comments?: string } = req.body

  if (!manager_id) {
    return res.status(400).json({ error: 'missing_manager_id' })
  }

  try {
    const query = `
      UPDATE pto_requests
      SET
        status = 'denied',
        manager_id = $1,
        manager_comments = $2,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [manager_id, manager_comments || null, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'pto_request_not_found_or_already_processed' })
    }

    return res.status(200).json({ ptoRequest: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get PTO statistics for an employee
export const getPTOStats = async (req: Request, res: Response) => {
  const { employeeId } = req.params
  const { year } = req.query

  try {
    const currentYear = year || new Date().getFullYear()

    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'denied') as denied_count,
        COALESCE(SUM(total_hours) FILTER (WHERE status = 'approved'), 0) as total_approved_hours,
        COALESCE(SUM(total_hours) FILTER (WHERE status = 'pending'), 0) as total_pending_hours
      FROM pto_requests
      WHERE employee_id = $1
        AND EXTRACT(YEAR FROM from_date) = $2
    `
    const result = await req.dbClient!.query(query, [employeeId, currentYear])

    return res.status(200).json({ stats: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
