import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { getSettings, getSettingByKey, updateSetting, createSetting } from '../controllers/settingsController'

const router = Router()

// All settings routes require authentication
router.use(requireAuth)

// GET /api/settings - Get all settings (anyone can view)
router.get('/', getSettings)

// GET /api/settings/:key - Get specific setting (anyone can view)
router.get('/:key', getSettingByKey)

// PUT /api/settings/:key - Update setting (requires settings:manage permission)
router.put('/:key', requirePermission('settings', 'manage'), updateSetting)

// POST /api/settings - Create new setting (requires settings:manage permission)
router.post('/', requirePermission('settings', 'manage'), createSetting)

export default router
