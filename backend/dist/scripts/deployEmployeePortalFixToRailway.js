"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
/**
 * Deploy Employee Portal Fix to Railway Production
 *
 * This script is designed to run on Railway production environment
 * It applies all necessary database schema fixes for the employee portal
 *
 * IMPORTANT: This should be run via Railway CLI or as a one-time deployment
 *
 * Run with: railway run npx ts-node src/scripts/deployEmployeePortalFixToRailway.ts
 */
async function deployEmployeePortalFixToRailway() {
    const client = await db_1.pool.connect();
    const startTime = Date.now();
    try {
        console.log('🚀 Deploying Employee Portal Fixes to Railway Production...\n');
        console.log('📅 Timestamp:', new Date().toISOString());
        console.log('🌍 Environment:', process.env.NODE_ENV || 'production');
        console.log('='.repeat(70));
        // Check database connection
        console.log('\n🔌 Testing database connection...');
        const dbTest = await client.query('SELECT NOW() as current_time');
        console.log(`✅ Connected to database at: ${dbTest.rows[0].current_time}`);
        // ==================== FIX 1: Application Settings ====================
        console.log('\n📝 [1/5] Adding application settings...');
        const settingsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'application_settings'
      );
    `);
        if (!settingsTableCheck.rows[0].exists) {
            console.log('   Creating application_settings table...');
            await client.query(`
        CREATE TABLE application_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT,
          description TEXT,
          updated_by INTEGER,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
            console.log('   ✅ Table created');
        }
        const timezoneSetting = await client.query(`
      SELECT * FROM application_settings WHERE setting_key = 'international_timezone'
    `);
        if (timezoneSetting.rows.length === 0) {
            await client.query(`
        INSERT INTO application_settings (setting_key, setting_value, description)
        VALUES ('international_timezone', 'UTC', 'Default timezone for international operations')
      `);
            console.log('   ✅ international_timezone setting added');
        }
        else {
            console.log('   ℹ️  Setting already exists');
        }
        // ==================== FIX 2: Documents Table ====================
        console.log('\n📝 [2/5] Updating documents table schema...');
        const documentsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      );
    `);
        if (documentsTableCheck.rows[0].exists) {
            const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents'
      `);
            const existingColumns = columnCheck.rows.map(row => row.column_name);
            if (!existingColumns.includes('is_employee_accessible')) {
                await client.query(`
          ALTER TABLE documents 
          ADD COLUMN is_employee_accessible BOOLEAN DEFAULT false
        `);
                console.log('   ✅ Added is_employee_accessible column');
                await client.query(`
          UPDATE documents 
          SET is_employee_accessible = true 
          WHERE file_type IN ('policy', 'handbook', 'form', 'template', 'pdf')
          OR document_name ILIKE '%policy%'
          OR document_name ILIKE '%handbook%'
        `);
                console.log('   ✅ Marked relevant documents as accessible');
            }
            else {
                console.log('   ℹ️  Column already exists');
            }
            if (!existingColumns.includes('document_type')) {
                await client.query(`
          ALTER TABLE documents 
          ADD COLUMN document_type VARCHAR(100)
        `);
                await client.query(`
          UPDATE documents 
          SET document_type = COALESCE(file_type, 'other')
          WHERE document_type IS NULL
        `);
                console.log('   ✅ Added document_type column');
            }
            if (!existingColumns.includes('description')) {
                await client.query(`
          ALTER TABLE documents 
          ADD COLUMN description TEXT
        `);
                console.log('   ✅ Added description column');
            }
        }
        else {
            console.log('   ⚠️  Documents table does not exist - skipping');
        }
        // ==================== FIX 3: Employees Table ====================
        console.log('\n📝 [3/5] Adding employee profile columns...');
        const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees'
    `);
        const columnNames = existingColumns.rows.map(row => row.column_name);
        const columnsToAdd = [
            { name: 'emergency_contact_name', definition: 'VARCHAR(100)' },
            { name: 'emergency_contact_relationship', definition: 'VARCHAR(50)' },
            { name: 'emergency_contact_phone', definition: 'VARCHAR(20)' },
            { name: 'manager_id', definition: 'INTEGER REFERENCES employees(id) ON DELETE SET NULL' },
            { name: 'epf_enabled', definition: 'BOOLEAN DEFAULT true' },
            { name: 'etf_enabled', definition: 'BOOLEAN DEFAULT true' },
            { name: 'bank_name', definition: 'VARCHAR(100)' },
            { name: 'bank_account_number', definition: 'VARCHAR(50)' },
            { name: 'bank_branch', definition: 'VARCHAR(100)' },
            { name: 'pto_allowance', definition: 'INTEGER DEFAULT 20' }
        ];
        let addedCount = 0;
        for (const column of columnsToAdd) {
            if (!columnNames.includes(column.name)) {
                await client.query(`
          ALTER TABLE employees 
          ADD COLUMN ${column.name} ${column.definition}
        `);
                console.log(`   ✅ Added: ${column.name}`);
                addedCount++;
            }
        }
        if (addedCount > 0) {
            console.log(`   📊 Added ${addedCount} columns`);
        }
        else {
            console.log('   ℹ️  All columns already exist');
        }
        // ==================== FIX 4: Employee Portal Settings Table ====================
        console.log('\n📝 [4/5] Ensuring employee_portal_settings table...');
        const portalSettingsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employee_portal_settings'
      );
    `);
        if (!portalSettingsCheck.rows[0].exists) {
            await client.query(`
        CREATE TABLE employee_portal_settings (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          email_preferences JSONB DEFAULT '{"pto_notifications": true, "time_entry_reminders": true, "announcement_notifications": true}',
          show_in_directory BOOLEAN DEFAULT true,
          hide_phone_in_directory BOOLEAN DEFAULT false,
          theme VARCHAR(20) DEFAULT 'light',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_employee_portal_settings_employee_id 
        ON employee_portal_settings(employee_id);
      `);
            console.log('   ✅ Table created with indexes');
        }
        else {
            const settingsColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_portal_settings'
      `);
            const settingsColumnNames = settingsColumns.rows.map(row => row.column_name);
            if (!settingsColumnNames.includes('email_preferences')) {
                await client.query(`
          ALTER TABLE employee_portal_settings 
          ADD COLUMN email_preferences JSONB DEFAULT '{"pto_notifications": true, "time_entry_reminders": true, "announcement_notifications": true}'
        `);
                console.log('   ✅ Added email_preferences');
            }
            if (!settingsColumnNames.includes('show_in_directory')) {
                await client.query(`
          ALTER TABLE employee_portal_settings 
          ADD COLUMN show_in_directory BOOLEAN DEFAULT true
        `);
                console.log('   ✅ Added show_in_directory');
            }
            if (!settingsColumnNames.includes('hide_phone_in_directory')) {
                await client.query(`
          ALTER TABLE employee_portal_settings 
          ADD COLUMN hide_phone_in_directory BOOLEAN DEFAULT false
        `);
                console.log('   ✅ Added hide_phone_in_directory');
            }
            if (settingsColumnNames.includes('email_preferences') &&
                settingsColumnNames.includes('show_in_directory') &&
                settingsColumnNames.includes('hide_phone_in_directory')) {
                console.log('   ℹ️  All columns already exist');
            }
        }
        // ==================== FIX 5: Verification ====================
        console.log('\n📝 [5/5] Running verification checks...');
        const verificationChecks = [
            {
                name: 'international_timezone setting',
                query: "SELECT * FROM application_settings WHERE setting_key = 'international_timezone'"
            },
            {
                name: 'documents.is_employee_accessible column',
                query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_employee_accessible'"
            },
            {
                name: 'employees.manager_id column',
                query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'manager_id'"
            },
            {
                name: 'employee_portal_settings table',
                query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_portal_settings')"
            }
        ];
        let verificationPassed = true;
        for (const check of verificationChecks) {
            const result = await client.query(check.query);
            if (result.rows.length > 0 && (result.rows[0].exists !== false)) {
                console.log(`   ✅ ${check.name}`);
            }
            else {
                console.log(`   ❌ ${check.name}`);
                verificationPassed = false;
            }
        }
        // ==================== SUMMARY ====================
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log('\n' + '='.repeat(70));
        if (verificationPassed) {
            console.log('✅ DEPLOYMENT SUCCESSFUL!');
        }
        else {
            console.log('⚠️  DEPLOYMENT COMPLETED WITH WARNINGS');
        }
        console.log('='.repeat(70));
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log('📅 Completed:', new Date().toISOString());
        console.log('\n🎯 Next steps:');
        console.log('   1. Test the employee portal endpoints');
        console.log('   2. Monitor logs for any errors');
        console.log('   3. Verify that employee ID 11 can access their profile');
        console.log('');
        return { success: verificationPassed, duration };
    }
    catch (error) {
        console.error('\n❌ DEPLOYMENT FAILED!');
        console.error('='.repeat(70));
        console.error('Error:', error);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   1. Check database connection string');
        console.error('   2. Verify database credentials');
        console.error('   3. Check Railway logs for more details');
        console.error('   4. Try running the script again');
        console.error('');
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    deployEmployeePortalFixToRailway()
        .then((result) => {
        if (result.success) {
            console.log('✅ Deployment script completed successfully!');
            process.exit(0);
        }
        else {
            console.log('⚠️  Deployment completed with warnings');
            process.exit(0);
        }
    })
        .catch((error) => {
        console.error('❌ Deployment script failed:', error);
        process.exit(1);
    });
}
exports.default = deployEmployeePortalFixToRailway;
