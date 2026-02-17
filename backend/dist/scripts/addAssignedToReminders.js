"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function addAssignedToReminders() {
    const client = await db_1.pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Adding assigned_to column to quote_reminders table...');
        // Add assigned_to column if it doesn't exist
        await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'quote_reminders' 
          AND column_name = 'assigned_to'
        ) THEN
          ALTER TABLE quote_reminders 
          ADD COLUMN assigned_to INT REFERENCES employees(id);
          
          CREATE INDEX IF NOT EXISTS idx_reminder_assigned_to 
          ON quote_reminders(assigned_to);
        END IF;
      END $$;
    `);
        await client.query('COMMIT');
        console.log('✅ Successfully added assigned_to column to quote_reminders table');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error adding assigned_to column:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
addAssignedToReminders()
    .then(() => {
    console.log('Migration completed');
    process.exit(0);
})
    .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
