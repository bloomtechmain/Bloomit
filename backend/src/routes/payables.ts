import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { getAllPayables, createPayable, updatePayable, deletePayable } from '../controllers/payableController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Payables routes with permission-based authorization
router.get('/', requirePermission('payables', 'read'), getAllPayables)
router.post('/', requirePermission('payables', 'create'), createPayable)
router.put('/:id', requirePermission('payables', 'update'), updatePayable)
router.delete('/:id', requirePermission('payables', 'delete'), deletePayable)

export default router
