import { pool } from '../db'

/**
 * Railway Employee Portal Database Verification
 * 
 * This script verifies all employee portal tables exist and have correct structure.
 * Run after initRailwayEmployeePortal.ts to confirm everything is working.
 */

interface TableCheck {
  name: string
  description: string
  exists: boolean
  rowCount?: number
}

async function verifyRailwayEmployeePortal() {
  const client = await pool.connect()

  try {
    console.log('═══════════════════════════════════════════════════════')
    console.log('🔍 Railway Employee Portal Database Verification')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')

    // Check if payslips table exists to determine which tables are required
    const payslipsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payslips'
      )
    `)
    const hasPayslipsTable = payslipsCheck.rows[0].exists

    const tablesToCheck: TableCheck[] = [
      { name: 'employee_audit_log', description: 'Security audit trail', exists: false },
      { name: 'employee_notifications', description: 'Notification system', exists: false },
      { name: 'announcements', description: 'Company announcements', exists: false },
      { name: 'active_timers', description: 'Time tracking timers', exists: false },
      { name: 'employee_portal_settings', description: 'Privacy & preferences', exists: false },
      { name: 'employee_documents', description: 'Document management', exists: false }
    ]

    // Only check payslip tables if payslips table exists
    if (hasPayslipsTable) {
      tablesToCheck.push(
        { name: 'payslip_signatures', description: 'Payslip signatures', exists: false },
        { name: 'payslip_signature_tokens', description: 'Signature tokens', exists: false }
      )
    }

    // Check each table
    for (const table of tablesToCheck) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table.name])
        
        table.exists = result.rows[0].exists

        if (table.exists) {
          // Get row count
          const countResult = await client.query(`SELECT COUNT(*) FROM ${table.name}`)
          table.rowCount = parseInt(countResult.rows[0].count)
        }
      } catch (error) {
        console.error(`Error checking table ${table.name}:`, error)
        table.exists = false
      }
    }

    // Display results
    console.log('📊 Table Status:')
    console.log('')

    let allTablesExist = true
    for (const table of tablesToCheck) {
      const status = table.exists ? '✅' : '❌'
      const rowInfo = table.exists ? ` (${table.rowCount} rows)` : ''
      console.log(`${status} ${table.name.padEnd(30)} - ${table.description}${rowInfo}`)
      
      if (!table.exists) {
        allTablesExist = false
      }
    }

    console.log('')

    if (allTablesExist) {
      console.log('═══════════════════════════════════════════════════════')
      console.log('✅ ALL EMPLOYEE PORTAL TABLES VERIFIED!')
      console.log('═══════════════════════════════════════════════════════')
      console.log('')
      console.log('🎉 Your Railway Employee Portal database is ready to use!')
      console.log('')
    } else {
      console.log('═══════════════════════════════════════════════════════')
      console.log('❌ SOME TABLES ARE MISSING!')
      console.log('═══════════════════════════════════════════════════════')
      console.log('')
      console.log('Please run: npm run init:railway-portal')
      console.log('')
      throw new Error('Employee portal tables verification failed')
    }

    // Additional checks
    console.log('🔍 Additional Checks:')
    console.log('')

    // Check if time_entries table exists
    const timeEntriesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries'
      )
    `)
    
    if (timeEntriesCheck.rows[0].exists) {
      console.log('✅ time_entries table exists')
      
      // Check for total_hours column
      const columnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'time_entries'
          AND column_name = 'total_hours'
        )
      `)
      
      if (columnCheck.rows[0].exists) {
        console.log('✅ time_entries.total_hours column exists')
      } else {
        console.log('⚠️  time_entries.total_hours column missing (will cause errors)')
      }
    } else {
      console.log('❌ time_entries table missing')
    }

    // Check if employees table has tax_filing_status column
    const taxColumnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'employees'
        AND column_name = 'tax_filing_status'
      )
    `)
    
    if (taxColumnCheck.rows[0].exists) {
      console.log('✅ employees.tax_filing_status column exists')
    } else {
      console.log('⚠️  employees.tax_filing_status column missing')
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ Verification Complete!')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')

  } catch (error) {
    console.error('❌ Verification failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run verification
verifyRailwayEmployeePortal()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
