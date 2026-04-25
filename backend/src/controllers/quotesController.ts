import { Request, Response } from 'express'

type QuotePayload = {
  template_type?: 'SERVICES' | 'PRODUCTS' | 'CONSULTING' | 'CONSTRUCTION' | 'CUSTOM'
  company_name?: string
  company_address?: string
  date_of_issue?: string
  notes?: string
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'FOLLOW_UP'
  assigned_to?: number
  created_by?: number
  items?: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
  additional_services?: Array<{
    service_name: string
    price: number
  }>
}

// Get all quotes
export const getAllQuotes = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        q.*,
        CONCAT(e1.first_name, ' ', e1.last_name) as created_by_name,
        CONCAT(e2.first_name, ' ', e2.last_name) as assigned_to_name
      FROM quotes q
      LEFT JOIN employees e1 ON q.created_by = e1.id
      LEFT JOIN employees e2 ON q.assigned_to = e2.id
      ORDER BY q.created_at DESC
    `
    const result = await req.dbClient!.query(query)
    return res.status(200).json({ quotes: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get quote by ID with items and services
export const getQuoteById = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    // Get quote
    const quoteQuery = `
      SELECT
        q.*,
        CONCAT(e1.first_name, ' ', e1.last_name) as created_by_name,
        CONCAT(e2.first_name, ' ', e2.last_name) as assigned_to_name
      FROM quotes q
      LEFT JOIN employees e1 ON q.created_by = e1.id
      LEFT JOIN employees e2 ON q.assigned_to = e2.id
      WHERE q.quote_id = $1
    `
    const quoteResult = await req.dbClient!.query(quoteQuery, [id])

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'quote_not_found' })
    }

    // Get items
    const itemsQuery = `
      SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY item_id
    `
    const itemsResult = await req.dbClient!.query(itemsQuery, [id])

    // Get additional services
    const servicesQuery = `
      SELECT * FROM quote_additional_services WHERE quote_id = $1 ORDER BY service_id
    `
    const servicesResult = await req.dbClient!.query(servicesQuery, [id])

    const quote = {
      ...quoteResult.rows[0],
      items: itemsResult.rows,
      additional_services: servicesResult.rows
    }

    return res.status(200).json({ quote })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Create new quote
export const createQuote = async (req: Request, res: Response) => {
  const {
    template_type,
    company_name,
    company_address,
    date_of_issue,
    notes,
    status,
    assigned_to,
    created_by,
    items = [],
    additional_services = []
  }: QuotePayload = req.body

  if (!template_type || !company_name || !date_of_issue || !items || items.length === 0) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  const client = req.dbClient!

  try {
    await client.query('BEGIN')

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const total_due = subtotal

    // Generate quote number inline — avoids dependency on a DB function
    const quoteNumberResult = await client.query(`
      SELECT LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+') AS INT)), 0) + 1)::TEXT,
        7, '0'
      ) AS quote_number
      FROM quotes
    `)
    const quote_number = quoteNumberResult.rows[0].quote_number

    // Insert quote
    const quoteQuery = `
      INSERT INTO quotes (
        quote_number, template_type, company_name, company_address,
        date_of_issue, subtotal, total_due, notes, status, assigned_to, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `
    const quoteValues = [
      quote_number,
      template_type,
      company_name,
      company_address || null,
      date_of_issue,
      subtotal,
      total_due,
      notes || null,
      status || 'DRAFT',
      assigned_to || null,
      created_by || null
    ]
    const quoteResult = await client.query(quoteQuery, quoteValues)
    const quoteId = quoteResult.rows[0].quote_id

    // Insert items
    for (const item of items) {
      const itemQuery = `
        INSERT INTO quote_items (quote_id, description, quantity, unit_price, total)
        VALUES ($1, $2, $3, $4, $5)
      `
      await client.query(itemQuery, [quoteId, item.description, item.quantity, item.unit_price, item.total])
    }

    // Insert additional services
    for (const service of additional_services) {
      const serviceQuery = `
        INSERT INTO quote_additional_services (quote_id, service_name, price)
        VALUES ($1, $2, $3)
      `
      await client.query(serviceQuery, [quoteId, service.service_name, service.price])
    }

    await client.query('COMMIT')

    return res.status(201).json({ quote: quoteResult.rows[0] })
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Update quote
export const updateQuote = async (req: Request, res: Response) => {
  const { id } = req.params
  const {
    template_type,
    company_name,
    company_address,
    date_of_issue,
    notes,
    status,
    assigned_to,
    items = [],
    additional_services = []
  }: QuotePayload = req.body

  if (!template_type || !company_name || !date_of_issue) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  const client = req.dbClient!

  try {
    await client.query('BEGIN')

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const total_due = subtotal

    // Update quote
    const quoteQuery = `
      UPDATE quotes
      SET template_type = $1, company_name = $2, company_address = $3,
          date_of_issue = $4, subtotal = $5, total_due = $6, notes = $7,
          status = $8, assigned_to = $9, updated_at = CURRENT_TIMESTAMP
      WHERE quote_id = $10
      RETURNING *
    `
    const quoteValues = [
      template_type,
      company_name,
      company_address || null,
      date_of_issue,
      subtotal,
      total_due,
      notes || null,
      status || 'DRAFT',
      assigned_to || null,
      id
    ]
    const quoteResult = await client.query(quoteQuery, quoteValues)

    if (quoteResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'quote_not_found' })
    }

    // Delete existing items and services
    await client.query('DELETE FROM quote_items WHERE quote_id = $1', [id])
    await client.query('DELETE FROM quote_additional_services WHERE quote_id = $1', [id])

    // Insert new items
    for (const item of items) {
      const itemQuery = `
        INSERT INTO quote_items (quote_id, description, quantity, unit_price, total)
        VALUES ($1, $2, $3, $4, $5)
      `
      await client.query(itemQuery, [id, item.description, item.quantity, item.unit_price, item.total])
    }

    // Insert new additional services
    for (const service of additional_services) {
      const serviceQuery = `
        INSERT INTO quote_additional_services (quote_id, service_name, price)
        VALUES ($1, $2, $3)
      `
      await client.query(serviceQuery, [id, service.service_name, service.price])
    }

    await client.query('COMMIT')

    return res.status(200).json({ quote: quoteResult.rows[0] })
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Update quote status
export const updateQuoteStatus = async (req: Request, res: Response) => {
  const { id } = req.params
  const { status, changed_by, notes } = req.body

  if (!status) {
    return res.status(400).json({ error: 'status_required' })
  }

  const client = req.dbClient!

  try {
    await client.query('BEGIN')

    // Get current status
    const currentQuery = 'SELECT status FROM quotes WHERE quote_id = $1'
    const currentResult = await client.query(currentQuery, [id])

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'quote_not_found' })
    }

    const old_status = currentResult.rows[0].status

    // Update quote status
    const updateQuery = `
      UPDATE quotes
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE quote_id = $2
      RETURNING *
    `
    const updateResult = await client.query(updateQuery, [status, id])

    // Insert status history
    const historyQuery = `
      INSERT INTO quote_status_history (quote_id, old_status, new_status, changed_by, notes)
      VALUES ($1, $2, $3, $4, $5)
    `
    await client.query(historyQuery, [id, old_status, status, changed_by || null, notes || null])

    await client.query('COMMIT')

    return res.status(200).json({ quote: updateResult.rows[0] })
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get status history for a quote
export const getQuoteStatusHistory = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const query = `
      SELECT
        qsh.*,
        CONCAT(e.first_name, ' ', e.last_name) as changed_by_name
      FROM quote_status_history qsh
      LEFT JOIN employees e ON qsh.changed_by = e.id
      WHERE qsh.quote_id = $1
      ORDER BY qsh.changed_at DESC
    `
    const result = await req.dbClient!.query(query, [id])

    return res.status(200).json({ history: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Delete quote
export const deleteQuote = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const query = 'DELETE FROM quotes WHERE quote_id = $1 RETURNING quote_id'
    const result = await req.dbClient!.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'quote_not_found' })
    }

    return res.status(200).json({ message: 'quote_deleted', quote_id: result.rows[0].quote_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get service suggestions (for autocomplete)
export const getServiceSuggestions = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        service_name,
        price,
        COUNT(*) as usage_count
      FROM quote_additional_services
      GROUP BY service_name, price
      ORDER BY usage_count DESC, service_name ASC
      LIMIT 50
    `
    const result = await req.dbClient!.query(query)

    return res.status(200).json({ suggestions: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Assign quote to employee
export const assignQuote = async (req: Request, res: Response) => {
  const { id } = req.params
  const { assigned_to } = req.body

  try {
    const query = `
      UPDATE quotes
      SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
      WHERE quote_id = $2
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [assigned_to || null, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'quote_not_found' })
    }

    // Get quote with employee names joined
    const quoteQuery = `
      SELECT
        q.*,
        CONCAT(e1.first_name, ' ', e1.last_name) as created_by_name,
        CONCAT(e2.first_name, ' ', e2.last_name) as assigned_to_name
      FROM quotes q
      LEFT JOIN employees e1 ON q.created_by = e1.id
      LEFT JOIN employees e2 ON q.assigned_to = e2.id
      WHERE q.quote_id = $1
    `
    const quoteResult = await req.dbClient!.query(quoteQuery, [id])

    return res.status(200).json({ quote: quoteResult.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// ========== REMINDER MANAGEMENT ==========

// Create a manual reminder for a quote
export const createReminder = async (req: Request, res: Response) => {
  const { id } = req.params
  const { reminder_date, notes, created_by, assigned_to } = req.body

  if (!reminder_date) {
    return res.status(400).json({ error: 'reminder_date_required' })
  }

  try {
    const query = `
      INSERT INTO quote_reminders (quote_id, reminder_date, reminder_type, notes, created_by, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [id, reminder_date, 'MANUAL', notes || null, created_by || null, assigned_to || null])

    // Get reminder with employee names joined
    const reminderQuery = `
      SELECT
        qr.*,
        CONCAT(e1.first_name, ' ', e1.last_name) as created_by_name,
        CONCAT(e2.first_name, ' ', e2.last_name) as assigned_to_name
      FROM quote_reminders qr
      LEFT JOIN employees e1 ON qr.created_by = e1.id
      LEFT JOIN employees e2 ON qr.assigned_to = e2.id
      WHERE qr.reminder_id = $1
    `
    const reminderResult = await req.dbClient!.query(reminderQuery, [result.rows[0].reminder_id])

    return res.status(201).json({ reminder: reminderResult.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get all reminders for a specific quote
export const getQuoteReminders = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const query = `
      SELECT
        qr.*,
        CONCAT(e1.first_name, ' ', e1.last_name) as created_by_name,
        CONCAT(e2.first_name, ' ', e2.last_name) as assigned_to_name
      FROM quote_reminders qr
      LEFT JOIN employees e1 ON qr.created_by = e1.id
      LEFT JOIN employees e2 ON qr.assigned_to = e2.id
      WHERE qr.quote_id = $1
      ORDER BY qr.reminder_date DESC
    `
    const result = await req.dbClient!.query(query, [id])

    return res.status(200).json({ reminders: result.rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get all pending reminders (for dashboard widget)
export const getAllPendingReminders = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        qr.*,
        q.quote_number,
        q.company_name,
        q.status as quote_status,
        q.total_due,
        q.assigned_to as quote_assigned_to,
        CONCAT(e1.first_name, ' ', e1.last_name) as created_by_name,
        CONCAT(e2.first_name, ' ', e2.last_name) as assigned_to_name,
        CONCAT(e3.first_name, ' ', e3.last_name) as quote_assigned_to_name
      FROM quote_reminders qr
      INNER JOIN quotes q ON qr.quote_id = q.quote_id
      LEFT JOIN employees e1 ON qr.created_by = e1.id
      LEFT JOIN employees e2 ON qr.assigned_to = e2.id
      LEFT JOIN employees e3 ON q.assigned_to = e3.id
      WHERE qr.reminder_status = 'PENDING'
      ORDER BY qr.reminder_date ASC
    `
    const result = await req.dbClient!.query(query)

    // Categorize reminders by urgency
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const categorized = {
      overdue: [] as any[],
      today: [] as any[],
      upcoming: [] as any[]
    }

    result.rows.forEach(reminder => {
      const reminderDate = new Date(reminder.reminder_date)
      reminderDate.setHours(0, 0, 0, 0)

      if (reminderDate < today) {
        categorized.overdue.push(reminder)
      } else if (reminderDate.getTime() === today.getTime()) {
        categorized.today.push(reminder)
      } else {
        categorized.upcoming.push(reminder)
      }
    })

    return res.status(200).json({
      reminders: result.rows,
      categorized
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Dismiss a reminder
export const dismissReminder = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const query = `
      UPDATE quote_reminders
      SET reminder_status = 'DISMISSED', updated_at = CURRENT_TIMESTAMP
      WHERE reminder_id = $1
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'reminder_not_found' })
    }

    return res.status(200).json({ reminder: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Get reminder settings
export const getReminderSettings = async (req: Request, res: Response) => {
  try {
    const query = 'SELECT * FROM quote_reminder_settings LIMIT 1'
    const result = await req.dbClient!.query(query)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'settings_not_found' })
    }

    return res.status(200).json({ settings: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}

// Update reminder settings
export const updateReminderSettings = async (req: Request, res: Response) => {
  const { days_after_sent, days_after_follow_up, enable_email_notifications, enable_dashboard_notifications } = req.body

  try {
    const query = `
      UPDATE quote_reminder_settings
      SET
        days_after_sent = COALESCE($1, days_after_sent),
        days_after_follow_up = COALESCE($2, days_after_follow_up),
        enable_email_notifications = COALESCE($3, enable_email_notifications),
        enable_dashboard_notifications = COALESCE($4, enable_dashboard_notifications),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `
    const result = await req.dbClient!.query(query, [
      days_after_sent,
      days_after_follow_up,
      enable_email_notifications,
      enable_dashboard_notifications
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'settings_not_found' })
    }

    return res.status(200).json({ settings: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return res.status(500).json({ error: message })
  }
}
