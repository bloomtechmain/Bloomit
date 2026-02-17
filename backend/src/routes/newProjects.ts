import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { getAllProjects, createProject, getProjectById, updateProject, deleteProject } from '../controllers/newProjectsController'
import { getContractsByProject, createContract, getContractById, updateContract, deleteContract } from '../controllers/contractsController'
import { getItemsByContract, createItem, updateItem, deleteItem } from '../controllers/contractItemsController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Projects routes with permission-based authorization
router.get('/', requirePermission('projects', 'read'), getAllProjects)
router.post('/', requirePermission('projects', 'create'), createProject)
router.get('/:id', requirePermission('projects', 'read'), getProjectById)
router.put('/:id', requirePermission('projects', 'update'), updateProject)
router.delete('/:id', requirePermission('projects', 'delete'), deleteProject)

// Contracts routes (nested under projects)
router.get('/:projectId/contracts', requirePermission('projects', 'read'), getContractsByProject)
router.post('/:projectId/contracts', requirePermission('projects', 'create'), createContract)
router.get('/:projectId/contracts/:contractId', requirePermission('projects', 'read'), getContractById)
router.put('/:projectId/contracts/:contractId', requirePermission('projects', 'update'), updateContract)
router.delete('/:projectId/contracts/:contractId', requirePermission('projects', 'delete'), deleteContract)

// Contract items routes (nested under contracts)
router.get('/:projectId/contracts/:contractId/items', requirePermission('projects', 'read'), getItemsByContract)
router.post('/:projectId/contracts/:contractId/items', requirePermission('projects', 'create'), createItem)
router.put('/:projectId/contracts/:contractId/items/:requirements', requirePermission('projects', 'update'), updateItem)
router.delete('/:projectId/contracts/:contractId/items/:requirements', requirePermission('projects', 'delete'), deleteItem)

export default router
