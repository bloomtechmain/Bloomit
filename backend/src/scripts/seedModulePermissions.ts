/**
 * Seed script to add module permissions for RBAC system
 * Run this script to populate permissions for all modules
 */

import { pool } from '../db'

interface Permission {
  resource: string
  action: string
  description: string
}

const modulePermissions: Permission[] = [
  // Employee permissions
  { resource: 'employees', action: 'view', description: 'View employee records' },
  { resource: 'employees', action: 'create', description: 'Create new employees' },
  { resource: 'employees', action: 'edit', description: 'Edit employee information' },
  { resource: 'employees', action: 'delete', description: 'Delete employees' },

  // Project permissions
  { resource: 'projects', action: 'view', description: 'View projects and contracts' },
  { resource: 'projects', action: 'create', description: 'Create new projects and contracts' },
  { resource: 'projects', action: 'edit', description: 'Edit project and contract information' },
  { resource: 'projects', action: 'delete', description: 'Delete projects and contracts' },

  // Account permissions
  { resource: 'accounts', action: 'view', description: 'View bank accounts and cards' },
  { resource: 'accounts', action: 'create', description: 'Create new bank accounts' },
  { resource: 'accounts', action: 'manage_cards', description: 'Manage debit/credit cards' },

  // Vendor permissions
  { resource: 'vendors', action: 'view', description: 'View vendor list' },
  { resource: 'vendors', action: 'create', description: 'Create new vendors' },

  // Payables permissions
  { resource: 'payables', action: 'view', description: 'View payables and bills' },
  { resource: 'payables', action: 'create', description: 'Create new payables' },

  // Receivables permissions
  { resource: 'receivables', action: 'view', description: 'View receivables' },
  { resource: 'receivables', action: 'create', description: 'Create new receivables' },

  // Assets permissions
  { resource: 'assets', action: 'view', description: 'View assets and depreciation schedules' },
  { resource: 'assets', action: 'create', description: 'Create new assets' },

  // Petty Cash permissions
  { resource: 'petty_cash', action: 'view', description: 'View petty cash balance and transactions' },
  { resource: 'petty_cash', action: 'replenish', description: 'Replenish petty cash funds' },
  { resource: 'petty_cash', action: 'create_bill', description: 'Create petty cash bills' },

  // Notes permissions
  { resource: 'notes', action: 'view', description: 'View notes' },
  { resource: 'notes', action: 'create', description: 'Create new notes' },
  { resource: 'notes', action: 'edit', description: 'Edit notes' },
  { resource: 'notes', action: 'delete', description: 'Delete notes' },
  { resource: 'notes', action: 'share', description: 'Share notes with other users' },

  // Todos permissions
  { resource: 'todos', action: 'view', description: 'View todos' },
  { resource: 'todos', action: 'create', description: 'Create new todos' },
  { resource: 'todos', action: 'edit', description: 'Edit todos' },
  { resource: 'todos', action: 'delete', description: 'Delete todos' },
  { resource: 'todos', action: 'share', description: 'Share todos with other users' },

  // Subscriptions permissions
  { resource: 'subscriptions', action: 'view', description: 'View subscriptions' },
  { resource: 'subscriptions', action: 'create', description: 'Create new subscriptions' },
  { resource: 'subscriptions', action: 'edit', description: 'Edit subscriptions' },
  { resource: 'subscriptions', action: 'delete', description: 'Delete subscriptions' },

  // Analytics permissions
  { resource: 'analytics', action: 'view', description: 'View analytics and reports' },
]

async function seedModulePermissions() {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Starting module permissions seed...')
    
    await client.query('BEGIN')
    
    let insertedCount = 0
    let skippedCount = 0
    
    for (const perm of modulePermissions) {
      // Check if permission already exists
      const existing = await client.query(
        'SELECT id FROM permissions WHERE resource = $1 AND action = $2',
        [perm.resource, perm.action]
      )
      
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO permissions (resource, action, description) VALUES ($1, $2, $3)',
          [perm.resource, perm.action, perm.description]
        )
        console.log(`✅ Added permission: ${perm.resource}:${perm.action}`)
        insertedCount++
      } else {
        console.log(`⏭️  Permission already exists: ${perm.resource}:${perm.action}`)
        skippedCount++
      }
    }
    
    await client.query('COMMIT')
    
    console.log('\n✅ Module permissions seed completed!')
    console.log(`📊 Inserted: ${insertedCount}, Skipped: ${skippedCount}, Total: ${modulePermissions.length}`)
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error seeding module permissions:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run if executed directly
if (require.main === module) {
  seedModulePermissions()
    .then(() => {
      console.log('✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error)
      process.exit(1)
    })
}

export default seedModulePermissions
