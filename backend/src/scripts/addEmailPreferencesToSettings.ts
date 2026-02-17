import { pool } from '../db'

/**
 * Add email_preferences field to employee_portal_settings table
 * Phase 19 - Email Notification Enhancements
 * 
 * This adds a JSONB field to store email notification preferences
 * Allows employees to control which types of emails they receive
 * Critical emails (payslips) cannot be disabled
 */

async function addEmailPreferencesToSettings() {
  const client = await pool.connect()
  
  try {
    console.log('Adding email_preferences field to employee_portal_settings...')

    // Check if column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employee_portal_settings' 
        AND column_name = 'email_preferences'
    `
    const checkResult = await client.query(checkQuery)

    if (checkResult.rows.length > 0) {
      console.log('⚠️  email_preferences column already exists, skipping...')
      return
    }

    // Add email_preferences column with default values
    await client.query(`
      ALTER TABLE employee_portal_settings
      ADD COLUMN email_preferences JSONB DEFAULT '{
        "pto_notifications": true,
        "time_entry_reminders": true,
        "announcement_notifications": true
      }'::jsonb
    `)

    console.log('✓ email_preferences column added')

    // Update existing rows to have default preferences
    await client.query(`
      UPDATE employee_portal_settings
      SET email_preferences = '{
        "pto_notifications": true,
        "time_entry_reminders": true,
        "announcement_notifications": true
      }'::jsonb
      WHERE email_preferences IS NULL
    `)

    console.log('✓ Default preferences set for existing employees')

    console.log('\n✅ Email preferences field added successfully!')
    console.log('\nDefault Email Preferences:')
    console.log('  • PTO Notifications: true')
    console.log('  • Time Entry Reminders: true')
    console.log('  • Announcement Notifications: true')
    console.log('\n⚠️  NOTE: Payslip notifications cannot be disabled (critical emails)')

  } catch (error) {
    console.error('Error adding email_preferences field:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run if executed directly
if (require.main === module) {
  addEmailPreferencesToSettings()
    .then(() => {
      console.log('\n✅ Migration completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error)
      process.exit(1)
    })
}

export default addEmailPreferencesToSettings
