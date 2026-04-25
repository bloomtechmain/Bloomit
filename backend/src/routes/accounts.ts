import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { openAccount, getAccounts, deleteAccount } from '../controllers/accountsController'
import { createDebitCard, getDebitCards } from '../controllers/debitCardController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Bank account routes with permission-based authorization
router.post('/open-account', requirePermission('accounts', 'create'), openAccount)
router.get('/', requirePermission('accounts', 'read'), getAccounts)
router.delete('/:id', requirePermission('accounts', 'delete'), deleteAccount)
router.post('/debit-cards', requirePermission('debit_cards', 'create'), createDebitCard)
router.get('/debit-cards', requirePermission('debit_cards', 'read'), getDebitCards)

export default router
