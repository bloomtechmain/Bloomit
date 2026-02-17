"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function createApplicationSettingsTable() {
    const client = await db_1.pool.connect();
    try {
        console.log('Creating application_settings table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS application_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_updated_by_user
          FOREIGN KEY (updated_by) REFERENCES users(id)
          ON DELETE SET NULL
      );
    `);
        console.log('✓ application_settings table created');
        // Insert default settings
        console.log('Inserting default settings...');
        await client.query(`
      INSERT INTO application_settings (setting_key, setting_value, description)
      VALUES 
        ('international_timezone', 'America/New_York', 'Timezone for international clock display on home page')
      ON CONFLICT (setting_key) DO NOTHING;
    `);
        console.log('✓ Default settings inserted');
        console.log('✓ Application settings table setup complete!');
    }
    catch (error) {
        console.error('Error creating application_settings table:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if called directly
if (require.main === module) {
    createApplicationSettingsTable()
        .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
        .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}
exports.default = createApplicationSettingsTable;
