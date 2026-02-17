import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import {
  createLoan,
  getLoans,
  getLoanById,
  getLoanSummary,
  updateLoan,
  deleteLoan,
  recordInstallmentPayment,
  getInstallments,
  updateInstallment
} from '../controllers/loansController'

const router = Router()

// All routes require authentication and loans:view permission minimum
router.use(requireAuth)

// Get all loans - requires loans:view
router.get('/', requirePermission('loans', 'read'), getLoans)

// Get single loan details - requires loans:view
router.get('/:id', requirePermission('loans', 'read'), getLoanById)

// Get loan summary with calculations - requires loans:view
router.get('/:id/summary', requirePermission('loans', 'read'), getLoanSummary)

// Create new loan - requires loans:create
router.post('/', requirePermission('loans', 'create'), createLoan)

// Update loan - requires loans:update
router.put('/:id', requirePermission('loans', 'update'), updateLoan)

// Delete loan - requires loans:delete
router.delete('/:id', requirePermission('loans', 'delete'), deleteLoan)

// Get installments for a loan - requires loans:view
router.get('/:id/installments', requirePermission('loans', 'read'), getInstallments)

// Record installment payment - requires loans:manage_installments
router.post('/:id/installments', requirePermission('loans', 'manage_installments'), recordInstallmentPayment)

// Update installment - requires loans:manage_installments
router.put('/:id/installments/:installmentId', requirePermission('loans', 'manage_installments'), updateInstallment)

export default router
