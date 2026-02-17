"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const rbacController_1 = require("../controllers/rbacController");
const router = (0, express_1.Router)();
// Public endpoint for sharing - only requires authentication
router.get('/users/for-sharing', auth_1.requireAuth, rbacController_1.getAllUsersWithRoles);
// All other RBAC routes require authentication and settings:manage permission
router.use(auth_1.requireAuth);
router.use(authorize_1.requireSettingsManage);
// Role routes
router.get('/roles', rbacController_1.getAllRoles);
router.get('/roles/:id', rbacController_1.getRoleById);
router.post('/roles', rbacController_1.createRole);
router.put('/roles/:id', rbacController_1.updateRole);
router.delete('/roles/:id', rbacController_1.deleteRole);
// Permission routes
router.get('/permissions', rbacController_1.getAllPermissions);
router.get('/roles/:roleId/permissions', rbacController_1.getPermissionsByRole);
router.post('/roles/:roleId/permissions', rbacController_1.assignPermissionsToRole);
// User management routes
router.post('/users', rbacController_1.createUser);
router.get('/users', rbacController_1.getAllUsersWithRoles);
router.put('/users/:userId/roles', rbacController_1.assignRolesToUser);
router.post('/users/:userId/reset-password', rbacController_1.resetUserPassword);
exports.default = router;
