import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { getAssets, createAsset, getDepreciationSchedule } from '../controllers/assetsController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Assets routes with permission-based authorization
router.get('/', requirePermission('assets', 'read'), getAssets)
router.post('/', requirePermission('assets', 'create'), createAsset)
router.get('/:id/depreciation-schedule', requirePermission('assets', 'read'), getDepreciationSchedule)

export default router
