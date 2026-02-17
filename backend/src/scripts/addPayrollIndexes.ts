/**
 * Phase 10.3: Performance Optimization
 * Add database indexes for payroll tables to improve query performance
 */

import { pool } from '../db'

async function addPayrollIndexes() {
  console.log('🚀 Adding performance indexes to payroll tables...\n')

  try {
    // Payslips table indexes
    console.log('Adding indexes to payslips table...')
    
    // Index on employee_id for faster employee payslip lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslips_employee_id 
      ON payslips(employee_id)
    `)
    console.log('✓ Created index on payslips.employee_id')

    // Index on status for filtering by payslip status
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslips_status 
      ON payslips(status)
    `)
    console.log('✓ Created index on payslips.status')

    // Composite index on year and month for archive queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslips_year_month 
      ON payslips(payslip_year, payslip_month)
    `)
    console.log('✓ Created composite index on payslips.payslip_year, payslip_month')

    // Index on created_at for sorting
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslips_created_at 
      ON payslips(created_at DESC)
    `)
    console.log('✓ Created index on payslips.created_at')

    // Unique index to prevent duplicate payslips for same employee/month/year
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payslips_unique_employee_period 
      ON payslips(employee_id, payslip_year, payslip_month)
    `)
    console.log('✓ Created unique index on payslips(employee_id, payslip_year, payslip_month)')

    // Payslip signatures table indexes
    console.log('\nAdding indexes to payslip_signatures table...')
    
    // Index on payslip_id for faster signature lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslip_signatures_payslip_id 
      ON payslip_signatures(payslip_id)
    `)
    console.log('✓ Created index on payslip_signatures.payslip_id')

    // Index on signer_user_id to track who signed what
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslip_signatures_signer_user_id 
      ON payslip_signatures(signer_user_id)
    `)
    console.log('✓ Created index on payslip_signatures.signer_user_id')

    // Index on signed_at for audit trail queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslip_signatures_signed_at 
      ON payslip_signatures(signed_at DESC)
    `)
    console.log('✓ Created index on payslip_signatures.signed_at')

    // Employees table indexes (payroll-specific)
    console.log('\nAdding payroll-related indexes to employees table...')
    
    // Index on employee_department for department-wise reports
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_department 
      ON employees(employee_department)
    `)
    console.log('✓ Created index on employees.employee_department')

    // Index on epf_enabled for quick filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_epf_enabled 
      ON employees(epf_enabled)
    `)
    console.log('✓ Created index on employees.epf_enabled')

    // Index on etf_enabled for quick filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_etf_enabled 
      ON employees(etf_enabled)
    `)
    console.log('✓ Created index on employees.etf_enabled')

    // Payslip documents table indexes (if using)
    console.log('\nAdding indexes to payslip_documents table...')
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslip_documents_payslip_id 
      ON payslip_documents(payslip_id)
    `)
    console.log('✓ Created index on payslip_documents.payslip_id')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslip_documents_generated_at 
      ON payslip_documents(generated_at DESC)
    `)
    console.log('✓ Created index on payslip_documents.generated_at')

    console.log('\n✅ All payroll performance indexes created successfully!')
    console.log('\n📊 Performance improvements:')
    console.log('   - Faster employee payslip lookups')
    console.log('   - Improved archive browsing by year/month')
    console.log('   - Quicker status-based filtering')
    console.log('   - Enhanced signature audit trail queries')
    console.log('   - Better department-wise reporting')
    
  } catch (error) {
    console.error('❌ Error adding indexes:', error)
    throw error
  } finally {
    await pool.end()
  }
}

addPayrollIndexes()
