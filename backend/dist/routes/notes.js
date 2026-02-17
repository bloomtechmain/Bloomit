"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const notesController_1 = require("../controllers/notesController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Notes routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('notes', 'read'), notesController_1.getNotes);
router.post('/', (0, authorize_1.requirePermission)('notes', 'create'), notesController_1.createNote);
router.put('/:id', (0, authorize_1.requirePermission)('notes', 'update'), notesController_1.updateNote);
router.delete('/:id', (0, authorize_1.requirePermission)('notes', 'delete'), notesController_1.deleteNote);
router.get('/:id/shares', (0, authorize_1.requirePermission)('notes', 'read'), notesController_1.getNoteShares);
router.post('/:id/share', (0, authorize_1.requirePermission)('notes', 'update'), notesController_1.shareNote);
router.delete('/:id/share/:shareId', (0, authorize_1.requirePermission)('notes', 'update'), notesController_1.unshareNote);
exports.default = router;
