import express from 'express'
import cors from 'cors'
import { pool, query } from './db';
import bcrypt from 'bcryptjs'
import { generateAccessToken, generateRefreshToken, verifyToken } from './utils/jwt'
import { provisionTenantForUser, provisionPendingWebsiteUsers, ensureWebsiteUsersHaveSuperAdmin, ensureSuperAdminTrigger, ensureSuperAdminHasAllPermissions } from './services/tenant-service'
import { requireAuth } from './middleware/auth'
import { validatePasswordStrength } from './utils/passwordGenerator'
import { isPasswordRecentlyUsed, addToPasswordHistory } from './utils/passwordHistory'
import { startReminderCron } from './jobs/reminderCron'
import { startPurgeTerminatedEmployeesJob } from './jobs/purgeTerminatedEmployees'
import { ensureRailwayAdmin } from './utils/ensureRailwayAdmin'
import logger from './utils/logger'
import employeeRoutes from './routes/employees'
import projectRoutes from './routes/projects'
import newProjectRoutes from './routes/newProjects'
import accountsRoutes from './routes/accounts'
import vendorRoutes from './routes/vendors'
import payableRoutes from './routes/payables'
import pettyCashRoutes from './routes/pettyCash'
import receivableRoutes from './routes/receivables'
import assetRoutes from './routes/assets'
import analyticsRoutes from './routes/analytics'
import notesRoutes from './routes/notes'
import todosRoutes from './routes/todos'
import rbacRoutes from './routes/rbac'
import settingsRoutes from './routes/settings'
import timeEntriesRoutes from './routes/timeEntries'
import ptoRequestsRoutes from './routes/ptoRequests'
import subscriptionsRoutes from './routes/subscriptions'
import documentsRoutes from './routes/documents'
import quotesRoutes from './routes/quotes'
import purchaseOrdersRoutes from './routes/purchaseOrders'
import payrollRoutes from './routes/payroll'
import employeePortalRoutes from './routes/employeePortal'
import employeeOnboardingRoutes from './routes/employeeOnboarding'
import loansRoutes from './routes/loans'

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL']
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length > 0) {
  logger.error('❌ Missing required environment variables:', missingEnvVars.join(', '))
  process.exit(1)
}

const app = express()

// Configure CORS
let corsOrigin: string | string[];
if (process.env.NODE_ENV === 'production') {
  corsOrigin = [
    process.env.FRONTEND_URL || '',
    'https://erpbloom.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter((url) => url !== '')
} else {
  corsOrigin = '*'
}

const corsOptions = {
  origin: corsOrigin,
  credentials: true
}

logger.system('🔐 CORS Configuration:', {
  env: process.env.NODE_ENV,
  origin: corsOrigin,
  frontend_url: process.env.FRONTEND_URL || 'NOT_SET'
})

app.use(cors(corsOptions))
import { tenantSchemaMiddleware } from './middleware/tenant-schema';
import { dbClientMiddleware } from './middleware/db-client';
app.use(express.json())
app.use(dbClientMiddleware);

// Root endpoint for Railway health checks
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Bloomtech ERP API',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  })
})

