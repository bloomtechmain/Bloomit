"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Create email_log table for Phase 19
 *
 * This table logs all emails sent from the system
 * Simplified tracking: sent/delivered/failed status only
 * Used for audit trail and debugging
 */
async function createEmailLogTable() {
    const client = await db_1.pool.connect();
    try {
        console.log('Creating email_log table...');
        // Drop table if exists (for development)
        await client.query('DROP TABLE IF EXISTS email_log CASCADE');
        // Create email_log table
        await client.query(`
      CREATE TABLE email_log (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        email_type VARCHAR(50) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivery_status VARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed')),
        error_message TEXT,
        metadata JSONB,
        CONSTRAINT email_log_email_type_check CHECK (email_type IN (
          'welcome',
          'password_reset',
          'pto_approved',
          'pto_denied',
          'payslip_ready',
          'payslip_signed',
          'time_entry_reminder',
          'announcement',
          'po_created',
          'po_approved',
          'po_rejected',
          'other'
        ))
      )
    `);
        console.log('✓ email_log table created');
        // Create indexes for performance
        await client.query(`
      CREATE INDEX idx_email_log_employee_id 
      ON email_log(employee_id)
    `);
        console.log('✓ Index on employee_id created');
        await client.query(`
      CREATE INDEX idx_email_log_recipient 
      ON email_log(recipient_email)
    `);
        console.log('✓ Index on recipient_email created');
        await client.query(`
      CREATE INDEX idx_email_log_sent_at 
      ON email_log(sent_at DESC)
    `);
        console.log('✓ Index on sent_at created');
        await client.query(`
      CREATE INDEX idx_email_log_type 
      ON email_log(email_type)
    `);
        console.log('✓ Index on email_type created');
        await client.query(`
      CREATE INDEX idx_email_log_status 
      ON email_log(delivery_status)
    `);
        console.log('✓ Index on delivery_status created');
        console.log('\n✅ Email log table setup complete!');
        console.log('\nTable structure:');
        console.log('- id: Serial primary key');
        console.log('- employee_id: Foreign key to employees (optional)');
        console.log('- email_type: Type of email sent');
        console.log('- recipient_email: Email address');
        console.log('- subject: Email subject line');
        console.log('- sent_at: Timestamp of sending');
        console.log('- delivery_status: sent, delivered, or failed');
        console.log('- error_message: Error details if failed');
        console.log('- metadata: Additional context (JSONB)');
        console.log('\nSupported Email Types:');
        console.log('- welcome, password_reset');
        console.log('- pto_approved, pto_denied');
        console.log('- payslip_ready, payslip_signed');
        console.log('- time_entry_reminder');
        console.log('- announcement');
        console.log('- po_created, po_approved, po_rejected');
    }
    catch (error) {
        console.error('Error creating email_log table:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    createEmailLogTable()
        .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
}
exports.default = createEmailLogTable;
