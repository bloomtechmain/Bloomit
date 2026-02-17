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
app.use(express_1.default.json());
// Root endpoint for Railway health checks
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Bloomtech ERP API',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});
app.use('/employees', employees_1.default);
app.use('/projects-old', projects_1.default); // Legacy endpoint for backward compatibility
app.use('/projects', newProjects_1.default); // New 3-level hierarchy
app.use('/accounts', accounts_1.default);
app.use('/vendors', vendors_1.default);
app.use('/payables', payables_1.default);
app.use('/petty-cash', pettyCash_1.default);
app.use('/receivables', receivables_1.default);
app.use('/assets', assets_1.default);
app.use('/analytics', analytics_1.default);
app.use('/notes', notes_1.default);
app.use('/todos', todos_1.default);
app.use('/rbac', rbac_1.default);
app.use('/settings', settings_1.default);
app.use('/time-entries', timeEntries_1.default);
app.use('/pto-requests', ptoRequests_1.default);
app.use('/subscriptions', subscriptions_1.default);
app.use('/documents', documents_1.default);
app.use('/quotes', quotes_1.default);
app.use('/purchase-orders', purchaseOrders_1.default);
app.use('/payroll', auth_1.requireAuth, payroll_1.default);
app.use('/api/employee-portal', auth_1.requireAuth, employeePortal_1.default);
app.use('/api/employee-onboarding', employeeOnboarding_1.default);
app.use('/loans', loans_1.default);
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'missing_fields' });
    try {
        // Get user
        const r = await db_1.pool.query(`
      SELECT u.id, u.name, u.email, u.password_hash, 
             COALESCE(u.password_must_change, FALSE) as password_must_change
      FROM users u
      WHERE u.email = $1 OR u.name = $1
      LIMIT 1
    `, [email]);
        if (!r.rows.length)
            return res.status(401).json({ error: 'invalid_credentials' });
        const u = r.rows[0];
        const ok = await bcryptjs_1.default.compare(password, u.password_hash);
        if (!ok)
            return res.status(401).json({ error: 'invalid_credentials' });
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
        // Generate JWT tokens
        const payload = {
            userId: u.id,
            email: u.email,
            roleIds,
            roleNames,
            permissions
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
                password_must_change: u.password_must_change
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
        // Generate new access token with current permissions
        const r = await db_1.pool.query(`
      SELECT u.id, u.name, u.email
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
            email: u.email,
            roleIds,
            roleNames,
            permissions
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
// Async startup function to ensure proper initialization order
async function startServer() {
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    try {
        // First, test database connection
        logger_1.default.system('🔄 Testing database connection...');
        await db_1.pool.connect();
        logger_1.default.system('✅ Database connected successfully');
        // Ensure Railway admin user exists (production only)
        await (0, ensureRailwayAdmin_1.ensureRailwayAdmin)();
        // Start background jobs (Railway-compatible)
        logger_1.default.system('🔄 Initializing background jobs...');
        (0, reminderCron_1.startReminderCron)();
        (0, purgeTerminatedEmployees_1.startPurgeTerminatedEmployeesJob)();
        // Then start the HTTP server
        logger_1.default.system(`🔄 Starting HTTP server on port ${port}...`);
        app.listen(port, '0.0.0.0', () => {
            logger_1.default.system(`✅ Server is ready and accepting connections`);
            logger_1.default.system(`🌐 API available at http://localhost:${port}`);
            logger_1.default.system(`🎯 Health check endpoint: http://localhost:${port}/`);
        });
    }
    catch (err) {
        logger_1.default.error('❌ Startup error:', err);
        logger_1.default.error('DATABASE_URL:', process.env.DATABASE_URL ? 'is set' : 'is NOT set');
        process.exit(1);
    }
}
// Start the server
startServer().catch(err => {
    logger_1.default.error('❌ Fatal error during startup:', err);
    process.exit(1);
});