app.use('/employees', requireAuth, tenantSchemaMiddleware, employeeRoutes)
app.use('/projects-old', requireAuth, tenantSchemaMiddleware, projectRoutes) // Legacy endpoint for backward compatibility
app.use('/projects', requireAuth, tenantSchemaMiddleware, newProjectRoutes) // New 3-level hierarchy
app.use('/accounts', requireAuth, tenantSchemaMiddleware, accountsRoutes)
app.use('/vendors', requireAuth, tenantSchemaMiddleware, vendorRoutes)
app.use('/payables', requireAuth, tenantSchemaMiddleware, payableRoutes)
app.use('/petty-cash', requireAuth, tenantSchemaMiddleware, pettyCashRoutes)
app.use('/receivables', requireAuth, tenantSchemaMiddleware, receivableRoutes)
app.use('/assets', requireAuth, tenantSchemaMiddleware, assetRoutes)
app.use('/analytics', requireAuth, tenantSchemaMiddleware, analyticsRoutes)
app.use('/notes', requireAuth, tenantSchemaMiddleware, notesRoutes)
app.use('/todos', requireAuth, tenantSchemaMiddleware, todosRoutes)
app.use('/rbac', rbacRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/time-entries', requireAuth, tenantSchemaMiddleware, timeEntriesRoutes)
app.use('/pto-requests', requireAuth, tenantSchemaMiddleware, ptoRequestsRoutes)
app.use('/subscriptions', requireAuth, tenantSchemaMiddleware, subscriptionsRoutes)
app.use('/documents', requireAuth, tenantSchemaMiddleware, documentsRoutes)
app.use('/quotes', requireAuth, tenantSchemaMiddleware, quotesRoutes)
app.use('/purchase-orders', requireAuth, tenantSchemaMiddleware, purchaseOrdersRoutes)
app.use('/payroll', requireAuth, tenantSchemaMiddleware, payrollRoutes)
app.use('/api/employee-portal', requireAuth, tenantSchemaMiddleware, employeePortalRoutes)
app.use('/api/employee-onboarding', requireAuth, tenantSchemaMiddleware, employeeOnboardingRoutes)
app.use('/loans', requireAuth, tenantSchemaMiddleware, loansRoutes)

app.post('/auth/login', async (req, res) => {
  const { email, password, force } = req.body as { email?: string; password?: string; force?: boolean }
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })
  try {
    // Get user
    const r = await query(`
      SELECT u.id, u.name, u.email, u.password_hash, u.tenant_id,
             COALESCE(u.password_must_change, FALSE) as password_must_change,
             COALESCE(u.source, '') as source,
             COALESCE(u.account_status, 'active') as account_status
      FROM users u
      WHERE u.email = $1 OR u.name = $1
      LIMIT 1
    `, [email], req.dbClient)

    if (!r.rows.length) return res.status(401).json({ error: 'invalid_credentials' })

    const u = r.rows[0] as {
      id: number
      tenant_id: number | null
      name: string
      email: string
      password_hash: string
      password_must_change: boolean
      source: string
      account_status: string
    }

    if (u.account_status !== 'active') {
      return res.status(403).json({ error: 'account_inactive', message: 'Your account is not active.' })
    }

    const ok = await bcrypt.compare(password, u.password_hash)
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' })

    // Auto-provision tenant schema on first ERP login for website-registered users
    if (!u.tenant_id) {
      try {
        logger.system(`🏗️  Provisioning tenant for new user: ${u.email}`)
        const provisioned = await provisionTenantForUser(u.id, u.name)
        u.tenant_id = provisioned.tenantId
        logger.system(`✅ Tenant provisioned: ${provisioned.schemaName} (id=${provisioned.tenantId}) for ${u.email}`)
      } catch (provisionErr) {
        logger.error('Tenant provisioning failed during login', provisionErr)
        return res.status(500).json({ error: 'tenant_provision_failed', message: 'Could not set up your workspace. Please contact support.' })
      }
    }

    // Enforce single active session — block if already logged in elsewhere
    await query(
      `DELETE FROM public.active_sessions WHERE user_id = $1 AND expires_at <= NOW()`,
      [u.id], req.dbClient
    )
    const existingSession = await query(
      `SELECT id FROM public.active_sessions WHERE user_id = $1 AND expires_at > NOW() LIMIT 1`,
      [u.id], req.dbClient
    )
    if (existingSession.rows.length > 0) {
      if (!force) {
        return res.status(409).json({
          error: 'already_logged_in',
          message: 'This account is already active in another session. Sign in anyway to end that session.'
        })
      }
      // Force flag set — clear the existing session and continue
      await query(
        `DELETE FROM public.active_sessions WHERE user_id = $1`,
        [u.id], req.dbClient
      )
    }

    // Create a new session (expires with the refresh token — 7 days)
    const sessionResult = await query(
      `INSERT INTO public.active_sessions (user_id, expires_at, ip_address, user_agent)
       VALUES ($1, NOW() + INTERVAL '7 days', $2, $3)
       RETURNING session_token`,
      [u.id, req.ip, req.headers['user-agent'] || null],
      req.dbClient
    )
    const sessionToken: string = sessionResult.rows[0].session_token

    // Get user's roles
    const rolesResult = await query(`
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [u.id], req.dbClient)
    
    const roleIds = rolesResult.rows.map((r: any) => r.id)
    const roleNames = rolesResult.rows.map((r: any) => r.name)
    
    // Get union of all permissions from all roles
    const permissions: string[] = []
    if (roleIds.length > 0) {
      const permResult = await query(`
        SELECT DISTINCT p.resource, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::int[])
      `, [roleIds], req.dbClient)
      
      permissions.push(...permResult.rows.map((p: any) => `${p.resource}:${p.action}`))
    }

    // Safety net: Super Admin must always have settings:manage
    if (roleNames.includes('Super Admin') && !permissions.includes('settings:manage')) {
      logger.system(`⚠️ Super Admin ${u.email} missing settings:manage — granting now`)
      await query(`
        DO $$
        DECLARE v_role_id INTEGER; v_perm_id INTEGER;
        BEGIN
          SELECT id INTO v_role_id FROM public.roles WHERE name = 'Super Admin';
          SELECT id INTO v_perm_id FROM public.permissions WHERE resource = 'settings' AND action = 'manage' LIMIT 1;
          IF v_perm_id IS NULL THEN
            INSERT INTO public.permissions (resource, action, description)
            VALUES ('settings', 'manage', 'Manage roles, permissions, and system settings')
            RETURNING id INTO v_perm_id;
          END IF;
          IF v_role_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT (role_id, permission_id) DO NOTHING;
          END IF;
        END $$;
      `, [], req.dbClient)
      permissions.push('settings:manage')
    }

    // Generate JWT tokens (session token embedded so middleware can validate it)
    const payload = {
      userId: u.id,
      tenantId: u.tenant_id,
      email: u.email,
      roleIds,
      roleNames,
      permissions,
      sessionToken
    }
    
    console.log('🔐 LOGIN DEBUG - User:', u.email)
    console.log('📋 LOGIN DEBUG - Permissions count:', permissions.length)
    console.log('📋 LOGIN DEBUG - First 10 permissions:', permissions.slice(0, 10))
    
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)
    
    return res.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        roleIds,
        roleNames,
        permissions,
        password_must_change: u.password_must_change,
        source: u.source || null,
        is_super_user: u.source === 'marketing_site'
      },
      accessToken,
      refreshToken
    })
  } catch (e) {
    logger.error('/auth/login error', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Logout — invalidates the active session
app.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    const { userId, sessionToken } = req.user!
    await pool.query(
      `DELETE FROM public.active_sessions WHERE user_id = $1 AND session_token = $2`,
      [userId, sessionToken]
    )
    return res.json({ success: true, message: 'Logged out successfully' })
  } catch (e) {
    logger.error('/auth/logout error', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Get current user info
app.get('/auth/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    
    // Fetch fresh user data
    const r = await pool.query(`
      SELECT u.id, u.name, u.email
      FROM users u
      WHERE u.id = $1
    `, [req.user.userId])
    
    if (!r.rows.length) {
      return res.status(404).json({ error: 'user_not_found' })
    }
    
    const u = r.rows[0]
    
    // Get user's roles
    const rolesResult = await pool.query(`
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [u.id])
    
    const roleIds = rolesResult.rows.map((r: any) => r.id)
    const roleNames = rolesResult.rows.map((r: any) => r.name)
    
    // Get union of all permissions from all roles
    const permissions: string[] = []
    if (roleIds.length > 0) {
      const permResult = await pool.query(`
        SELECT DISTINCT p.resource, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::int[])
      `, [roleIds])
      
      permissions.push(...permResult.rows.map((p: any) => `${p.resource}:${p.action}`))
    }
    
    return res.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        roleIds,
        roleNames,
        permissions
      }
    })
  } catch (e) {
    logger.error('/auth/me error', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Refresh access token
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string }
  
  if (!refreshToken) {
    return res.status(400).json({ error: 'missing_refresh_token' })
  }
  
  try {
    const decoded = verifyToken(refreshToken)

    if (!decoded) {
      return res.status(401).json({ error: 'invalid_refresh_token' })
    }

    // Validate session is still active
    if (decoded.sessionToken) {
      const sessionCheck = await pool.query(
        `SELECT id FROM public.active_sessions
         WHERE user_id = $1 AND session_token = $2 AND expires_at > NOW()`,
        [decoded.userId, decoded.sessionToken]
      )
      if (sessionCheck.rows.length === 0) {
        return res.status(401).json({
          error: 'session_invalidated',
          message: 'Your session is no longer valid. Please log in again.'
        })
      }
    }

    // Generate new access token with current permissions
    const r = await pool.query(`
      SELECT u.id, u.name, u.email, u.tenant_id
      FROM users u
      WHERE u.id = $1
    `, [decoded.userId])
    
    if (!r.rows.length) {
      return res.status(404).json({ error: 'user_not_found' })
    }
    
    const u = r.rows[0]
    
    // Get user's roles
    const rolesResult = await pool.query(`
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [u.id])
    
    const roleIds = rolesResult.rows.map((r: any) => r.id)
    const roleNames = rolesResult.rows.map((r: any) => r.name)
    
    // Get union of all permissions from all roles
    const permissions: string[] = []
    if (roleIds.length > 0) {
      const permResult = await pool.query(`
        SELECT DISTINCT p.resource, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::int[])
      `, [roleIds])
      
      permissions.push(...permResult.rows.map((p: any) => `${p.resource}:${p.action}`))
    }
    
    const payload = {
      userId: u.id,
      tenantId: u.tenant_id,
      email: u.email,
      roleIds,
      roleNames,
      permissions,
      sessionToken: decoded.sessionToken
    }

    const newAccessToken = generateAccessToken(payload)

    return res.json({ accessToken: newAccessToken })
  } catch (e) {
    logger.error('/auth/refresh error', e)
    return res.status(500).json({ error: 'server_error' })
  }
})

// Change password endpoint (user self-service)
app.post('/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'validation_error', message: 'Current and new passwords are required' })
  }
  
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  
  try {
    // Get user's current password hash
    const userResult = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE id = $1',
      [req.user.userId]
    )
    
    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'user_not_found' })
    }
    
    const user = userResult.rows[0]
    
    // Verify current password
    const currentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!currentPasswordValid) {
      return res.status(401).json({ error: 'invalid_password', message: 'Current password is incorrect' })
    }
    
    // Validate new password strength
    const validation = validatePasswordStrength(newPassword)
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'weak_password', 
        message: validation.errors.join(', ') 
      })
    }
    
    // Check if new password matches any of the last 3 passwords
    const isRecentlyUsed = await isPasswordRecentlyUsed(user.id, newPassword)
    if (isRecentlyUsed) {
      return res.status(400).json({ 
        error: 'password_reused', 
        message: 'Cannot reuse any of your last 3 passwords' 
      })
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)
    
    // Update password and clear password_must_change flag
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, password_must_change = FALSE 
       WHERE id = $2`,
      [newPasswordHash, user.id]
    )
    
    // Add to password history
    await addToPasswordHistory(user.id, newPasswordHash)
    
    // Log audit
    await pool.query(
      `INSERT INTO rbac_audit_log (user_id, action, details) 
       VALUES ($1, $2, $3)`,
      [user.id, 'CHANGE_PASSWORD', JSON.stringify({ userId: user.id, email: user.email })]
    )
    
    logger.info(`✅ Password changed successfully for user ${user.email}`)
    
    return res.json({ 
      success: true,
      message: 'Password changed successfully' 
    })
  } catch (e) {
    logger.error('/auth/change-password error', e)
    return res.status(500).json({ error: 'server_error', message: 'Failed to change password' })
  }
})

