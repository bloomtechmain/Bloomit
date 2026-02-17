import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  shareTodo,
  unshareTodo,
  getTodoShares
} from '../controllers/todosController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Todos routes with permission-based authorization
router.get('/', requirePermission('todos', 'read'), getTodos)
router.post('/', requirePermission('todos', 'create'), createTodo)
router.put('/:id', requirePermission('todos', 'update'), updateTodo)
router.delete('/:id', requirePermission('todos', 'delete'), deleteTodo)
router.get('/:id/shares', requirePermission('todos', 'read'), getTodoShares)
router.post('/:id/share', requirePermission('todos', 'update'), shareTodo)
router.delete('/:id/share/:shareId', requirePermission('todos', 'update'), unshareTodo)

export default router
