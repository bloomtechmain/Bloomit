import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employeeController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Employee routes with permission-based authorization
router.get('/', requirePermission('employees', 'read'), getAllEmployees)
router.get('/:id', requirePermission('employees', 'read'), getEmployeeById)
router.post('/', requirePermission('employees', 'create'), createEmployee)
router.put('/:id', requirePermission('employees', 'update'), updateEmployee)
router.delete('/:id', requirePermission('employees', 'delete'), deleteEmployee)

export default router