if (process.env.NODE_ENV !== 'production') {
  app.post('/dev/seed-user', async (req, res) => {
    const { name, email, password, role } = req.body as { name?: string; email?: string; password?: string; role?: string }
    if (!name || !email || !password) return res.status(400).json({ error: 'missing_fields' })
    try {
      const hash = await bcrypt.hash(password, 10)
      const r = await pool.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id', [name, email, hash, role ?? 'user'])
      return res.json({ inserted: r.rowCount })
    } catch (e) {
      logger.error('/dev/seed-user error', e)
      return res.status(500).json({ error: 'server_error' })
    }
  })
  app.post('/dev/upsert-user', async (req, res) => {
    const { name, email, password, role } = req.body as { name?: string; email?: string; password?: string; role?: string }
    if (!name || !email || !password) return res.status(400).json({ error: 'missing_fields' })
    try {
      const hash = await bcrypt.hash(password, 10)
      const r = await pool.query(
        `INSERT INTO users(name,email,password_hash,role)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(email) DO UPDATE
         SET name=EXCLUDED.name,
             password_hash=EXCLUDED.password_hash,
             role=EXCLUDED.role
         RETURNING id`,
        [name, email, hash, role ?? 'user']
      )
      return res.json({ upserted: r.rowCount })
    } catch (e) {
      logger.error('/dev/upsert-user error', e)
      return res.status(500).json({ error: 'server_error' })
    }
  })
}

