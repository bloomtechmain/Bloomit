import { pool } from '../db'

async function main() {
  console.log('🛒 Adding Purchase Order permissions to RBAC...')

  // Define purchase order permissions
  const purchaseOrderPermissions = [
    { resource: 'purchase_orders', action: 'read', description: 'View purchase orders' },
    { resource: 'purchase_orders', action: 'create', description: 'Create new purchase orders' },
    { resource: 'purchase_orders', action: 'update', description: 'Edit purchase orders (pending only)' },
    { resource: 'purchase_orders', action: 'approve', description: 'Approve purchase orders' },
    { resource: 'purchase_orders', action: 'reject', description: 'Reject purchase orders' },
    { resource: 'purchase_orders', action: 'upload_receipt', description: 'Upload receipt documents' },
  ]

  // Insert permissions
  console.log('📝 Inserting purchase order permissions...')
  for (const perm of purchaseOrderPermissions) {
    await pool.query(
      `INSERT INTO permissions (resource, action, description) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (resource, action) DO UPDATE 
       SET description = EXCLUDED.description`,
      [perm.resource, perm.action, perm.description]
    )
  }
  console.log(`✅ ${purchaseOrderPermissions.length} permissions inserted/updated`)

  // Get all roles
  const rolesResult = await pool.query('SELECT id, name FROM roles')
  const roleMap: Record<string, number> = {}
  rolesResult.rows.forEach((role: any) => {
    roleMap[role.name] = role.id
  })

  // Get all permission IDs
  const allPermissions = await pool.query('SELECT id, resource, action FROM permissions WHERE resource = $1', ['purchase_orders'])
  const permissionMap: Record<string, number> = {}
  allPermissions.rows.forEach((p: any) => {
    permissionMap[`${p.resource}:${p.action}`] = p.id
  })

  // Helper function to assign permissions
  const assignPermissions = async (roleName: string, permissions: string[]) => {
    if (!roleMap[roleName]) {
      console.warn(`⚠️  Role not found: ${roleName}`)
      return
    }

    let count = 0
    for (const perm of permissions) {
      if (permissionMap[perm]) {
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES ($1, $2) 
           ON CONFLICT DO NOTHING`,
          [roleMap[roleName], permissionMap[perm]]
        )
        count++
      } else {
        console.warn(`⚠️  Permission not found: ${perm}`)
      }
    }
    console.log(`✅ ${roleName}: ${count} purchase order permissions assigned`)
  }

  // Define role-permission mappings for purchase orders
  console.log('🔗 Assigning purchase order permissions to roles...')

  // Super Admin - All permissions
  await assignPermissions('Super Admin', [
    'purchase_orders:read',
    'purchase_orders:create',
    'purchase_orders:update',
    'purchase_orders:approve',
    'purchase_orders:reject',
    'purchase_orders:upload_receipt',
  ])

  // Admin - All permissions
  await assignPermissions('Admin', [
    'purchase_orders:read',
    'purchase_orders:create',
    'purchase_orders:update',
    'purchase_orders:approve',
    'purchase_orders:reject',
    'purchase_orders:upload_receipt',
  ])

  // Accountant - View, create, update, upload receipt (but not approve/reject)
  await assignPermissions('Accountant', [
    'purchase_orders:read',
    'purchase_orders:create',
    'purchase_orders:update',
    'purchase_orders:upload_receipt',
  ])

  // Project Manager - View, create, update, upload receipt
  await assignPermissions('Project Manager', [
    'purchase_orders:read',
    'purchase_orders:create',
    'purchase_orders:update',
    'purchase_orders:upload_receipt',
  ])

  // Employee - View and create only (can create requests for approval)
  await assignPermissions('Employee', [
    'purchase_orders:read',
    'purchase_orders:create',
  ])

  // Viewer - View only
  await assignPermissions('Viewer', [
    'purchase_orders:read',
  ])

  console.log('🎉 Purchase Order permissions setup completed successfully!')
  console.log(`
📊 Summary:
   - 6 purchase order permissions created
   - Permissions assigned to 6 roles
   - Super Admin & Admin: Full access
   - Accountant & Project Manager: Create, edit, upload receipts
   - Employee: View and create
   - Viewer: View only
  `)
}

main()
  .catch((e) => {
    console.error('❌ Error granting purchase order permissions:', e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
