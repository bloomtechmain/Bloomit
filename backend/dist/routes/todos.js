"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const todosController_1 = require("../controllers/todosController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Todos routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('todos', 'read'), todosController_1.getTodos);
router.post('/', (0, authorize_1.requirePermission)('todos', 'create'), todosController_1.createTodo);
router.put('/:id', (0, authorize_1.requirePermission)('todos', 'update'), todosController_1.updateTodo);
router.delete('/:id', (0, authorize_1.requirePermission)('todos', 'delete'), todosController_1.deleteTodo);
router.get('/:id/shares', (0, authorize_1.requirePermission)('todos', 'read'), todosController_1.getTodoShares);
router.post('/:id/share', (0, authorize_1.requirePermission)('todos', 'update'), todosController_1.shareTodo);
router.delete('/:id/share/:shareId', (0, authorize_1.requirePermission)('todos', 'update'), todosController_1.unshareTodo);
exports.default = router;
