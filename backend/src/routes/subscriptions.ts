import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { 
  getAllSubscriptions, 
  getSubscriptionById, 
  createSubscription, 
  updateSubscription, 
  deleteSubscription 
} from '../controllers/subscriptionsController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Subscriptions routes with permission-based authorization
router.get('/', requirePermission('subscriptions', 'read'), getAllSubscriptions)
router.get('/:id', requirePermission('subscriptions', 'read'), getSubscriptionById)
router.post('/', requirePermission('subscriptions', 'create'), createSubscription)
router.put('/:id', requirePermission('subscriptions', 'update'), updateSubscription)
router.delete('/:id', requirePermission('subscriptions', 'delete'), deleteSubscription)

export default router
