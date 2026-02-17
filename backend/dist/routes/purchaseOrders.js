"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const purchaseOrdersController_1 = require("../controllers/purchaseOrdersController");
const router = (0, express_1.Router)();
// Configure multer for file uploads (memory storage - files stored in buffer)
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
// Routes with permission-based authorization
router.get('/', auth_1.requireAuth, (0, authorize_1.requirePermission)('purchase_orders', 'read'), purchaseOrdersController_1.getAllPurchaseOrders);
router.get('/next-po-number', auth_1.requireAuth, (0, authorize_1.requirePermission)('purchase_orders', 'create'), purchaseOrdersController_1.getNextPoNumber);
router.get('/:id', auth_1.requireAuth, (0, authorize_1.requirePermission)('purchase_orders', 'read'), purchaseOrdersController_1.getPurchaseOrderById);
router.get('/:id/download-receipt', auth_1.requireAuth, (0, authorize_1.requirePermission)('purchase_orders', 'read'), purchaseOrdersController_1.downloadReceipt);
router.post('/', auth_1.requireAuth, (0, authorize_1.requirePermission)('purchase_orders', 'create'), purchaseOrdersController_1.createPurchaseOrder);
router.put('/:id', (0, authorize_1.requirePermission)('purchase_orders', 'update'), purchaseOrdersController_1.updatePurchaseOrder);
router.post('/:id/upload-receipt', auth_1.requireAuth, (0, authorize_1.requirePermission)('purchase_orders', 'upload_receipt'), upload.single('receipt'), purchaseOrdersController_1.uploadReceipt);
// Admin-only routes (approval/rejection requires specific permissions)
router.post('/:id/approve', auth_1.requireAuth, (0, authorize_1.requirePermission)('purchase_orders', 'approve'), purchaseOrdersController_1.approvePurchaseOrder);
router.post('/:id/reject', auth_1.requireAuth, (0, authorize_1.requirePermission)('purchase_orders', 'reject'), purchaseOrdersController_1.rejectPurchaseOrder);
exports.default = router;
