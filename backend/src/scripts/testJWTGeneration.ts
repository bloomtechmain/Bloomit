import { pool } from '../db'

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('🔬 TESTING JWT TOKEN GENERATION FOR USER ID 2')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')

  const TARGET_USER_ID = 2
  const TARGET_EMAIL = 'dilantha@bloomtech.lk'

  try {
    // Step 1: Get user
    console.log('👤 Step 1: Fetching user...')
    const userResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.password_hash, 
             COALESCE(u.password_must_change, FALSE) as password_must_change
      FROM users u
      WHERE u.email = $1 OR u.id = $2
      LIMIT 1
    `, [TARGET_EMAIL, TARGET_USER_ID])
    
    if (!userResult.rows.length) {
      throw new Error('User not found!')
    }
    
    const user = userResult.rows[0]
    console.log(`✅ User found: ${user.email} (ID: ${user.id})`)
    console.log('')

    // Step 2: Get user's roles
    console.log('🎭 Step 2: Fetching user roles...')
    const rolesResult = await pool.query(`
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [user.id])
    
    const roleIds = rolesResult.rows.map((r: any) => r.id)
    const roleNames = rolesResult.rows.map((r: any) => r.name)
    
    console.log(`✅ Roles found: ${roleNames.length}`)
    roleNames.forEach((name: string) => console.log(`   - ${name}`))
    console.log('')

    // Step 3: Get union of all permissions from all roles
    console.log('🔐 Step 3: Fetching permissions for roles...')
    const permissions: string[] = []
    
    if (roleIds.length > 0) {
      const permResult = await pool.query(`
        SELECT DISTINCT p.resource, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::int[])
        ORDER BY p.resource, p.action
      `, [roleIds])
      
      permissions.push(...permResult.rows.map((p: any) => `${p.resource}:${p.action}`))
    }
    
    console.log(`✅ Permissions loaded: ${permissions.length}`)
    console.log('')

    // Show critical permissions
    const criticalPerms = ['analytics:read', 'notes:read', 'projects:read', 'todos:read']
    console.log('🔍 Checking critical permissions:')
    for (const perm of criticalPerms) {
      const hasIt = permissions.includes(perm)
      console.log(`   ${hasIt ? '✅' : '❌'} ${perm}`)
    }
    console.log('')

    // Show first 20 permissions
    if (permissions.length > 0) {
      console.log('📋 First 20 permissions:')
      permissions.slice(0, 20).forEach((p: string) => console.log(`   - ${p}`))
      if (permissions.length > 20) {
        console.log(`   ... and ${permissions.length - 20} more`)
      }
    } else {
      console.log('⚠️  NO PERMISSIONS FOUND!')
    }
    console.log('')

    // Generate JWT payload (simulating what the login endpoint does)
    const payload = {
      userId: user.id,
      email: user.email,
      roleIds,
      roleNames,
      permissions
    }

    console.log('═══════════════════════════════════════════════════════')
    console.log('📊 JWT PAYLOAD THAT WOULD BE GENERATED:')
    console.log('═══════════════════════════════════════════════════════')
    console.log(JSON.stringify(payload, null, 2))
    console.log('')
    
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ TEST COMPLETE')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    
    if (permissions.length === 0) {
      console.log('⚠️  PROBLEM IDENTIFIED: User has 0 permissions!')
      console.log('   This means either:')
      console.log('   1. User has no roles assigned (check user_roles table)')
      console.log('   2. Roles have no permissions assigned (check role_permissions table)')
      console.log('   3. Database query is failing')
    } else {
      console.log(`✅ JWT token would contain ${permissions.length} permissions`)
      console.log('   If 401 errors persist, the issue may be:')
      console.log('   1. Frontend not sending the token correctly')
      console.log('   2. Backend not receiving/validating the token correctly')
      console.log('   3. Middleware issue in the authorization flow')
    }
    console.log('')

  } catch (error: any) {
    console.error('')
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ERROR DURING TEST')
    console.error('═══════════════════════════════════════════════════════')
    console.error('')
    console.error('Error details:', error.message)
    console.error('')
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    console.error('')
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
