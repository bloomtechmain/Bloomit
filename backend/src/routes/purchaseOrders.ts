import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  uploadReceipt,
  downloadReceipt,
  getNextPoNumber,
  deletePurchaseOrder
} from '../controllers/purchaseOrdersController'

const router = Router()

// Configure multer for file uploads (memory storage - files stored in buffer)
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// Routes with permission-based authorization
router.get('/', requireAuth, requirePermission('purchase_orders', 'read'), getAllPurchaseOrders)
router.get('/next-po-number', requireAuth, requirePermission('purchase_orders', 'create'), getNextPoNumber)
router.get('/:id', requireAuth, requirePermission('purchase_orders', 'read'), getPurchaseOrderById)
router.get('/:id/download-receipt', requireAuth, requirePermission('purchase_orders', 'read'), downloadReceipt)
router.post('/', requireAuth, requirePermission('purchase_orders', 'create'), createPurchaseOrder)
router.put('/:id', requirePermission('purchase_orders', 'update'), updatePurchaseOrder)
router.post('/:id/upload-receipt', requireAuth, requirePermission('purchase_orders', 'upload_receipt'), upload.single('receipt'), uploadReceipt)

// Admin-only routes (approval/rejection requires specific permissions)
router.post('/:id/approve', requireAuth, requirePermission('purchase_orders', 'approve'), approvePurchaseOrder)
router.post('/:id/reject', requireAuth, requirePermission('purchase_orders', 'reject'), rejectPurchaseOrder)
router.delete('/:id', requireAuth, requirePermission('purchase_orders', 'delete'), deletePurchaseOrder)

export default router
