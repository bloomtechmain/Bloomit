import { pool } from '../db'

/**
 * Verify Employee Portal Fix Script
 * 
 * This script verifies that all fixes have been properly applied:
 * 1. Checks if international_timezone setting exists
 * 2. Checks if documents table has is_employee_accessible column
 * 3. Checks if employees table has all required profile columns
 * 4. Checks if employee_portal_settings table exists
 * 
 * Run with: npx ts-node src/scripts/verifyEmployeePortalFix.ts
 */

interface VerificationResult {
  check: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  message: string
}

async function verifyEmployeePortalFix() {
  const client = await pool.connect()
  const results: VerificationResult[] = []
  
  try {
    console.log('🔍 Verifying Employee Portal Fixes...\n')
    console.log('='.repeat(70))

    // ==================== VERIFICATION 1: International Timezone Setting ====================
    console.log('\n📋 Check 1: International Timezone Setting')
    console.log('-'.repeat(70))
    
    try {
      const settingCheck = await client.query(`
        SELECT * FROM application_settings WHERE setting_key = 'international_timezone'
      `)
      
      if (settingCheck.rows.length > 0) {
        const setting = settingCheck.rows[0]
        console.log('✅ PASS: international_timezone setting exists')
        console.log(`   Value: ${setting.setting_value}`)
        console.log(`   Description: ${setting.description || 'N/A'}`)
        results.push({
          check: 'International Timezone Setting',
          status: 'PASS',
          message: `Setting exists with value: ${setting.setting_value}`
        })
      } else {
        console.log('❌ FAIL: international_timezone setting not found')
        results.push({
          check: 'International Timezone Setting',
          status: 'FAIL',
          message: 'Setting does not exist in application_settings table'
        })
      }
    } catch (error) {
      console.log('❌ FAIL: Error checking setting')
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({
        check: 'International Timezone Setting',
        status: 'FAIL',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // ==================== VERIFICATION 2: Documents Table Schema ====================
    console.log('\n📋 Check 2: Documents Table Schema')
    console.log('-'.repeat(70))
    
    try {
      const documentsTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'documents'
        );
      `)
      
      if (documentsTableCheck.rows[0].exists) {
        // Check for required columns
        const requiredColumns = ['is_employee_accessible', 'document_type', 'description']
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'documents'
        `)
        
        const existingColumns = columnCheck.rows.map(row => row.column_name)
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
        
        if (missingColumns.length === 0) {
          console.log('✅ PASS: All required columns exist in documents table')
          console.log(`   Columns verified: ${requiredColumns.join(', ')}`)
          
          // Check if any documents are marked as employee accessible
          const accessibleDocsCount = await client.query(`
            SELECT COUNT(*) as count FROM documents WHERE is_employee_accessible = true
          `)
          console.log(`   Employee accessible documents: ${accessibleDocsCount.rows[0].count}`)
          
          results.push({
            check: 'Documents Table Schema',
            status: 'PASS',
            message: `All required columns exist. ${accessibleDocsCount.rows[0].count} documents are employee accessible.`
          })
        } else {
          console.log('❌ FAIL: Missing columns in documents table')
          console.log(`   Missing: ${missingColumns.join(', ')}`)
          results.push({
            check: 'Documents Table Schema',
            status: 'FAIL',
            message: `Missing columns: ${missingColumns.join(', ')}`
          })
        }
      } else {
        console.log('⚠️  WARNING: documents table does not exist')
        results.push({
          check: 'Documents Table Schema',
          status: 'WARNING',
          message: 'Documents table does not exist'
        })
      }
    } catch (error) {
      console.log('❌ FAIL: Error checking documents table')
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({
        check: 'Documents Table Schema',
        status: 'FAIL',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // ==================== VERIFICATION 3: Employees Table Profile Columns ====================
    console.log('\n📋 Check 3: Employees Table Profile Columns')
    console.log('-'.repeat(70))
    
    try {
      const requiredColumns = [
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_phone',
        'manager_id',
        'epf_enabled',
        'etf_enabled',
        'bank_name',
        'bank_account_number',
        'bank_branch',
        'pto_allowance'
      ]
      
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'employees'
      `)
      
      const existingColumns = columnCheck.rows.map(row => row.column_name)
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
      
      if (missingColumns.length === 0) {
        console.log('✅ PASS: All required profile columns exist in employees table')
        console.log(`   Total columns verified: ${requiredColumns.length}`)
        console.log('   Columns: ' + requiredColumns.join(', '))
        
        results.push({
          check: 'Employees Table Profile Columns',
          status: 'PASS',
          message: `All ${requiredColumns.length} required columns exist`
        })
      } else {
        console.log('❌ FAIL: Missing columns in employees table')
        console.log(`   Missing ${missingColumns.length} columns:`)
        missingColumns.forEach(col => console.log(`     - ${col}`))
        
        results.push({
          check: 'Employees Table Profile Columns',
          status: 'FAIL',
          message: `Missing ${missingColumns.length} columns: ${missingColumns.join(', ')}`
        })
      }
    } catch (error) {
      console.log('❌ FAIL: Error checking employees table')
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({
        check: 'Employees Table Profile Columns',
        status: 'FAIL',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // ==================== VERIFICATION 4: Employee Portal Settings Table ====================
    console.log('\n📋 Check 4: Employee Portal Settings Table')
    console.log('-'.repeat(70))
    
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'employee_portal_settings'
        );
      `)
      
      if (tableCheck.rows[0].exists) {
        // Check for required columns
        const requiredColumns = ['email_preferences', 'show_in_directory', 'hide_phone_in_directory']
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'employee_portal_settings'
        `)
        
        const existingColumns = columnCheck.rows.map(row => row.column_name)
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
        
        if (missingColumns.length === 0) {
          console.log('✅ PASS: employee_portal_settings table exists with all required columns')
          console.log(`   Columns verified: ${requiredColumns.join(', ')}`)
          
          // Check record count
          const recordCount = await client.query(`
            SELECT COUNT(*) as count FROM employee_portal_settings
          `)
          console.log(`   Settings records: ${recordCount.rows[0].count}`)
          
          results.push({
            check: 'Employee Portal Settings Table',
            status: 'PASS',
            message: `Table exists with all required columns. ${recordCount.rows[0].count} records found.`
          })
        } else {
          console.log('⚠️  WARNING: employee_portal_settings table missing some columns')
          console.log(`   Missing: ${missingColumns.join(', ')}`)
          results.push({
            check: 'Employee Portal Settings Table',
            status: 'WARNING',
            message: `Missing columns: ${missingColumns.join(', ')}`
          })
        }
      } else {
        console.log('❌ FAIL: employee_portal_settings table does not exist')
        results.push({
          check: 'Employee Portal Settings Table',
          status: 'FAIL',
          message: 'Table does not exist'
        })
      }
    } catch (error) {
      console.log('❌ FAIL: Error checking employee_portal_settings table')
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({
        check: 'Employee Portal Settings Table',
        status: 'FAIL',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // ==================== VERIFICATION 5: Test Employee Record ====================
    console.log('\n📋 Check 5: Test Employee Record (Employee ID 11)')
    console.log('-'.repeat(70))
    
    try {
      const employeeCheck = await client.query(`
        SELECT id, first_name, last_name, email, 
               emergency_contact_name, manager_id, epf_enabled, 
               bank_name, pto_allowance
        FROM employees 
        WHERE id = 11
      `)
      
      if (employeeCheck.rows.length > 0) {
        const emp = employeeCheck.rows[0]
        console.log('✅ PASS: Employee ID 11 exists and is queryable')
        console.log(`   Name: ${emp.first_name} ${emp.last_name}`)
        console.log(`   Email: ${emp.email}`)
        console.log(`   Emergency Contact: ${emp.emergency_contact_name || 'Not set'}`)
        console.log(`   Manager ID: ${emp.manager_id || 'Not set'}`)
        console.log(`   EPF Enabled: ${emp.epf_enabled !== null ? emp.epf_enabled : 'Not set'}`)
        console.log(`   Bank: ${emp.bank_name || 'Not set'}`)
        console.log(`   PTO Allowance: ${emp.pto_allowance || 20} days`)
        
        results.push({
          check: 'Test Employee Record (ID 11)',
          status: 'PASS',
          message: `Employee record accessible with all profile fields`
        })
      } else {
        console.log('⚠️  WARNING: Employee ID 11 not found')
        console.log('   This is the employee from the error logs')
        results.push({
          check: 'Test Employee Record (ID 11)',
          status: 'WARNING',
          message: 'Employee ID 11 not found in database'
        })
      }
    } catch (error) {
      console.log('❌ FAIL: Error querying employee record')
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({
        check: 'Test Employee Record (ID 11)',
        status: 'FAIL',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(70))
    console.log('📊 VERIFICATION SUMMARY')
    console.log('='.repeat(70))
    
    const passCount = results.filter(r => r.status === 'PASS').length
    const failCount = results.filter(r => r.status === 'FAIL').length
    const warnCount = results.filter(r => r.status === 'WARNING').length
    
    console.log(`\n✅ Passed: ${passCount}`)
    console.log(`❌ Failed: ${failCount}`)
    console.log(`⚠️  Warnings: ${warnCount}`)
    console.log(`📋 Total Checks: ${results.length}`)
    
    console.log('\nDetailed Results:')
    results.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'
      console.log(`${index + 1}. ${icon} ${result.check}`)
      console.log(`   ${result.message}`)
    })
    
    if (failCount === 0) {
      console.log('\n🎉 All critical checks passed!')
      console.log('✅ Employee portal should now work correctly')
      
      if (warnCount > 0) {
        console.log('\n⚠️  Note: Some warnings were detected, but they may not affect functionality')
      }
    } else {
      console.log('\n❌ Some checks failed - please run the fix script:')
      console.log('   npx ts-node src/scripts/fixEmployeePortalErrors.ts')
    }
    
    console.log('')
    return { passCount, failCount, warnCount, results }

  } catch (error) {
    console.error('\n❌ Verification error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run if executed directly
if (require.main === module) {
  verifyEmployeePortalFix()
    .then((summary) => {
      if (summary.failCount === 0) {
        console.log('✅ Verification completed successfully!')
        process.exit(0)
      } else {
        console.log('❌ Verification found issues')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error)
      process.exit(1)
    })
}

export default verifyEmployeePortalFix
