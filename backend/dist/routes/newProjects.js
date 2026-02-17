"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const newProjectsController_1 = require("../controllers/newProjectsController");
const contractsController_1 = require("../controllers/contractsController");
const contractItemsController_1 = require("../controllers/contractItemsController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Projects routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('projects', 'read'), newProjectsController_1.getAllProjects);
router.post('/', (0, authorize_1.requirePermission)('projects', 'create'), newProjectsController_1.createProject);
router.get('/:id', (0, authorize_1.requirePermission)('projects', 'read'), newProjectsController_1.getProjectById);
router.put('/:id', (0, authorize_1.requirePermission)('projects', 'update'), newProjectsController_1.updateProject);
router.delete('/:id', (0, authorize_1.requirePermission)('projects', 'delete'), newProjectsController_1.deleteProject);
// Contracts routes (nested under projects)
router.get('/:projectId/contracts', (0, authorize_1.requirePermission)('projects', 'read'), contractsController_1.getContractsByProject);
router.post('/:projectId/contracts', (0, authorize_1.requirePermission)('projects', 'create'), contractsController_1.createContract);
router.get('/:projectId/contracts/:contractId', (0, authorize_1.requirePermission)('projects', 'read'), contractsController_1.getContractById);
router.put('/:projectId/contracts/:contractId', (0, authorize_1.requirePermission)('projects', 'update'), contractsController_1.updateContract);
router.delete('/:projectId/contracts/:contractId', (0, authorize_1.requirePermission)('projects', 'delete'), contractsController_1.deleteContract);
// Contract items routes (nested under contracts)
router.get('/:projectId/contracts/:contractId/items', (0, authorize_1.requirePermission)('projects', 'read'), contractItemsController_1.getItemsByContract);
router.post('/:projectId/contracts/:contractId/items', (0, authorize_1.requirePermission)('projects', 'create'), contractItemsController_1.createItem);
router.put('/:projectId/contracts/:contractId/items/:requirements', (0, authorize_1.requirePermission)('projects', 'update'), contractItemsController_1.updateItem);
router.delete('/:projectId/contracts/:contractId/items/:requirements', (0, authorize_1.requirePermission)('projects', 'delete'), contractItemsController_1.deleteItem);
exports.default = router;
