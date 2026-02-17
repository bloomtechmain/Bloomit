import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireSettingsManage } from '../middleware/authorize'
import {
  onboardEmployee,
  getAllEmployeesWithUserStatus,
  getFullEmployeeProfile,
  linkEmployeeToUser,
  updateEmployeeProfile,
  generateEmployeeNumber,
  suspendEmployee,
  reactivateEmployee,
  terminateEmployee
} from '../controllers/employeeOnboardingController'

const router = Router()

// All routes require authentication and settings:manage permission
router.use(requireAuth)
router.use(requireSettingsManage)

// Employee onboarding routes
router.post('/onboard', onboardEmployee)
router.get('/list', getAllEmployeesWithUserStatus)
router.get('/generate-number', generateEmployeeNumber)
router.get('/:id/profile', getFullEmployeeProfile)
router.put('/:id/profile', updateEmployeeProfile)
router.post('/:employeeId/link-user', linkEmployeeToUser)

// Account status management routes
router.put('/:id/suspend', suspendEmployee)
router.put('/:id/reactivate', reactivateEmployee)
router.delete('/:id/terminate', terminateEmployee)

export default router
