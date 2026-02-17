"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function createQuoteRemindersTable() {
    const client = await db_1.pool.connect();
    try {
        await client.query('BEGIN');
        // Create quote_reminders table
        await client.query(`
      CREATE TABLE IF NOT EXISTS quote_reminders (
        reminder_id SERIAL PRIMARY KEY,
        quote_id INT NOT NULL REFERENCES quotes(quote_id) ON DELETE CASCADE,
        reminder_date DATE NOT NULL,
        reminder_type VARCHAR(20) CHECK (reminder_type IN ('AUTO', 'MANUAL')) DEFAULT 'MANUAL',
        reminder_status VARCHAR(20) CHECK (reminder_status IN ('PENDING', 'SENT', 'DISMISSED')) DEFAULT 'PENDING',
        created_by INT REFERENCES employees(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create index for performance on reminder queries
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reminder_date_status 
      ON quote_reminders(reminder_date, reminder_status)
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reminder_quote_id 
      ON quote_reminders(quote_id)
    `);
        // Create quote_reminder_settings table
        await client.query(`
      CREATE TABLE IF NOT EXISTS quote_reminder_settings (
        setting_id SERIAL PRIMARY KEY,
        days_after_sent INT NOT NULL DEFAULT 3,
        days_after_follow_up INT NOT NULL DEFAULT 7,
        enable_email_notifications BOOLEAN DEFAULT TRUE,
        enable_dashboard_notifications BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Insert default settings if table is empty
        await client.query(`
      INSERT INTO quote_reminder_settings (
        days_after_sent, 
        days_after_follow_up, 
        enable_email_notifications, 
        enable_dashboard_notifications
      )
      SELECT 3, 7, TRUE, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM quote_reminder_settings)
    `);
        await client.query('COMMIT');
        console.log('✅ Quote reminders tables created successfully');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating quote reminders tables:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
createQuoteRemindersTable()
    .then(() => {
    console.log('Migration completed');
    process.exit(0);
})
    .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
