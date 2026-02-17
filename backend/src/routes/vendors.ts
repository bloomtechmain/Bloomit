import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { getAllVendors, createVendor } from '../controllers/vendorController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Vendor routes with permission-based authorization
router.get('/', requirePermission('vendors', 'read'), getAllVendors)
router.post('/', requirePermission('vendors', 'create'), createVendor)

export default router
