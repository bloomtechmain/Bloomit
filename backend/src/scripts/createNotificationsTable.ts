import { pool } from '../db'

/**
 * Create employee_notifications table for Phase 18
 * 
 * This table stores notifications for employees
 * Real-time delivery via WebSocket
 * ON DELETE CASCADE: Notifications deleted when employee is deleted
 */

async function createNotificationsTable() {
  const client = await pool.connect()
  
  try {
    console.log('Creating employee_notifications table...')

    // Drop table if exists (for development)
    await client.query('DROP TABLE IF EXISTS employee_notifications CASCADE')

    // Create employee_notifications table
    await client.query(`
      CREATE TABLE employee_notifications (
        notification_id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(500),
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        is_read BOOLEAN DEFAULT false,
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        expires_at TIMESTAMP
      )
    `)

    console.log('✓ employee_notifications table created')

    // Create indexes for performance
    await client.query(`
      CREATE INDEX idx_notifications_employee 
      ON employee_notifications(employee_id)
    `)
    console.log('✓ Index on employee_id created')

    await client.query(`
      CREATE INDEX idx_notifications_unread 
      ON employee_notifications(employee_id, is_read) 
      WHERE is_read = false AND is_archived = false
    `)
    console.log('✓ Index on unread notifications created')

    await client.query(`
      CREATE INDEX idx_notifications_created 
      ON employee_notifications(created_at DESC)
    `)
    console.log('✓ Index on created_at created')

    await client.query(`
      CREATE INDEX idx_notifications_type 
      ON employee_notifications(notification_type)
    `)
    console.log('✓ Index on notification_type created')

    console.log('\n✅ Employee notifications table setup complete!')
    console.log('\nTable structure:')
    console.log('- notification_id: Serial primary key')
    console.log('- employee_id: Foreign key to employees (CASCADE DELETE)')
    console.log('- notification_type: Type of notification (PTO_APPROVED, etc.)')
    console.log('- title: Short notification title')
    console.log('- message: Detailed message')
    console.log('- link: Optional link to related resource')
    console.log('- priority: low, normal, high, urgent')
    console.log('- is_read: Whether notification has been read')
    console.log('- is_archived: Whether notification is archived')
    console.log('- created_at: Timestamp of creation')
    console.log('- read_at: Timestamp when marked as read')
    console.log('- expires_at: Optional expiration date')

    console.log('\nNotification Types:')
    console.log('- PTO_APPROVED, PTO_DENIED, PTO_CANCELLED')
    console.log('- PAYSLIP_READY, PAYSLIP_SIGNED')
    console.log('- TIME_ENTRY_APPROVED, TIME_ENTRY_REJECTED')
    console.log('- DOCUMENT_UPLOADED, DOCUMENT_SHARED')
    console.log('- ANNOUNCEMENT_NEW, ANNOUNCEMENT_URGENT')
    console.log('- PROFILE_UPDATED, PASSWORD_CHANGED')

  } catch (error) {
    console.error('Error creating employee_notifications table:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run if executed directly
if (require.main === module) {
  createNotificationsTable()
    .then(() => {
      console.log('\n✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

export default createNotificationsTable
