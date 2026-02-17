"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
exports.requireRole = requireRole;
exports.requireSuperAdmin = requireSuperAdmin;
exports.requireSettingsManage = requireSettingsManage;
/**
 * Authorization middleware - Checks if user has specific permission
 * Must be used AFTER requireAuth middleware
 */
function requirePermission(resource, action) {
    return (req, res, next) => {
        if (!req.user) {
            console.log('❌ AUTHORIZE DEBUG - No req.user found!');
            return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        }
        const requiredPermission = `${resource}:${action}`;
        console.log('🔍 AUTHORIZE DEBUG - Required permission:', requiredPermission);
        console.log('👤 AUTHORIZE DEBUG - User permissions count:', req.user.permissions?.length || 0);
        console.log('✅ AUTHORIZE DEBUG - Has permission?', req.user.permissions?.includes(requiredPermission));
        // Check if user has the required permission
        if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
            console.log('❌ AUTHORIZE DEBUG - DENIED! User permissions:', req.user.permissions?.slice(0, 10));
            return res.status(403).json({
                error: 'forbidden',
                message: `You don't have permission to ${action} ${resource}`,
                required: requiredPermission
            });
        }
        console.log('✅ AUTHORIZE DEBUG - Permission granted!');
        next();
    };
}
/**
 * Check if user has any of the specified roles
 * Must be used AFTER requireAuth middleware
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        }
        // Check if user has any of the required roles
        const hasRequiredRole = req.user.roleNames.some(roleName => roles.includes(roleName));
        if (!hasRequiredRole) {
            return res.status(403).json({
                error: 'forbidden',
                message: `This action requires one of these roles: ${roles.join(', ')}`,
                required: roles,
                current: req.user.roleNames
            });
        }
        next();
    };
}
/**
 * Check if user is Super Admin (for critical system operations)
 */
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    }
    if (!req.user.roleNames.includes('Super Admin')) {
        return res.status(403).json({
            error: 'forbidden',
            message: 'This action requires Super Admin privileges'
        });
    }
    next();
}
/**
 * Check if user has settings management permission (for RBAC operations)
 */
function requireSettingsManage(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    }
    if (!req.user.permissions || !req.user.permissions.includes('settings:manage')) {
        return res.status(403).json({
            error: 'forbidden',
            message: 'You don\'t have permission to manage settings'
        });
    }
    next();
}
