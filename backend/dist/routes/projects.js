"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const projectsController_1 = require("../controllers/projectsController");
const projectItemsController_1 = require("../controllers/projectItemsController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Project routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('projects', 'read'), projectsController_1.getAllProjects);
router.post('/', (0, authorize_1.requirePermission)('projects', 'create'), projectsController_1.createProject);
router.get('/:id', (0, authorize_1.requirePermission)('projects', 'read'), projectsController_1.getProjectById);
router.put('/:id', (0, authorize_1.requirePermission)('projects', 'update'), projectsController_1.updateProject);
router.delete('/:id', (0, authorize_1.requirePermission)('projects', 'delete'), projectsController_1.deleteProject);
// Project items
router.get('/:id/items', (0, authorize_1.requirePermission)('projects', 'read'), projectItemsController_1.getItemsByProject);
router.post('/:id/items', (0, authorize_1.requirePermission)('projects', 'create'), projectItemsController_1.createItem);
router.put('/:projectId/items/:requirements', (0, authorize_1.requirePermission)('projects', 'update'), projectItemsController_1.updateItem);
router.delete('/:projectId/items/:requirements', (0, authorize_1.requirePermission)('projects', 'delete'), projectItemsController_1.deleteItem);
exports.default = router;