// Idempotent schema migrations — safe to run on every startup
async function runStartupMigrations() {
  try {
    await pool.query(`
      DO $$
      BEGIN
        -- UNIQUE constraint on roles.name
        -- Must deduplicate first: old code could INSERT multiple rows with the same name
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'roles_name_unique'
        ) THEN
          -- Migrate user_roles from duplicate roles to the canonical (lowest-id) role
          INSERT INTO public.user_roles (user_id, role_id)
          SELECT ur.user_id,
                 (SELECT MIN(r2.id) FROM public.roles r2 WHERE r2.name = r.name)
          FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.role_id NOT IN (SELECT MIN(id) FROM public.roles GROUP BY name)
          ON CONFLICT (user_id, role_id) DO NOTHING;

          -- Migrate role_permissions from duplicate roles to the canonical role
          INSERT INTO public.role_permissions (role_id, permission_id)
          SELECT (SELECT MIN(r2.id) FROM public.roles r2 WHERE r2.name = r.name),
                 rp.permission_id
          FROM public.role_permissions rp
          JOIN public.roles r ON r.id = rp.role_id
          WHERE rp.role_id NOT IN (SELECT MIN(id) FROM public.roles GROUP BY name)
          ON CONFLICT (role_id, permission_id) DO NOTHING;

          -- Remove assignments pointing to duplicate roles
          DELETE FROM public.user_roles
          WHERE role_id NOT IN (SELECT MIN(id) FROM public.roles GROUP BY name);

          DELETE FROM public.role_permissions
          WHERE role_id NOT IN (SELECT MIN(id) FROM public.roles GROUP BY name);

          -- Delete duplicate role rows (keep lowest id per name)
          DELETE FROM public.roles
          WHERE id NOT IN (SELECT MIN(id) FROM public.roles GROUP BY name);

          ALTER TABLE public.roles ADD CONSTRAINT roles_name_unique UNIQUE (name);
        END IF;

        -- UNIQUE constraint on users.email
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
        ) THEN
          -- Only add if no duplicates exist (emails should not be duplicated)
          IF NOT EXISTS (
            SELECT 1 FROM (
              SELECT email FROM public.users GROUP BY email HAVING COUNT(*) > 1
            ) t
          ) THEN
            ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);
          END IF;
        END IF;

        -- UNIQUE constraint on permissions(resource, action) to prevent duplicates
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'permissions_resource_action_unique'
        ) THEN
          -- Remove any duplicates first (keep lowest id)
          DELETE FROM public.role_permissions
          WHERE permission_id NOT IN (
            SELECT MIN(id) FROM public.permissions GROUP BY resource, action
          );
          DELETE FROM public.permissions
          WHERE id NOT IN (
            SELECT MIN(id) FROM public.permissions GROUP BY resource, action
          );
          ALTER TABLE public.permissions
            ADD CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action);
        END IF;
      END $$;
    `)
    logger.system('✅ Schema migrations applied')
  } catch (err) {
    // Non-fatal — log the error but let the server start anyway.
    // Constraint failures (e.g. unexpected duplicates) should not prevent startup.
    logger.error('⚠️  Schema migration warning (non-fatal):', err)
  }
}

