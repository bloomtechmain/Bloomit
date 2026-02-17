#!/usr/bin/env ts-node
/**
 * Standalone Migration Runner
 * Run this script directly to execute the granular permission migration
 * Usage: npm run migrate:granular-permissions
 */

import { executeMigration, checkMigrationStatus } from './migrateToGranularPermissions'

async function main() {
  console.log('🚀 Granular Permission Migration Script')
  console.log('=' .repeat(50))
  
  try {
    // Check current status
    console.log('\n📊 Checking current migration status...')
    const status = await checkMigrationStatus()
    
    console.log(`\nCurrent Status:`)
    console.log(`  - Migration Complete: ${status.migrationComplete ? '✅ YES' : '❌ NO'}`)
    console.log(`  - Existing Granular Permissions: ${status.existingGranularPermissions}`)
    console.log(`  - Total Granular Permissions: ${status.totalGranularPermissions}`)
    console.log(`  - Progress: ${status.percentComplete}%`)
    
    if (status.migrationComplete) {
      console.log('\n✅ Migration already completed! No action needed.')
      process.exit(0)
    }
    
    // Run migration
    console.log('\n🔄 Starting migration...\n')
    const result = await executeMigration()
    
    if (!result.success) {
      console.error('\n❌ Migration failed:', result.error)
      process.exit(1)
    }
    
    if (result.report) {
      console.log('\n' + '='.repeat(50))
      console.log('📈 Migration Summary:')
      console.log('='.repeat(50))
      console.log(`  ✓ Permissions Added: ${result.report.permissionsAdded}`)
      console.log(`  ⊘ Permissions Skipped (already exist): ${result.report.permissionsSkipped}`)
      console.log(`  ↻ Roles Updated: ${result.report.rolesUpdated}`)
      
      if (result.report.errors && result.report.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:`)
        result.report.errors.forEach(err => console.log(`  - ${err}`))
      }
    }
    
    console.log('\n✅ Migration completed successfully!')
    console.log('=' .repeat(50))
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error)
    process.exit(1)
  }
}

// Run the migration
main()
