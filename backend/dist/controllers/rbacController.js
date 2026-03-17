"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGranularMigration = exports.previewGranularMigration = exports.getMigrationStatus = exports.resetUserPassword = exports.assignRolesToUser = exports.getAllUsersWithRoles = exports.createUser = exports.assignPermissionsToRole = exports.getPermissionsByRole = exports.getAllPermissions = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoleById = exports.getAllRoles = void 0;
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const passwordGenerator_1 = require("../utils/passwordGenerator");
const emailService_1 = require("../utils/emailService");
const passwordHistory_1 = require("../utils/passwordHistory");
const migrateToGranularPermissions_1 = require("../scripts/migrateToGranularPermissions");
// ===== ROLES =====
const getAllRoles = async (req, res) => {
    try {
        const result = await db_1.pool.query(`
      SELECT r.*, 
        COUNT(DISTINCT rp.permission_id) as permission_count,
        COUNT(DISTINCT ur.user_id) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id
      ORDER BY 
        CASE WHEN r.is_system_role THEN 0 ELSE 1 END,
        r.name
    `);
        return res.json({ roles: result.rows });
    }
    catch (error) {
        console.error('Error fetching roles:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to fetch roles' });
    }
};
exports.getAllRoles = getAllRoles;
const getRoleById = async (req, res) => {
    const { id } = req.params;
    try {
        const roleResult = await db_1.pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        if (roleResult.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Role not found' });
        }
        // Get permissions for this role
        const permissionsResult = await db_1.pool.query(`
      SELECT p.id, p.resource, p.action, p.description
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.resource, p.action
    `, [id]);
        return res.json({
            role: roleResult.rows[0],
            permissions: permissionsResult.rows
        });
    }
    catch (error) {
        console.error('Error fetching role:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to fetch role' });
    }
};
exports.getRoleById = getRoleById;
const createRole = async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'validation_error', message: 'Role name is required' });
    }
    try {
        const result = await db_1.pool.query(`INSERT INTO roles (name, description, is_system_role) 
       VALUES ($1, $2, FALSE) 
       RETURNING *`, [name, description || null]);
        // Log audit
        if (req.user) {
            await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
         VALUES ($1, $2, $3)`, [req.user.userId, 'CREATE_ROLE', JSON.stringify({ roleId: result.rows[0].id, roleName: name })]);
        }
        return res.status(201).json({ role: result.rows[0] });
    }
    catch (error) {
        console.error('Error creating role:', error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ error: 'conflict', message: 'Role name already exists' });
        }
        return res.status(500).json({ error: 'server_error', message: 'Failed to create role' });
    }
};
exports.createRole = createRole;
const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'validation_error', message: 'Role name is required' });
    }
    try {
        // Check if role is a system role
        const checkResult = await db_1.pool.query('SELECT is_system_role FROM roles WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Role not found' });
        }
        if (checkResult.rows[0].is_system_role) {
            return res.status(403).json({ error: 'forbidden', message: 'Cannot modify system role' });
        }
        const result = await db_1.pool.query(`UPDATE roles 
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`, [name, description || null, id]);
        // Log audit
        if (req.user) {
            await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
         VALUES ($1, $2, $3)`, [req.user.userId, 'UPDATE_ROLE', JSON.stringify({ roleId: id, changes: { name, description } })]);
        }
        return res.json({ role: result.rows[0] });
    }
    catch (error) {
        console.error('Error updating role:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'conflict', message: 'Role name already exists' });
        }
        return res.status(500).json({ error: 'server_error', message: 'Failed to update role' });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if role is a system role
        const checkResult = await db_1.pool.query('SELECT is_system_role, name FROM roles WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Role not found' });
        }
        if (checkResult.rows[0].is_system_role) {
            return res.status(403).json({ error: 'forbidden', message: 'Cannot delete system role' });
        }
        // Check if role has users
        const usersResult = await db_1.pool.query('SELECT COUNT(*) as count FROM users WHERE role_id = $1', [id]);
        if (parseInt(usersResult.rows[0].count) > 0) {
            return res.status(409).json({
                error: 'conflict',
                message: 'Cannot delete role with assigned users. Reassign users first.'
            });
        }
        await db_1.pool.query('DELETE FROM roles WHERE id = $1', [id]);
        // Log audit
        if (req.user) {
            await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
         VALUES ($1, $2, $3)`, [req.user.userId, 'DELETE_ROLE', JSON.stringify({ roleId: id, roleName: checkResult.rows[0].name })]);
        }
        return res.json({ message: 'Role deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting role:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to delete role' });
    }
};
exports.deleteRole = deleteRole;
// ===== PERMISSIONS =====
const getAllPermissions = async (req, res) => {
    try {
        const result = await db_1.pool.query(`
      SELECT * FROM permissions 
      ORDER BY resource, action
    `);
        return res.json({ permissions: result.rows });
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to fetch permissions' });
    }
};
exports.getAllPermissions = getAllPermissions;
const getPermissionsByRole = async (req, res) => {
    const { roleId } = req.params;
    try {
        const result = await db_1.pool.query(`
      SELECT p.id, p.resource, p.action, p.description
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.resource, p.action
    `, [roleId]);
        return res.json({ permissions: result.rows });
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to fetch permissions' });
    }
};
exports.getPermissionsByRole = getPermissionsByRole;
const assignPermissionsToRole = async (req, res) => {
    const { roleId } = req.params;
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ error: 'validation_error', message: 'permissionIds must be an array' });
    }
    try {
        // Check if role is a system role
        const checkResult = await db_1.pool.query('SELECT is_system_role, name FROM roles WHERE id = $1', [roleId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'Role not found' });
        }
        if (checkResult.rows[0].is_system_role) {
            return res.status(403).json({ error: 'forbidden', message: 'Cannot modify permissions of system role' });
        }
        // Delete existing permissions
        await db_1.pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        // Insert new permissions
        for (const permissionId of permissionIds) {
            await db_1.pool.query(`INSERT INTO role_permissions (role_id, permission_id) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`, [roleId, permissionId]);
        }
        // Log audit
        if (req.user) {
            await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
         VALUES ($1, $2, $3)`, [req.user.userId, 'UPDATE_ROLE_PERMISSIONS', JSON.stringify({
                    roleId,
                    roleName: checkResult.rows[0].name,
                    permissionCount: permissionIds.length
                })]);
        }
        return res.json({ message: 'Permissions updated successfully', count: permissionIds.length });
    }
    catch (error) {
        console.error('Error assigning permissions:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to assign permissions' });
    }
};
exports.assignPermissionsToRole = assignPermissionsToRole;
// ===== USERS =====
const createUser = async (req, res) => {
    const { email, roleIds } = req.body;
    const tenantId = req.user?.tenantId;
    // Validation
    if (!email) {
        return res.status(400).json({ error: 'validation_error', message: 'Email is required' });
    }
    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
        return res.status(400).json({ error: 'validation_error', message: 'At least one role must be assigned' });
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'validation_error', message: 'Invalid email format' });
    }
    try {
        // Enforce plan user limit
        if (tenantId) {
            const planResult = await db_1.pool.query(`SELECT no_of_users FROM public.users
         WHERE tenant_id = $1 AND no_of_users IS NOT NULL
         LIMIT 1`, [tenantId]);
            if (planResult.rows.length > 0 && planResult.rows[0].no_of_users !== null) {
                const userLimit = planResult.rows[0].no_of_users;
                const countResult = await db_1.pool.query(`SELECT COUNT(*) AS total FROM public.users
           WHERE tenant_id = $1 AND (account_status IS NULL OR account_status != 'terminated')`, [tenantId]);
                const currentCount = parseInt(countResult.rows[0].total, 10);
                if (currentCount >= userLimit) {
                    return res.status(403).json({
                        error: 'user_limit_reached',
                        message: `Your plan allows a maximum of ${userLimit} user${userLimit === 1 ? '' : 's'}. You have reached this limit. Please upgrade your plan to add more users.`,
                        limit: userLimit,
                        current: currentCount
                    });
                }
            }
        }
        // Check if email already exists within this tenant
        const existingUser = await db_1.pool.query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'conflict', message: 'Email already exists' });
        }
        // Verify all roles exist
        const rolesResult = await db_1.pool.query('SELECT id, name FROM roles WHERE id = ANY($1::int[])', [roleIds]);
        if (rolesResult.rows.length !== roleIds.length) {
            return res.status(404).json({ error: 'not_found', message: 'One or more roles not found' });
        }
        // Generate secure temporary password
        const temporaryPassword = (0, passwordGenerator_1.generateSecurePassword)(12);
        const passwordHash = await bcryptjs_1.default.hash(temporaryPassword, 10);
        // Create user
        const userResult = await db_1.pool.query(`INSERT INTO users (name, email, password_hash, password_must_change, created_at, tenant_id, source)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP, $4, 'internal')
       RETURNING id, name, email, created_at`, [email, email, passwordHash, tenantId]);
        const newUser = userResult.rows[0];
        // Assign roles
        for (const roleId of roleIds) {
            await db_1.pool.query(`INSERT INTO user_roles (user_id, role_id) 
         VALUES ($1, $2)`, [newUser.id, roleId]);
        }
        // Add initial password to history
        await (0, passwordHistory_1.addToPasswordHistory)(newUser.id, passwordHash);
        // Send welcome email (don't fail user creation if email fails)
        const emailResult = await (0, emailService_1.sendWelcomeEmail)(email, temporaryPassword);
        // Log audit
        if (req.user) {
            await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
         VALUES ($1, $2, $3)`, [
                req.user.userId,
                'CREATE_USER',
                JSON.stringify({
                    newUserId: newUser.id,
                    newUserEmail: email,
                    roleIds,
                    emailSent: emailResult.success
                })
            ]);
        }
        return res.status(201).json({
            user: newUser,
            temporaryPassword, // Return password so admin can copy it
            emailSent: emailResult.success,
            emailError: emailResult.error,
            roleCount: roleIds.length
        });
    }
    catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to create user' });
    }
};
exports.createUser = createUser;
const getAllUsersWithRoles = async (req, res) => {
    const tenantId = req.user?.tenantId;
    try {
        const usersResult = await db_1.pool.query(`
      SELECT u.id, u.name, u.email, u.created_at
      FROM users u
      WHERE u.tenant_id = $1
      ORDER BY u.created_at DESC
    `, [tenantId]);
        const users = await Promise.all(usersResult.rows.map(async (user) => {
            const rolesResult = await db_1.pool.query(`
        SELECT r.id, r.name, r.is_system_role
        FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY r.name
      `, [user.id]);
            return {
                ...user,
                roles: rolesResult.rows
            };
        }));
        return res.json({ users });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to fetch users' });
    }
};
exports.getAllUsersWithRoles = getAllUsersWithRoles;
const assignRolesToUser = async (req, res) => {
    const { userId } = req.params;
    const { roleIds } = req.body;
    const tenantId = req.user?.tenantId;
    if (!Array.isArray(roleIds)) {
        return res.status(400).json({ error: 'validation_error', message: 'roleIds must be an array' });
    }
    try {
        // Check if user exists within this tenant
        const userResult = await db_1.pool.query('SELECT id, name, email FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'User not found' });
        }
        // Verify all roles exist
        if (roleIds.length > 0) {
            const rolesResult = await db_1.pool.query('SELECT id, name FROM roles WHERE id = ANY($1::int[])', [roleIds]);
            if (rolesResult.rows.length !== roleIds.length) {
                return res.status(404).json({ error: 'not_found', message: 'One or more roles not found' });
            }
        }
        // Delete existing role assignments
        await db_1.pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
        // Insert new role assignments
        for (const roleId of roleIds) {
            await db_1.pool.query(`INSERT INTO user_roles (user_id, role_id) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`, [userId, roleId]);
        }
        // Log audit
        if (req.user) {
            await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
         VALUES ($1, $2, $3)`, [req.user.userId, 'ASSIGN_ROLES', JSON.stringify({
                    targetUserId: userId,
                    targetUserName: userResult.rows[0].name,
                    roleIds,
                    roleCount: roleIds.length
                })]);
        }
        return res.json({
            message: 'Roles assigned successfully',
            user: userResult.rows[0],
            roleCount: roleIds.length
        });
    }
    catch (error) {
        console.error('Error assigning roles:', error);
        return res.status(500).json({ error: 'server_error', message: 'Failed to assign roles' });
    }
};
exports.assignRolesToUser = assignRolesToUser;
const resetUserPassword = async (req, res) => {
    const { userId } = req.params;
    const tenantId = req.user?.tenantId;
    try {
        // Check if user exists within this tenant
        const userResult = await db_1.pool.query('SELECT id, name, email FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'not_found', message: 'User not found' });
        }
        const user = userResult.rows[0];
        // Generate new secure temporary password
        let temporaryPassword = (0, passwordGenerator_1.generateSecurePassword)(12);
        // Check if password matches recent passwords, regenerate if needed
        let attempts = 0;
        try {
            while (attempts < 5) {
                const isRecent = await (0, passwordHistory_1.isPasswordRecentlyUsed)(user.id, temporaryPassword);
                if (!isRecent)
                    break;
                temporaryPassword = (0, passwordGenerator_1.generateSecurePassword)(12);
                attempts++;
            }
        }
        catch (historyError) {
            console.warn('Password history check failed, continuing with generated password:', historyError);
            // Continue with the generated password even if history check fails
        }
        const passwordHash = await bcryptjs_1.default.hash(temporaryPassword, 10);
        // Update user password and set password_must_change flag
        await db_1.pool.query(`UPDATE users 
       SET password_hash = $1, password_must_change = TRUE 
       WHERE id = $2`, [passwordHash, user.id]);
        // Add to password history (with error handling)
        try {
            await (0, passwordHistory_1.addToPasswordHistory)(user.id, passwordHash);
        }
        catch (historyError) {
            console.error('Failed to add to password history, but password reset continues:', historyError);
            // Don't fail the password reset if history update fails
        }
        // Send password reset email
        const emailResult = await (0, emailService_1.sendPasswordResetEmail)(user.email, user.name, temporaryPassword);
        // Log audit
        try {
            if (req.user) {
                await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
           VALUES ($1, $2, $3)`, [
                    req.user.userId,
                    'RESET_USER_PASSWORD',
                    JSON.stringify({
                        targetUserId: user.id,
                        targetUserEmail: user.email,
                        emailSent: emailResult.success
                    })
                ]);
            }
        }
        catch (auditError) {
            console.error('Failed to log audit entry:', auditError);
            // Don't fail the password reset if audit fails
        }
        console.log(`✅ Password reset for user ${user.email}`);
        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            temporaryPassword, // Return password so admin can copy it
            emailSent: emailResult.success,
            emailError: emailResult.error
        });
    }
    catch (error) {
        console.error('Error resetting user password:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to reset password',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.resetUserPassword = resetUserPassword;
// ===== GRANULAR PERMISSION MIGRATION =====
const getMigrationStatus = async (req, res) => {
    try {
        const status = await (0, migrateToGranularPermissions_1.checkMigrationStatus)();
        return res.json(status);
    }
    catch (error) {
        console.error('Error checking migration status:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to check migration status'
        });
    }
};
exports.getMigrationStatus = getMigrationStatus;
const previewGranularMigration = async (req, res) => {
    try {
        const preview = await (0, migrateToGranularPermissions_1.previewMigration)();
        if (!preview.success) {
            return res.status(500).json({
                error: 'server_error',
                message: preview.error || 'Failed to preview migration'
            });
        }
        return res.json(preview);
    }
    catch (error) {
        console.error('Error previewing migration:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to preview migration'
        });
    }
};
exports.previewGranularMigration = previewGranularMigration;
const executeGranularMigration = async (req, res) => {
    try {
        console.log('🚀 Starting granular permission migration...');
        const result = await (0, migrateToGranularPermissions_1.executeMigration)();
        if (!result.success) {
            return res.status(500).json({
                error: 'migration_failed',
                message: result.error || 'Migration failed'
            });
        }
        // Log audit
        if (req.user && result.report) {
            await db_1.pool.query(`INSERT INTO rbac_audit_log (user_id, action, details) 
         VALUES ($1, $2, $3)`, [
                req.user.userId,
                'MIGRATE_GRANULAR_PERMISSIONS',
                JSON.stringify({
                    permissionsAdded: result.report.permissionsAdded,
                    rolesUpdated: result.report.rolesUpdated,
                    timestamp: new Date().toISOString()
                })
            ]);
        }
        console.log('✅ Granular permission migration completed successfully');
        return res.json({
            success: true,
            message: 'Migration completed successfully',
            report: result.report || { permissionsAdded: 0, permissionsSkipped: 0, rolesUpdated: 0, permissionIdsAdded: [], errors: [] }
        });
    }
    catch (error) {
        console.error('Error executing migration:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Failed to execute migration',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.executeGranularMigration = executeGranularMigration;
