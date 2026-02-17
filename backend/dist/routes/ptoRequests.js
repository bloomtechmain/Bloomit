"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const ptoRequestsController_1 = require("../controllers/ptoRequestsController");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_1.requireAuth);
// Get all PTO requests (managers)
router.get('/', ptoRequestsController_1.getAllPTORequests);
// Get employee's own PTO requests
router.get('/my/:employeeId', ptoRequestsController_1.getMyPTORequests);
// Get pending PTO requests (manager approval)
router.get('/pending', ptoRequestsController_1.getPendingPTORequests);
// Get PTO statistics for an employee
router.get('/stats/:employeeId', ptoRequestsController_1.getPTOStats);
// Create PTO request
router.post('/', ptoRequestsController_1.createPTORequest);
// Update PTO request
router.put('/:id', ptoRequestsController_1.updatePTORequest);
// Delete PTO request
router.delete('/:id', ptoRequestsController_1.deletePTORequest);
// Approve PTO request
router.post('/:id/approve', ptoRequestsController_1.approvePTORequest);
// Deny PTO request
router.post('/:id/deny', ptoRequestsController_1.denyPTORequest);
exports.default = router;
