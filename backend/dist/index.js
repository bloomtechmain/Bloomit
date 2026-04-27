"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("./utils/jwt");
const tenant_service_1 = require("./services/tenant-service");
const auth_1 = require("./middleware/auth");
const passwordGenerator_1 = require("./utils/passwordGenerator");
const passwordHistory_1 = require("./utils/passwordHistory");
const reminderCron_1 = require("./jobs/reminderCron");
const purgeTerminatedEmployees_1 = require("./jobs/purgeTerminatedEmployees");
const ensureRailwayAdmin_1 = require("./utils/ensureRailwayAdmin");
const logger_1 = __importDefault(require("./utils/logger"));
const employees_1 = __importDefault(require("./routes/employees"));
const projects_1 = __importDefault(require("./routes/projects"));
const newProjects_1 = __importDefault(require("./routes/newProjects"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const vendors_1 = __importDefault(require("./routes/vendors"));
const payables_1 = __importDefault(require("./routes/payables"));
const pettyCash_1 = __importDefault(require("./routes/pettyCash"));
const receivables_1 = __importDefault(require("./routes/receivables"));
const assets_1 = __importDefault(require("./routes/assets"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const notes_1 = __importDefault(require("./routes/notes"));
const todos_1 = __importDefault(require("./routes/todos"));
const rbac_1 = __importDefault(require("./routes/rbac"));
const settings_1 = __importDefault(require("./routes/settings"));
const timeEntries_1 = __importDefault(require("./routes/timeEntries"));
const ptoRequests_1 = __importDefault(require("./routes/ptoRequests"));
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const documents_1 = __importDefault(require("./routes/documents"));
const quotes_1 = __importDefault(require("./routes/quotes"));
const purchaseOrders_1 = __importDefault(require("./routes/purchaseOrders"));
const payroll_1 = __importDefault(require("./routes/payroll"));
const employeePortal_1 = __importDefault(require("./routes/employeePortal"));
const employeeOnboarding_1 = __importDefault(require("./routes/employeeOnboarding"));
const loans_1 = __importDefault(require("./routes/loans"));
// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    logger_1.default.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
}
const app = (0, express_1.default)();
// Configure CORS
let corsOrigin;
if (process.env.NODE_ENV === 'production') {
    corsOrigin = [
        process.env.FRONTEND_URL || '',
        'https://erpbloom.com',
        'http://localhost:5173',
        'http://localhost:3000'
    ].filter((url) => url !== '');
}
else {
    corsOrigin = '*';
}
const corsOptions = {
    origin: corsOrigin,
    credentials: true
};
logger_1.default.system('🔐 CORS Configuration:', {
    env: process.env.NODE_ENV,
    origin: corsOrigin,
    frontend_url: process.env.FRONTEND_URL || 'NOT_SET'
});
app.use((0, cors_1.default)(corsOptions));
const tenant_schema_1 = require("./middleware/tenant-schema");
const db_client_1 = require("./middleware/db-client");
app.use(express_1.default.json());
// Health check endpoints — must be before dbClientMiddleware so they don't require a DB connection
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Bloomtech ERP API',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});
app.use(db_client_1.dbClientMiddleware);
app.use('/employees', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, employees_1.default);
app.use('/projects-old', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, projects_1.default); // Legacy endpoint for backward compatibility
app.use('/projects', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, newProjects_1.default); // New 3-level hierarchy
app.use('/accounts', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, accounts_1.default);
app.use('/vendors', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, vendors_1.default);
app.use('/payables', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, payables_1.default);
app.use('/petty-cash', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, pettyCash_1.default);
app.use('/receivables', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, receivables_1.default);
app.use('/assets', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, assets_1.default);
app.use('/analytics', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, analytics_1.default);
app.use('/notes', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, notes_1.default);
app.use('/todos', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, todos_1.default);
app.use('/rbac', rbac_1.default);
app.use('/api/settings', settings_1.default);
app.use('/time-entries', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, timeEntries_1.default);
app.use('/pto-requests', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, ptoRequests_1.default);
app.use('/subscriptions', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, subscriptions_1.default);
app.use('/documents', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, documents_1.default);
app.use('/quotes', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, quotes_1.default);
app.use('/purchase-orders', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, purchaseOrders_1.default);
app.use('/payroll', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, payroll_1.default);
app.use('/api/employee-portal', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, employeePortal_1.default);
app.use('/api/employee-onboarding', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, employeeOnboarding_1.default);
app.use('/loans', auth_1.requireAuth, tenant_schema_1.tenantSchemaMiddleware, loans_1.default);
app.post('/auth/login', async (req, res) => {
    const { email, password, force } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'missing_fields' });
    try {
        // Get user
        const r = await (0, db_1.query)(`
      SELECT u.id, u.name, u.email, u.password_hash, u.tenant_id,
             COALESCE(u.password_must_change, FALSE) as password_must_change,
             COALESCE(u.source, '') as source,
             COALESCE(u.account_status, 'active') as account_status
      FROM users u
      WHERE u.email = $1 OR u.name = $1
      LIMIT 1
    `, [email], req.dbClient);
        if (!r.rows.length)
            return res.status(401).json({ error: 'invalid_credentials' });
        const u = r.rows[0];
        if (u.account_status !== 'active') {
            return res.status(403).json({ error: 'account_inactive', message: 'Your account is not active.' });
        }
        const ok = await bcryptjs_1.default.compare(password, u.password_hash);
        if (!ok)
            return res.status(401).json({ error: 'invalid_credentials' });
        // Auto-provision tenant schema on first ERP login for website-registered users
        if (!u.tenant_id) {
            try {
                logger_1.default.system(`🏗️  Provisioning tenant for new user: ${u.email}`);
                const provisioned = await (0, tenant_service_1.provisionTenantForUser)(u.id, u.name);
                u.tenant_id = provisioned.tenantId;
                logger_1.default.system(`✅ Tenant provisioned: ${provisioned.schemaName} (id=${provisioned.tenantId}) for ${u.email}`);
            }
            catch (provisionErr) {
                logger_1.default.error('Tenant provisioning failed during login', provisionErr);
                return res.status(500).json({ error: 'tenant_provision_failed', message: 'Could not set up your workspace. Please contact support.' });
            }
        }
        // Enforce single active session — block if already logged in elsewhere
        await (0, db_1.query)(`DELETE FROM public.active_sessions WHERE user_id = $1 AND expires_at <= NOW()`, [u.id], req.dbClient);
        const existingSession = await (0, db_1.query)(`SELECT id FROM public.active_sessions WHERE user_id = $1 AND expires_at > NOW() LIMIT 1`, [u.id], req.dbClient);
        if (existingSession.rows.length > 0) {
            if (!force) {
                return res.status(409).json({
                    error: 'already_logged_in',
                    message: 'This account is already active in another session. Sign in anyway to end that session.'
                });
            }
            // Force flag set — clear the existing session and continue
            await (0, db_1.query)(`DELETE FROM public.active_sessions WHERE user_id = $1`, [u.id], req.dbClient);
        }
        // Create a new session (expires with the refresh token — 7 days)
        const sessionResult = await (0, db_1.query)(`INSERT INTO public.active_sessions (user_id, expires_at, ip_address, user_agent)
       VALUES ($1, NOW() + INTERVAL '7 days', $2, $3)
       RETURNING session_token`, [u.id, req.ip, req.headers['user-agent'] || null], req.dbClient);
        const sessionToken = sessionResult.rows[0].session_token;
        // Get user's roles
        const rolesResult = await (0, db_1.query)(`
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [u.id], req.dbClient);
        const roleIds = rolesResult.rows.map((r) => r.id);
        const roleNames = rolesResult.rows.map((r) => r.name);
        // Get union of all permissions from all roles
        const permissions = [];
        if (roleIds.length > 0) {
            const permResult = await (0, db_1.query)(`
        SELECT DISTINCT p.resource, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::int[])
      `, [roleIds], req.dbClient);
            permissions.push(...permResult.rows.map((p) => `${p.resource}:${p.action}`));
        }
        // Safety net: Super Admin must always have settings:manage
        if (roleNames.includes('Super Admin') && !permissions.includes('settings:manage')) {
            logger_1.default.system(`⚠️ Super Admin ${u.email} missing settings:manage — granting now`);
            await (0, db_1.query)(`
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
      `, [], req.dbClient);
            permissions.push('settings:manage');
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
        };
        console.log('🔐 LOGIN DEBUG - User:', u.email);
        console.log('📋 LOGIN DEBUG - Permissions count:', permissions.length);
        console.log('📋 LOGIN DEBUG - First 10 permissions:', permissions.slice(0, 10));
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
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
        });
    }
    catch (e) {
        logger_1.default.error('/auth/login error', e);
        return res.status(500).json({ error: 'server_error' });
    }
});
// Logout — invalidates the active session
app.post('/auth/logout', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId, sessionToken } = req.user;
        await db_1.pool.query(`DELETE FROM public.active_sessions WHERE user_id = $1 AND session_token = $2`, [userId, sessionToken]);
        return res.json({ success: true, message: 'Logged out successfully' });
    }
    catch (e) {
        logger_1.default.error('/auth/logout error', e);
        return res.status(500).json({ error: 'server_error' });
    }
});
// Get current user info
app.get('/auth/me', auth_1.requireAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'unauthorized' });
        }
        // Fetch fresh user data
        const r = await db_1.pool.query(`
      SELECT u.id, u.name, u.email
      FROM users u
      WHERE u.id = $1
    `, [req.user.userId]);
        if (!r.rows.length) {
            return res.status(404).json({ error: 'user_not_found' });
        }
        const u = r.rows[0];
        // Get user's roles
        const rolesResult = await db_1.pool.query(`
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [u.id]);
        const roleIds = rolesResult.rows.map((r) => r.id);
        const roleNames = rolesResult.rows.map((r) => r.name);
        // Get union of all permissions from all roles
        const permissions = [];
        if (roleIds.length > 0) {
            const permResult = await db_1.pool.query(`
        SELECT DISTINCT p.resource, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::int[])
      `, [roleIds]);
            permissions.push(...permResult.rows.map((p) => `${p.resource}:${p.action}`));
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
        });
    }
    catch (e) {
        logger_1.default.error('/auth/me error', e);
        return res.status(500).json({ error: 'server_error' });
    }
});
// Refresh access token
app.post('/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: 'missing_refresh_token' });
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(refreshToken);
        if (!decoded) {
            return res.status(401).json({ error: 'invalid_refresh_token' });
        }
        // Validate session is still active
        if (decoded.sessionToken) {
            const sessionCheck = await db_1.pool.query(`SELECT id FROM public.active_sessions
         WHERE user_id = $1 AND session_token = $2 AND expires_at > NOW()`, [decoded.userId, decoded.sessionToken]);
            if (sessionCheck.rows.length === 0) {
                return res.status(401).json({
                    error: 'session_invalidated',
                    message: 'Your session is no longer valid. Please log in again.'
                });
            }
        }
        // Generate new access token with current permissions
        const r = await db_1.pool.query(`
      SELECT u.id, u.name, u.email, u.tenant_id
      FROM users u
      WHERE u.id = $1
    `, [decoded.userId]);
        if (!r.rows.length) {
            return res.status(404).json({ error: 'user_not_found' });
        }
        const u = r.rows[0];
        // Get user's roles
        const rolesResult = await db_1.pool.query(`
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [u.id]);
        const roleIds = rolesResult.rows.map((r) => r.id);
        const roleNames = rolesResult.rows.map((r) => r.name);
        // Get union of all permissions from all roles
        const permissions = [];
        if (roleIds.length > 0) {
            const permResult = await db_1.pool.query(`
        SELECT DISTINCT p.resource, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::int[])
      `, [roleIds]);
            permissions.push(...permResult.rows.map((p) => `${p.resource}:${p.action}`));
        }
        const payload = {
            userId: u.id,
            tenantId: u.tenant_id,
            email: u.email,
            roleIds,
            roleNames,
            permissions,
            sessionToken: decoded.sessionToken
        };
        const newAccessToken = (0, jwt_1.generateAccessToken)(payload);
        return res.json({ accessToken: newAccessToken });
    }
    catch (e) {
        logger_1.default.error('/auth/refresh error', e);
        return res.status(500).json({ error: 'server_error' });
    }
});
// Change password endpoint (user self-service)
app.post('/auth/change-password', auth_1.requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'validation_error', message: 'Current and new passwords are required' });
    }
    if (!req.user) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    try {
        // Get user's current password hash
        const userResult = await db_1.pool.query('SELECT id, email, name, password_hash FROM users WHERE id = $1', [req.user.userId]);
        if (!userResult.rows.length) {
            return res.status(404).json({ error: 'user_not_found' });
        }
        const user = userResult.rows[0];
        // Verify current password
        const currentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!currentPasswordValid) {
            return res.status(401).json({ error: 'invalid_password', message: 'Current password is incorrect' });
        }
        // Validate new password strength
        const validation = (0, passwordGenerator_1.validatePasswordStrength)(newPassword);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'weak_password',
                message: validation.errors.join(', ')
            });
        }
        // Check if new password matches any of the last 3 passwords
        const isRecentlyUsed = await (0, passwordHistory_1.isPasswordRecentlyUsed)(user.id, newPassword);
        if (isRecentlyUsed) {
            return res.status(400).json({
                error: 'password_reused',
                message: 'Cannot reuse any of your last 3 passwords'
            });
        }
        // Hash new password
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password and clear password_must_change flag
        await db_1.pool.query(`UPDATE users 
       SET password_hash = $1, password_must_change = FALSE 
       WHERE id = $2`, [newPasswordHash, user.id]);
        // Add to password history
        await (0, passwordHistory_1.addToPasswordHistory)(user.id, newPasswordHash);
        // Log audit
        await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
       VALUES ($1, $2, $3)`, [user.id, 'CHANGE_PASSWORD', JSON.stringify({ userId: user.id, email: user.email })]);
        logger_1.default.info(`✅ Password changed successfully for user ${user.email}`);
        return res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (e) {
        logger_1.default.error('/auth/change-password error', e);
        return res.status(500).json({ error: 'server_error', message: 'Failed to change password' });
    }
});
if (process.env.NODE_ENV !== 'production') {
    app.post('/dev/seed-user', async (req, res) => {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'missing_fields' });
        try {
            const hash = await bcryptjs_1.default.hash(password, 10);
            const r = await db_1.pool.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id', [name, email, hash, role ?? 'user']);
            return res.json({ inserted: r.rowCount });
        }
        catch (e) {
            logger_1.default.error('/dev/seed-user error', e);
            return res.status(500).json({ error: 'server_error' });
        }
    });
    app.post('/dev/upsert-user', async (req, res) => {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'missing_fields' });
        try {
            const hash = await bcryptjs_1.default.hash(password, 10);
            const r = await db_1.pool.query(`INSERT INTO users(name,email,password_hash,role)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(email) DO UPDATE
         SET name=EXCLUDED.name,
             password_hash=EXCLUDED.password_hash,
             role=EXCLUDED.role
         RETURNING id`, [name, email, hash, role ?? 'user']);
            return res.json({ upserted: r.rowCount });
        }
        catch (e) {
            logger_1.default.error('/dev/upsert-user error', e);
            return res.status(500).json({ error: 'server_error' });
        }
    });
}
// Idempotent schema migrations — safe to run on every startup
async function runStartupMigrations() {
    try {
        await db_1.pool.query(`
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
    `);
        logger_1.default.system('✅ Schema migrations applied');
    }
    catch (err) {
        // Non-fatal — log the error but let the server start anyway.
        // Constraint failures (e.g. unexpected duplicates) should not prevent startup.
        logger_1.default.error('⚠️  Schema migration warning (non-fatal):', err);
    }
}
// Async startup function to ensure proper initialization order
async function startServer() {
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    try {
        // Critical path: must complete before the server binds to the port
        logger_1.default.system('🔄 Testing database connection...');
        const testClient = await db_1.pool.connect();
        testClient.release();
        logger_1.default.system('✅ Database connected successfully');
        await runStartupMigrations();
        await (0, ensureRailwayAdmin_1.ensureRailwayAdmin)();
        await (0, tenant_service_1.ensureSuperAdminTrigger)();
        // Bind the port now so Railway health checks pass immediately
        logger_1.default.system(`🔄 Starting HTTP server on port ${port}...`);
        app.listen(port, '0.0.0.0', () => {
            logger_1.default.system(`✅ Server is ready and accepting connections`);
            logger_1.default.system(`🌐 API available at http://localhost:${port}`);
        });
        // Non-critical provisioning runs in the background after the port is bound.
        // These are all idempotent — safe to run concurrently with live traffic.
        setImmediate(async () => {
            try {
                await (0, tenant_service_1.provisionPendingWebsiteUsers)();
                await (0, tenant_service_1.ensureWebsiteUsersHaveSuperAdmin)();
                await (0, tenant_service_1.ensureSuperAdminHasAllPermissions)();
                logger_1.default.system('🔄 Initializing background jobs...');
                (0, reminderCron_1.startReminderCron)();
                (0, purgeTerminatedEmployees_1.startPurgeTerminatedEmployeesJob)();
                logger_1.default.system('✅ Background provisioning complete');
            }
            catch (err) {
                logger_1.default.error('❌ Background provisioning error (non-fatal):', err);
            }
        });
    }
    catch (err) {
        logger_1.default.error('❌ Startup error:', err);
        logger_1.default.error('DATABASE_URL:', process.env.DATABASE_URL ? 'is set' : 'is NOT set');
        process.exit(1);
    }
}
exports.default = app;
if (process.env.NODE_ENV !== 'test') {
    startServer().catch(err => {
        logger_1.default.error('❌ Fatal error during startup:', err);
        process.exit(1);
    });
}
