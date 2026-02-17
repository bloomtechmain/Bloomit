import { pool } from '../db'

async function addInternationalTimezoneSetting() {
  try {
    console.log('Adding international_timezone setting...')
    
    // Check if setting already exists
    const checkResult = await pool.query(
      'SELECT * FROM application_settings WHERE setting_key = $1',
      ['international_timezone']
    )
    
    if (checkResult.rows.length > 0) {
      console.log('✓ international_timezone setting already exists')
      console.log('  Current value:', checkResult.rows[0].setting_value)
    } else {
      // Insert the setting
      await pool.query(
        `INSERT INTO application_settings (setting_key, setting_value, description, updated_by)
         VALUES ($1, $2, $3, $4)`,
        [
          'international_timezone',
          'America/New_York',
          'Timezone for the international clock display on the dashboard',
          null // No user attribution for system settings
        ]
      )
      console.log('✓ Successfully added international_timezone setting')
      console.log('  Default value: America/New_York')
    }
    
    console.log('\n✅ Script completed successfully')
  } catch (error) {
    console.error('❌ Error adding international_timezone setting:', error)
    throw error
  } finally {
    await pool.end()
  }
}

addInternationalTimezoneSetting()
