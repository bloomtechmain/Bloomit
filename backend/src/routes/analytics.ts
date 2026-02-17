import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { 
  getAnalyticsSummary,
  getProjectProfitability,
  getARAgingReport,
  getRecurringRevenue,
  getSalesPipeline,
  getProfitLoss
} from '../controllers/analyticsController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Analytics routes with permission-based authorization
router.get('/summary', requirePermission('analytics', 'read'), getAnalyticsSummary)
router.get('/project-profitability', requirePermission('analytics', 'read'), getProjectProfitability)
router.get('/ar-aging', requirePermission('analytics', 'read'), getARAgingReport)
router.get('/recurring-revenue', requirePermission('analytics', 'read'), getRecurringRevenue)
router.get('/pipeline', requirePermission('analytics', 'read'), getSalesPipeline)
router.get('/profit-loss', requirePermission('analytics', 'read'), getProfitLoss)

export default router