// Async startup function to ensure proper initialization order
async function startServer() {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000

  try {
    // First, test database connection
    logger.system('🔄 Testing database connection...')
    await pool.connect()
    logger.system('✅ Database connected successfully')

    // Apply idempotent schema migrations (adds missing constraints, deduplicates)
    await runStartupMigrations()

    // Ensure Railway admin user exists (production only)
    await ensureRailwayAdmin()

    // Install DB trigger so new website users get Super Admin role immediately on INSERT
    await ensureSuperAdminTrigger()

    // Provision tenants for website-registered users who haven't logged in yet
    await provisionPendingWebsiteUsers()

    // Ensure every website user has Super Admin role (catches partial/missed provisioning)
    await ensureWebsiteUsersHaveSuperAdmin()

    // Ensure Super Admin role has all permissions (fixes users with role but empty role_permissions)
    await ensureSuperAdminHasAllPermissions()
    
    // Start background jobs (Railway-compatible)
    logger.system('🔄 Initializing background jobs...')
    startReminderCron()
    startPurgeTerminatedEmployeesJob()
    
    // Then start the HTTP server
    logger.system(`🔄 Starting HTTP server on port ${port}...`)
    app.listen(port, '0.0.0.0', () => {
      logger.system(`✅ Server is ready and accepting connections`)
      logger.system(`🌐 API available at http://localhost:${port}`)
      logger.system(`🎯 Health check endpoint: http://localhost:${port}/`)
    })
  } catch (err) {
    logger.error('❌ Startup error:', err)
    logger.error('DATABASE_URL:', process.env.DATABASE_URL ? 'is set' : 'is NOT set')
    process.exit(1)
  }
}

export default app

if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    logger.error('❌ Fatal error during startup:', err)
    process.exit(1)
  })
}
