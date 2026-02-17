import { pool } from '../db'
import { sendEmail } from './emailService'

interface Quote {
  quote_id: number
  quote_number: string
  company_name: string
  status: string
  date_of_issue: string
  total_due: number
  assigned_to: number | null
  updated_at: string
}

interface ReminderSettings {
  days_after_sent: number
  days_after_follow_up: number
  enable_email_notifications: boolean
  enable_dashboard_notifications: boolean
}

interface Employee {
  id: number
  name: string
  email: string
}

/**
 * Main function to generate automatic reminders for quotes
 * Runs daily via cron job
 */
export async function generateAutoReminders(): Promise<void> {
  const client = await pool.connect()
  
  try {
    console.log('🔔 Starting automatic reminder generation...')
    
    // Get reminder settings
    const settingsResult = await client.query('SELECT * FROM quote_reminder_settings LIMIT 1')
    if (settingsResult.rows.length === 0) {
      console.log('⚠️ No reminder settings found. Skipping reminder generation.')
      return
    }
    
    const settings: ReminderSettings = settingsResult.rows[0]
    
    if (!settings.enable_dashboard_notifications && !settings.enable_email_notifications) {
      console.log('ℹ️ All notifications disabled. Skipping reminder generation.')
      return
    }
    
    // Get quotes that need follow-up (SENT or FOLLOW_UP status)
    const quotesResult = await client.query(`
      SELECT 
        q.quote_id,
        q.quote_number,
        q.company_name,
        q.status,
        q.date_of_issue,
        q.total_due,
        q.assigned_to,
        q.updated_at
      FROM quotes q
      WHERE q.status IN ('SENT', 'FOLLOW_UP')
      AND q.assigned_to IS NOT NULL
      ORDER BY q.updated_at ASC
    `)
    
    const quotes: Quote[] = quotesResult.rows
    console.log(`📊 Found ${quotes.length} quotes with SENT/FOLLOW_UP status`)
    
    let remindersCreated = 0
    
    for (const quote of quotes) {
      const shouldCreateReminder = await checkQuoteForReminder(quote, settings, client)
      
      if (shouldCreateReminder) {
        await createAutoReminder(quote, client)
        remindersCreated++
        
        // Send email if enabled
        if (settings.enable_email_notifications) {
          await sendReminderEmailForQuote(quote, client)
        }
      }
    }
    
    console.log(`✅ Created ${remindersCreated} automatic reminders`)
  } catch (error) {
    console.error('❌ Error generating automatic reminders:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Check if a quote needs a reminder created
 */
async function checkQuoteForReminder(
  quote: Quote, 
  settings: ReminderSettings, 
  client: any
): Promise<boolean> {
  // Check if there's already a pending reminder for this quote
  const existingReminder = await client.query(
    'SELECT reminder_id FROM quote_reminders WHERE quote_id = $1 AND reminder_status = $2',
    [quote.quote_id, 'PENDING']
  )
  
  if (existingReminder.rows.length > 0) {
    return false // Already has pending reminder
  }
  
  // Calculate days since last update
  const lastUpdate = new Date(quote.updated_at)
  const today = new Date()
  const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Determine if reminder is needed based on status and days
  if (quote.status === 'SENT' && daysSinceUpdate >= settings.days_after_sent) {
    return true
  }
  
  if (quote.status === 'FOLLOW_UP' && daysSinceUpdate >= settings.days_after_follow_up) {
    return true
  }
  
  return false
}

/**
 * Create an automatic reminder for a quote
 */
async function createAutoReminder(quote: Quote, client: any): Promise<void> {
  const today = new Date()
  
  await client.query(`
    INSERT INTO quote_reminders (
      quote_id,
      reminder_date,
      reminder_type,
      reminder_status,
      notes
    ) VALUES ($1, $2, $3, $4, $5)
  `, [
    quote.quote_id,
    today.toISOString().split('T')[0], // Today's date
    'AUTO',
    'PENDING',
    `Automatic reminder: Quote has been in ${quote.status} status and needs follow-up.`
  ])
  
  console.log(`✨ Created auto reminder for Quote #${quote.quote_number}`)
}

/**
 * Send reminder email for a quote
 */
async function sendReminderEmailForQuote(quote: Quote, client: any): Promise<void> {
  try {
    // Get reminder email address from settings
    const emailSetting = await client.query(
      "SELECT setting_value FROM application_settings WHERE setting_key = 'reminder_email_address'"
    )
    
    if (emailSetting.rows.length === 0) {
      console.log('⚠️ No reminder email address configured')
      return
    }
    
    const reminderEmail = emailSetting.rows[0].setting_value
    
    // Get assigned employee info
    let employeeName = 'Team Member'
    if (quote.assigned_to) {
      const employeeResult = await client.query(
        'SELECT name FROM employees WHERE id = $1',
        [quote.assigned_to]
      )
      if (employeeResult.rows.length > 0) {
        employeeName = employeeResult.rows[0].name
      }
    }
    
    // Send email
    const subject = `Quote Follow-Up Reminder: ${quote.company_name}`
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0061ff 0%, #60efff 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; }
          .quote-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: 600; color: #666; }
          .detail-value { color: #333; }
          .button { display: inline-block; background: #0061ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🔔 Quote Follow-Up Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${employeeName},</p>
            <p>This is a reminder to follow up on the following quote:</p>
            
            <div class="quote-details">
              <div class="detail-row">
                <span class="detail-label">Quote Number:</span>
                <span class="detail-value">${quote.quote_number}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Company:</span>
                <span class="detail-value">${quote.company_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${quote.status}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Amount:</span>
                <span class="detail-value">LKR ${Number(quote.total_due).toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date Issued:</span>
                <span class="detail-value">${new Date(quote.date_of_issue).toLocaleDateString()}</span>
              </div>
            </div>
            
            <p>Please take action to follow up with the customer.</p>
            
            <center>
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/quotes" class="button">View Quote</a>
            </center>
          </div>
          <div class="footer">
            <p>This is an automated reminder from BloomTech ERP</p>
            <p>© ${new Date().getFullYear()} BloomTech. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    await sendEmail(reminderEmail, subject, html)
    console.log(`📧 Sent reminder email for Quote #${quote.quote_number} to ${reminderEmail}`)
  } catch (error) {
    console.error(`❌ Error sending reminder email for Quote #${quote.quote_number}:`, error)
    // Don't throw - we don't want email failures to stop reminder creation
  }
}

/**
 * Get employee email by ID
 */
export async function getEmployeeEmail(employeeId: number): Promise<string | null> {
  try {
    const result = await pool.query('SELECT email FROM employees WHERE id = $1', [employeeId])
    return result.rows.length > 0 ? result.rows[0].email : null
  } catch (error) {
    console.error('Error fetching employee email:', error)
    return null
  }
}
