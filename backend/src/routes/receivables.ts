import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { createReceivable, getReceivables } from '../controllers/receivableController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Receivables routes with permission-based authorization
router.post('/', requirePermission('receivables', 'create'), createReceivable)
router.get('/', requirePermission('receivables', 'read'), getReceivables)

export default router
