"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const documentsController_1 = require("../controllers/documentsController");
const router = (0, express_1.Router)();
// Configure multer to use memory storage (files stored in buffer)
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
// All routes require authentication
router.use(auth_1.requireAuth);
// Get all documents (accessible to all authenticated users)
router.get('/', documentsController_1.getAllDocuments);
// Download document (accessible to all authenticated users)
router.get('/:id/download', documentsController_1.downloadDocument);
// Upload document (admin and super admin only)
router.post('/upload', (0, authorize_1.requireRole)('Admin', 'Super Admin'), upload.single('file'), documentsController_1.uploadDocument);
// Delete document (admin and super admin only)
router.delete('/:id', (0, authorize_1.requireRole)('Admin', 'Super Admin'), documentsController_1.deleteDocument);
exports.default = router;
