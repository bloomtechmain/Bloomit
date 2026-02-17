import { pool } from '../db'

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('🔧 FIXING SUPER ADMIN ACCESS')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')

  const TARGET_USER_ID = 2 // dilantha@bloomtech.lk
  const TARGET_EMAIL = 'dilantha@bloomtech.lk'

  try {
    // Step 1: Verify user exists
    console.log('👤 Step 1: Verifying user account...')
    const userCheck = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [TARGET_USER_ID]
    )
    
    if (userCheck.rows.length === 0) {
      throw new Error(`User ID ${TARGET_USER_ID} not found!`)
    }
    
    const user = userCheck.rows[0]
    console.log(`✅ Found user: ${user.email} (${user.name})`)
    console.log('')

    // Step 2: Get or create Super Admin role
    console.log('🔍 Step 2: Checking Super Admin role...')
    let superAdminRoleId: number
    
    const roleCheck = await pool.query(
      `SELECT id FROM roles WHERE name = 'Super Admin'`
    )
    
    if (roleCheck.rows.length === 0) {
      console.log('   ⚠️  Super Admin role not found, creating it...')
      const roleCreate = await pool.query(
        `INSERT INTO roles (name, description, is_system_role) 
         VALUES ('Super Admin', 'Full system access with all permissions', true) 
         RETURNING id`
      )
      superAdminRoleId = roleCreate.rows[0].id
      console.log(`   ✅ Created Super Admin role (ID: ${superAdminRoleId})`)
    } else {
      superAdminRoleId = roleCheck.rows[0].id
      console.log(`   ✅ Super Admin role exists (ID: ${superAdminRoleId})`)
    }
    console.log('')

    // Step 3: Remove any existing role assignments for this user
    console.log('🗑️  Step 3: Clearing existing role assignments...')
    const deleteResult = await pool.query(
      'DELETE FROM user_roles WHERE user_id = $1',
      [TARGET_USER_ID]
    )
    console.log(`   ✅ Removed ${deleteResult.rowCount} existing role assignment(s)`)
    console.log('')

    // Step 4: Assign Super Admin role to user
    console.log('➕ Step 4: Assigning Super Admin role...')
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [TARGET_USER_ID, superAdminRoleId]
    )
    console.log(`   ✅ Super Admin role assigned to user ${TARGET_USER_ID}`)
    console.log('')

    // Step 5: Get all permissions
    console.log('📋 Step 5: Fetching all system permissions...')
    const allPermissions = await pool.query(
      'SELECT id, resource, action FROM permissions ORDER BY resource, action'
    )
    console.log(`   ✅ Found ${allPermissions.rows.length} permissions`)
    console.log('')

    // Step 6: Clear existing role permissions
    console.log('🧹 Step 6: Clearing existing Super Admin permissions...')
    await pool.query(
      'DELETE FROM role_permissions WHERE role_id = $1',
      [superAdminRoleId]
    )
    console.log('   ✅ Existing permissions cleared')
    console.log('')

    // Step 7: Grant ALL permissions to Super Admin
    console.log('🔓 Step 7: Granting ALL permissions to Super Admin...')
    let grantedCount = 0
    for (const perm of allPermissions.rows) {
      await pool.query(
        `INSERT INTO role_permissions (role_id, permission_id) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`,
        [superAdminRoleId, perm.id]
      )
      grantedCount++
    }
    console.log(`   ✅ Granted ${grantedCount} permissions to Super Admin role`)
    console.log('')

    // Step 8: Verify the fix
    console.log('✓ Step 8: Verifying the fix...')
    
    // Check role assignment
    const verifyRole = await pool.query(
      `SELECT r.id, r.name, r.description 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = $1`,
      [TARGET_USER_ID]
    )
    
    if (verifyRole.rows.length === 0) {
      throw new Error('Verification failed: No role assigned!')
    }
    
    console.log(`   ✅ User has role: ${verifyRole.rows[0].name}`)
    
    // Check permissions count
    const verifyPerms = await pool.query(
      `SELECT COUNT(*) as count 
       FROM role_permissions rp 
       WHERE rp.role_id = $1`,
      [superAdminRoleId]
    )
    
    console.log(`   ✅ Role has ${verifyPerms.rows[0].count} permissions`)
    console.log('')

    // Summary
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ SUPER ADMIN ACCESS RESTORED SUCCESSFULLY!')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    console.log('📊 Summary:')
    console.log(`   User:        ${user.email}`)
    console.log(`   User ID:     ${TARGET_USER_ID}`)
    console.log(`   Role:        Super Admin`)
    console.log(`   Role ID:     ${superAdminRoleId}`)
    console.log(`   Permissions: ${grantedCount} (ALL)`)
    console.log('')
    console.log('🔄 Next Steps:')
    console.log('   1. Logout from the application')
    console.log('   2. Clear browser cache/cookies')
    console.log('   3. Login again with your credentials')
    console.log('   4. You should now have full Super Admin access!')
    console.log('')
    console.log('═══════════════════════════════════════════════════════')

  } catch (error: any) {
    console.error('')
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ERROR FIXING SUPER ADMIN ACCESS')
    console.error('═══════════════════════════════════════════════════════')
    console.error('')
    console.error('Error details:', error.message)
    console.error('')
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    console.error('')
    console.error('═══════════════════════════════════════════════════════')
    throw error
  }
}

main()
  .catch((e) => {
    console.error('Script failed:', e.message)
    process.exitCode = 1
  })
  .finally(() => {
    pool.end()
  })
