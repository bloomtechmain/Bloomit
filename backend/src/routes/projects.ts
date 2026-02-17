import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import { getAllProjects, createProject, getProjectById, updateProject, deleteProject } from '../controllers/projectsController'
import { getItemsByProject, createItem, updateItem, deleteItem } from '../controllers/projectItemsController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Project routes with permission-based authorization
router.get('/', requirePermission('projects', 'read'), getAllProjects)
router.post('/', requirePermission('projects', 'create'), createProject)
router.get('/:id', requirePermission('projects', 'read'), getProjectById)
router.put('/:id', requirePermission('projects', 'update'), updateProject)
router.delete('/:id', requirePermission('projects', 'delete'), deleteProject)

// Project items
router.get('/:id/items', requirePermission('projects', 'read'), getItemsByProject)
router.post('/:id/items', requirePermission('projects', 'create'), createItem)
router.put('/:projectId/items/:requirements', requirePermission('projects', 'update'), updateItem)
router.delete('/:projectId/items/:requirements', requirePermission('projects', 'delete'), deleteItem)

export default router


