"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Phase 24: Company Directory
 * Add privacy settings columns to employee_portal_settings table
 *
 * This migration adds:
 * - show_in_directory: Controls if employee appears in directory (default: true)
 * - hide_phone_in_directory: Controls if phone number is visible (default: false)
 */
async function addEmployeeDirectorySettings() {
    const client = await db_1.pool.connect();
    try {
        console.log('Starting Phase 24 migration: Adding employee directory settings...');
        // Check if employee_portal_settings table exists
        const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'employee_portal_settings'
      );
    `);
        if (!tableCheck.rows[0].exists) {
            console.log('Creating employee_portal_settings table...');
            await client.query(`
        CREATE TABLE employee_portal_settings (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
          theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
          dashboard_layout JSONB DEFAULT '{"widgets": ["stats", "notes", "calendar"]}',
          email_preferences JSONB DEFAULT '{"pto_notifications": true, "time_entry_reminders": true, "announcement_notifications": true}',
          email_notifications BOOLEAN DEFAULT true,
          push_notifications BOOLEAN DEFAULT false,
          language VARCHAR(10) DEFAULT 'en',
          timezone VARCHAR(50) DEFAULT 'UTC',
          show_in_directory BOOLEAN DEFAULT true,
          hide_phone_in_directory BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
            console.log('✓ Created employee_portal_settings table');
            // Create index for faster lookups
            await client.query(`
        CREATE INDEX idx_employee_portal_settings_employee_id 
        ON employee_portal_settings(employee_id);
      `);
            console.log('✓ Created index on employee_id');
        }
        else {
            console.log('Table employee_portal_settings already exists');
            // Check if columns already exist
            const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_portal_settings' 
          AND column_name IN ('show_in_directory', 'hide_phone_in_directory');
      `);
            const existingColumns = columnCheck.rows.map(row => row.column_name);
            if (!existingColumns.includes('show_in_directory')) {
                console.log('Adding show_in_directory column...');
                await client.query(`
          ALTER TABLE employee_portal_settings 
          ADD COLUMN show_in_directory BOOLEAN DEFAULT true;
        `);
                console.log('✓ Added show_in_directory column');
            }
            else {
                console.log('Column show_in_directory already exists');
            }
            if (!existingColumns.includes('hide_phone_in_directory')) {
                console.log('Adding hide_phone_in_directory column...');
                await client.query(`
          ALTER TABLE employee_portal_settings 
          ADD COLUMN hide_phone_in_directory BOOLEAN DEFAULT false;
        `);
                console.log('✓ Added hide_phone_in_directory column');
            }
            else {
                console.log('Column hide_phone_in_directory already exists');
            }
        }
        // Create index on directory visibility for faster filtering
        const indexCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'employee_portal_settings' 
          AND indexname = 'idx_employee_directory_visibility'
      );
    `);
        if (!indexCheck.rows[0].exists) {
            await client.query(`
        CREATE INDEX idx_employee_directory_visibility 
        ON employee_portal_settings(show_in_directory) 
        WHERE show_in_directory = true;
      `);
            console.log('✓ Created index on directory visibility');
        }
        console.log('\n✅ Phase 24 migration completed successfully!');
        console.log('\nDirectory privacy settings:');
        console.log('  - show_in_directory: Controls visibility in directory (default: true)');
        console.log('  - hide_phone_in_directory: Hides phone number (default: false)');
        console.log('\nAll employees are visible by default with phone numbers shown.');
    }
    catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run migration
addEmployeeDirectorySettings()
    .then(() => {
    console.log('\nMigration completed. Exiting...');
    process.exit(0);
})
    .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
