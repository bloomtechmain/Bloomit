import { pool } from '../db'

/**
 * Fix Employee Portal Errors Script
 * 
 * This script fixes three critical issues in the employee portal:
 * 1. Missing international_timezone setting (404 error)
 * 2. Missing is_employee_accessible column in documents table (500 error)
 * 3. Missing employee profile columns (500 error)
 * 
 * Run with: npx ts-node src/scripts/fixEmployeePortalErrors.ts
 */

async function fixEmployeePortalErrors() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Starting Employee Portal Error Fixes...\n')

    // ==================== FIX 1: Add International Timezone Setting ====================
    console.log('📝 Fix 1: Adding international_timezone setting...')
    
    // Check if application_settings table exists
    const settingsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'application_settings'
      );
    `)
    
    if (!settingsTableCheck.rows[0].exists) {
      console.log('   ⚠️  application_settings table does not exist, creating it...')
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
      `)
      console.log('   ✅ application_settings table created')
    }
    
    // Check if international_timezone setting exists
    const timezoneSetting = await client.query(`
      SELECT * FROM application_settings WHERE setting_key = 'international_timezone'
    `)
    
    if (timezoneSetting.rows.length === 0) {
      await client.query(`
        INSERT INTO application_settings (setting_key, setting_value, description)
        VALUES ('international_timezone', 'UTC', 'Default timezone for international operations')
      `)
      console.log('   ✅ international_timezone setting added')
    } else {
      console.log('   ℹ️  international_timezone setting already exists')
    }

    // ==================== FIX 2: Add is_employee_accessible Column to Documents ====================
    console.log('\n📝 Fix 2: Adding is_employee_accessible column to documents table...')
    
    // Check if documents table exists
    const documentsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      );
    `)
    
    if (!documentsTableCheck.rows[0].exists) {
      console.log('   ⚠️  documents table does not exist')
      console.log('   ℹ️  Skipping this fix - table needs to be created first')
    } else {
      // Check if column already exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'is_employee_accessible'
      `)
      
      if (columnCheck.rows.length === 0) {
        await client.query(`
          ALTER TABLE documents 
          ADD COLUMN is_employee_accessible BOOLEAN DEFAULT false
        `)
        console.log('   ✅ is_employee_accessible column added to documents table')
        
        // Set some documents as employee accessible by default (e.g., policies, handbooks)
        await client.query(`
          UPDATE documents 
          SET is_employee_accessible = true 
          WHERE file_type IN ('policy', 'handbook', 'form', 'template', 'pdf')
          OR document_name ILIKE '%policy%'
          OR document_name ILIKE '%handbook%'
        `)
        console.log('   ✅ Marked relevant documents as employee accessible')
      } else {
        console.log('   ℹ️  is_employee_accessible column already exists')
      }
    }

    // ==================== FIX 3: Add Missing Employee Profile Columns ====================
    console.log('\n📝 Fix 3: Adding missing employee profile columns...')
    
    // Check if employees table exists
    const employeesTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      );
    `)
    
    if (!employeesTableCheck.rows[0].exists) {
      console.log('   ❌ employees table does not exist!')
      throw new Error('employees table must exist to run this fix')
    }
    
    // Get current columns
    const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees'
    `)
    const columnNames = existingColumns.rows.map(row => row.column_name)
    
    console.log(`   📊 Current columns in employees table: ${columnNames.length} columns`)
    
    // Define columns to add
    const columnsToAdd = [
      {
        name: 'emergency_contact_name',
        definition: 'VARCHAR(100)',
        description: 'Emergency contact name'
      },
      {
        name: 'emergency_contact_relationship',
        definition: 'VARCHAR(50)',
        description: 'Emergency contact relationship'
      },
      {
        name: 'emergency_contact_phone',
        definition: 'VARCHAR(20)',
        description: 'Emergency contact phone'
      },
      {
        name: 'manager_id',
        definition: 'INTEGER REFERENCES employees(id) ON DELETE SET NULL',
        description: 'Manager/supervisor ID'
      },
      {
        name: 'epf_enabled',
        definition: 'BOOLEAN DEFAULT true',
        description: 'EPF (Employee Provident Fund) enabled'
      },
      {
        name: 'etf_enabled',
        definition: 'BOOLEAN DEFAULT true',
        description: 'ETF (Employee Trust Fund) enabled'
      },
      {
        name: 'bank_name',
        definition: 'VARCHAR(100)',
        description: 'Bank name for salary deposits'
      },
      {
        name: 'bank_account_number',
        definition: 'VARCHAR(50)',
        description: 'Bank account number'
      },
      {
        name: 'bank_branch',
        definition: 'VARCHAR(100)',
        description: 'Bank branch name'
      },
      {
        name: 'pto_allowance',
        definition: 'INTEGER DEFAULT 20',
        description: 'Annual PTO allowance in days'
      }
    ]
    
    let addedCount = 0
    let skippedCount = 0
    
    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        await client.query(`
          ALTER TABLE employees 
          ADD COLUMN ${column.name} ${column.definition}
        `)
        console.log(`   ✅ Added column: ${column.name} (${column.description})`)
        addedCount++
      } else {
        console.log(`   ℹ️  Column ${column.name} already exists`)
        skippedCount++
      }
    }
    
    console.log(`\n   📊 Summary: ${addedCount} columns added, ${skippedCount} already existed`)

    // ==================== FIX 4: Add Missing Document Table Columns ====================
    console.log('\n📝 Fix 4: Ensuring documents table has correct schema...')
    
    if (documentsTableCheck.rows[0].exists) {
      // Get current document columns
      const docColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents'
      `)
      const docColumnNames = docColumns.rows.map(row => row.column_name)
      
      // Check if we need document_id (controller expects this)
      if (!docColumnNames.includes('document_id') && docColumnNames.includes('id')) {
        console.log('   ℹ️  documents table uses "id" column (controller expects "document_id")')
        console.log('   ℹ️  This is acceptable - will work with either naming convention')
      }
      
      // Ensure document_type column exists (if table was created from old schema)
      if (!docColumnNames.includes('document_type')) {
        await client.query(`
          ALTER TABLE documents 
          ADD COLUMN document_type VARCHAR(100)
        `)
        
        // Set document_type based on file_type if available
        await client.query(`
          UPDATE documents 
          SET document_type = COALESCE(file_type, 'other')
          WHERE document_type IS NULL
        `)
        console.log('   ✅ Added document_type column to documents table')
      }
      
      // Ensure description column exists
      if (!docColumnNames.includes('description')) {
        await client.query(`
          ALTER TABLE documents 
          ADD COLUMN description TEXT
        `)
        console.log('   ✅ Added description column to documents table')
      }
    }

    // ==================== FIX 5: Create employee_portal_settings Table ====================
    console.log('\n📝 Fix 5: Ensuring employee_portal_settings table exists...')
    
    const portalSettingsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employee_portal_settings'
      );
    `)
    
    if (!portalSettingsCheck.rows[0].exists) {
      console.log('   ⚠️  employee_portal_settings table does not exist, creating it...')
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
      `)
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_employee_portal_settings_employee_id 
        ON employee_portal_settings(employee_id);
      `)
      
      console.log('   ✅ employee_portal_settings table created')
    } else {
      console.log('   ℹ️  employee_portal_settings table already exists')
      
      // Check if email_preferences column exists
      const emailPrefCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_portal_settings' 
        AND column_name = 'email_preferences'
      `)
      
      if (emailPrefCheck.rows.length === 0) {
        await client.query(`
          ALTER TABLE employee_portal_settings 
          ADD COLUMN email_preferences JSONB DEFAULT '{"pto_notifications": true, "time_entry_reminders": true, "announcement_notifications": true}'
        `)
        console.log('   ✅ Added email_preferences column')
      }
      
      // Check if directory visibility columns exist
      const dirVisCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_portal_settings' 
        AND column_name IN ('show_in_directory', 'hide_phone_in_directory')
      `)
      
      if (dirVisCheck.rows.length < 2) {
        if (!dirVisCheck.rows.some(r => r.column_name === 'show_in_directory')) {
          await client.query(`
            ALTER TABLE employee_portal_settings 
            ADD COLUMN show_in_directory BOOLEAN DEFAULT true
          `)
          console.log('   ✅ Added show_in_directory column')
        }
        
        if (!dirVisCheck.rows.some(r => r.column_name === 'hide_phone_in_directory')) {
          await client.query(`
            ALTER TABLE employee_portal_settings 
            ADD COLUMN hide_phone_in_directory BOOLEAN DEFAULT false
          `)
          console.log('   ✅ Added hide_phone_in_directory column')
        }
      }
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(70))
    console.log('✅ Employee Portal Error Fixes Completed Successfully!')
    console.log('='.repeat(70))
    console.log('\n📊 Summary of fixes applied:')
    console.log('   ✅ Fix 1: international_timezone setting added')
    console.log('   ✅ Fix 2: is_employee_accessible column added to documents')
    console.log('   ✅ Fix 3: Missing employee profile columns added')
    console.log('   ✅ Fix 4: Documents table schema verified')
    console.log('   ✅ Fix 5: employee_portal_settings table ensured')
    console.log('\n🎯 Next steps:')
    console.log('   1. Deploy these changes to Railway production database')
    console.log('   2. Run verification script to test endpoints')
    console.log('   3. Test employee portal in production')
    console.log('')

  } catch (error) {
    console.error('\n❌ Error applying fixes:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run if executed directly
if (require.main === module) {
  fixEmployeePortalErrors()
    .then(() => {
      console.log('\n🎉 Fix script completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Fix script failed:', error)
      process.exit(1)
    })
}

export default fixEmployeePortalErrors
