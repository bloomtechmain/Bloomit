import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { replenishPettyCash, getPettyCashBalance, addPettyCashBill, getPettyCashTransactions } from '../controllers/pettyCashController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Petty cash routes with permission-based authorization
router.post('/replenish', requirePermission('petty_cash', 'replenish'), replenishPettyCash)
router.get('/balance', requirePermission('petty_cash', 'read'), getPettyCashBalance)
router.post('/bill', requirePermission('petty_cash', 'create_bill'), addPettyCashBill)
router.get('/transactions', requirePermission('petty_cash', 'read'), getPettyCashTransactions)

export default router
