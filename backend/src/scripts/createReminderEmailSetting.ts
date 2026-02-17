import { pool } from '../db'

async function createReminderEmailSetting() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Check if application_settings table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'application_settings'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      console.log('Creating application_settings table...')
      await client.query(`
        CREATE TABLE application_settings (
          setting_id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
    }

    // Insert reminder email setting if it doesn't exist
    await client.query(`
      INSERT INTO application_settings (setting_key, setting_value, description)
      VALUES (
        'reminder_email_address',
        'arjuna@bloomtech.lk',
        'Email address to receive quote follow-up reminder notifications'
      )
      ON CONFLICT (setting_key) DO NOTHING
    `)

    await client.query('COMMIT')
    console.log('✅ Reminder email setting created successfully')
    console.log('📧 Default email: arjuna@bloomtech.lk')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error creating reminder email setting:', error)
    throw error
  } finally {
    client.release()
  }
}

createReminderEmailSetting()
  .then(() => {
    console.log('Migration completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
