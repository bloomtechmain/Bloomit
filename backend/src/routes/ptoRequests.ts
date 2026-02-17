import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  getAllPTORequests,
  getMyPTORequests,
  getPendingPTORequests,
  createPTORequest,
  updatePTORequest,
  deletePTORequest,
  approvePTORequest,
  denyPTORequest,
  getPTOStats
} from '../controllers/ptoRequestsController'

const router = Router()

// Apply authentication middleware to all routes
router.use(requireAuth)

// Get all PTO requests (managers)
router.get('/', getAllPTORequests)

// Get employee's own PTO requests
router.get('/my/:employeeId', getMyPTORequests)

// Get pending PTO requests (manager approval)
router.get('/pending', getPendingPTORequests)

// Get PTO statistics for an employee
router.get('/stats/:employeeId', getPTOStats)

// Create PTO request
router.post('/', createPTORequest)

// Update PTO request
router.put('/:id', updatePTORequest)

// Delete PTO request
router.delete('/:id', deletePTORequest)

// Approve PTO request
router.post('/:id/approve', approvePTORequest)

// Deny PTO request
router.post('/:id/deny', denyPTORequest)

export default router
