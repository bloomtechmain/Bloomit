"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const employeeOnboardingController_1 = require("../controllers/employeeOnboardingController");
const router = (0, express_1.Router)();
// All routes require authentication and settings:manage permission
router.use(auth_1.requireAuth);
router.use(authorize_1.requireSettingsManage);
// Employee onboarding routes
router.post('/onboard', employeeOnboardingController_1.onboardEmployee);
router.get('/list', employeeOnboardingController_1.getAllEmployeesWithUserStatus);
router.get('/generate-number', employeeOnboardingController_1.generateEmployeeNumber);
router.get('/:id/profile', employeeOnboardingController_1.getFullEmployeeProfile);
router.put('/:id/profile', employeeOnboardingController_1.updateEmployeeProfile);
router.post('/:employeeId/link-user', employeeOnboardingController_1.linkEmployeeToUser);
// Account status management routes
router.put('/:id/suspend', employeeOnboardingController_1.suspendEmployee);
router.put('/:id/reactivate', employeeOnboardingController_1.reactivateEmployee);
router.delete('/:id/terminate', employeeOnboardingController_1.terminateEmployee);
exports.default = router;
