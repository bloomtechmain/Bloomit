"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const employeeController_1 = require("../controllers/employeeController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Employee routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('employees', 'read'), employeeController_1.getAllEmployees);
router.get('/:id', (0, authorize_1.requirePermission)('employees', 'read'), employeeController_1.getEmployeeById);
router.post('/', (0, authorize_1.requirePermission)('employees', 'create'), employeeController_1.createEmployee);
router.put('/:id', (0, authorize_1.requirePermission)('employees', 'update'), employeeController_1.updateEmployee);
router.delete('/:id', (0, authorize_1.requirePermission)('employees', 'delete'), employeeController_1.deleteEmployee);
exports.default = router;
