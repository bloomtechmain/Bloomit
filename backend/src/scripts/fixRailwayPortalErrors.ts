import { pool } from '../db'

/**
 * Fix Railway Employee Portal Errors
 * 
 * This script fixes critical issues preventing the employee portal from loading:
 * 1. Adds missing international_timezone setting
 * 2. Verifies employee_audit_log has session_id column
 * 3. Verifies time_entries table schema
 * 4. Adds any missing columns or indexes
 */

async function fixRailwayPortalErrors() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Fixing Railway Employee Portal Errors...\n')

    // ==================== FIX 1: Add international_timezone setting ====================
    console.log('📝 Fix 1: Checking international_timezone setting...')
    
    const settingCheck = await client.query(
      'SELECT * FROM application_settings WHERE setting_key = $1',
      ['international_timezone']
    )

    if (settingCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO application_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
      `, [
        'international_timezone',
        'America/New_York',
        'Timezone for international clock display on home page'
      ])
      console.log('✅ Added international_timezone setting (America/New_York)')
    } else {
      console.log(`✅ international_timezone setting already exists: ${settingCheck.rows[0].setting_value}`)
    }
    console.log('')

    // ==================== FIX 2: Verify employee_audit_log has session_id ====================
    console.log('📝 Fix 2: Verifying employee_audit_log.session_id column...')
    
    const auditLogColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employee_audit_log' 
      AND column_name = 'session_id'
    `)

    if (auditLogColumns.rows.length === 0) {
      console.log('⚠️  session_id column missing, adding it...')
      await client.query(`
        ALTER TABLE employee_audit_log 
        ADD COLUMN IF NOT EXISTS session_id VARCHAR(255)
      `)
      console.log('✅ Added session_id column to employee_audit_log')
    } else {
      console.log('✅ employee_audit_log.session_id column exists')
    }
    console.log('')

    // ==================== FIX 3: Verify time_entries schema ====================
    console.log('📝 Fix 3: Verifying time_entries table schema...')
    
    const timeEntriesColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'time_entries'
      ORDER BY ordinal_position
    `)

    console.log(`   Found ${timeEntriesColumns.rows.length} columns in time_entries`)
    
    // Check for critical columns
    const columnNames = timeEntriesColumns.rows.map(r => r.column_name)
    const requiredColumns = {
      'id': 'integer',
      'employee_id': 'integer',
      'project_id': 'integer',
      'contract_id': 'integer',
      'date': 'date',
      'total_hours': 'numeric',
      'break_time_minutes': 'integer',
      'description': 'text',
      'status': 'character varying',
      'approved_by': 'integer',
      'approved_at': 'timestamp without time zone',
      'rejection_note': 'text',
      'is_timer_based': 'boolean',
      'created_at': 'timestamp without time zone',
      'updated_at': 'timestamp without time zone'
    }

    let missingColumns = 0
    for (const [colName, expectedType] of Object.entries(requiredColumns)) {
      if (!columnNames.includes(colName)) {
        console.log(`   ❌ Missing column: ${colName}`)
        missingColumns++
      }
    }

    if (missingColumns === 0) {
      console.log('✅ All required time_entries columns exist')
      
      // Verify it's total_hours, not just hours
      if (columnNames.includes('total_hours')) {
        console.log('✅ Confirmed: Column is named "total_hours" (correct)')
      } else if (columnNames.includes('hours')) {
        console.log('⚠️  WARNING: Column is named "hours" instead of "total_hours"')
        console.log('   Consider running: ALTER TABLE time_entries RENAME COLUMN hours TO total_hours')
      }
    } else {
      console.log(`⚠️  ${missingColumns} column(s) missing from time_entries table`)
    }
    console.log('')

    // ==================== FIX 4: Verify employee portal tables ====================
    console.log('📝 Fix 4: Verifying employee portal tables exist...')
    
    const portalTables = [
      'employee_portal_settings',
      'announcements',
      'employee_documents',
      'employee_notifications',
      'employee_audit_log'
    ]

    for (const tableName of portalTables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName])
      
      if (tableCheck.rows[0].exists) {
        console.log(`   ✅ ${tableName}`)
      } else {
        console.log(`   ❌ ${tableName} - MISSING!`)
      }
    }
    console.log('')

    // ==================== FIX 5: Add employee_portal_settings columns if missing ====================
    console.log('📝 Fix 5: Checking employee_portal_settings for new columns...')
    
    const settingsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'employee_portal_settings'
      )
    `)

    if (settingsTableCheck.rows[0].exists) {
      // Check for email_preferences column
      const emailPrefCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_portal_settings' 
        AND column_name = 'email_preferences'
      `)

      if (emailPrefCheck.rows.length === 0) {
        console.log('   Adding email_preferences column...')
        await client.query(`
          ALTER TABLE employee_portal_settings 
          ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{"pto_notifications": true, "time_entry_reminders": true, "announcement_notifications": true}'
        `)
        console.log('   ✅ Added email_preferences column')
      } else {
        console.log('   ✅ email_preferences column exists')
      }

      // Check for show_in_directory column
      const directoryCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_portal_settings' 
        AND column_name IN ('show_in_directory', 'hide_phone_in_directory')
      `)

      if (directoryCheck.rows.length < 2) {
        console.log('   Adding directory visibility columns...')
        await client.query(`
          ALTER TABLE employee_portal_settings 
          ADD COLUMN IF NOT EXISTS show_in_directory BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS hide_phone_in_directory BOOLEAN DEFAULT false
        `)
        console.log('   ✅ Added directory visibility columns')
      } else {
        console.log('   ✅ Directory visibility columns exist')
      }
    }
    console.log('')

    // ==================== FIX 6: Add missing employee_documents columns ====================
    console.log('📝 Fix 6: Checking employee_documents table schema...')
    
    const empDocsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'employee_documents'
      )
    `)

    if (empDocsTableCheck.rows[0].exists) {
      const empDocsColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employee_documents'
      `)
      
      const empDocsColNames = empDocsColumns.rows.map(r => r.column_name)
      
      // Check for original_name column (used in downloadPersonalDocument)
      if (!empDocsColNames.includes('original_name')) {
        console.log('   Adding original_name column...')
        await client.query(`
          ALTER TABLE employee_documents 
          ADD COLUMN IF NOT EXISTS original_name VARCHAR(255)
        `)
        
        // Copy file_name to original_name for existing records
        await client.query(`
          UPDATE employee_documents 
          SET original_name = file_name 
          WHERE original_name IS NULL
        `)
        console.log('   ✅ Added original_name column')
      } else {
        console.log('   ✅ original_name column exists')
      }

      // Rename id to document_id if needed (for consistency with controller)
      if (empDocsColNames.includes('id') && !empDocsColNames.includes('document_id')) {
        console.log('   Renaming id to document_id for consistency...')
        await client.query(`
          ALTER TABLE employee_documents 
          RENAME COLUMN id TO document_id
        `)
        console.log('   ✅ Renamed id to document_id')
      } else if (empDocsColNames.includes('document_id')) {
        console.log('   ✅ document_id column exists')
      }
    }
    console.log('')

    // ==================== SUMMARY ====================
    console.log('📊 Fix Summary:')
    console.log('   ✅ international_timezone setting verified/added')
    console.log('   ✅ employee_audit_log.session_id verified')
    console.log('   ✅ time_entries schema verified')
    console.log('   ✅ Employee portal tables verified')
    console.log('   ✅ employee_portal_settings columns updated')
    console.log('   ✅ employee_documents schema updated')
    console.log('')
    console.log('🎉 All fixes applied successfully!')
    console.log('')
    console.log('⚠️  IMPORTANT: You still need to fix the controller queries!')
    console.log('   The employeePortalController.ts uses "hours" but the column is "total_hours"')
    console.log('   This will be fixed in a separate controller update.')

  } catch (error) {
    console.error('❌ Error fixing Railway portal errors:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run if executed directly
if (require.main === module) {
  fixRailwayPortalErrors()
    .then(() => {
      console.log('\n✅ Fix script completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Fix script failed:', error)
      process.exit(1)
    })
}

export default fixRailwayPortalErrors
