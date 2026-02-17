import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  shareNote,
  unshareNote,
  getNoteShares
} from '../controllers/notesController'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Notes routes with permission-based authorization
router.get('/', requirePermission('notes', 'read'), getNotes)
router.post('/', requirePermission('notes', 'create'), createNote)
router.put('/:id', requirePermission('notes', 'update'), updateNote)
router.delete('/:id', requirePermission('notes', 'delete'), deleteNote)
router.get('/:id/shares', requirePermission('notes', 'read'), getNoteShares)
router.post('/:id/share', requirePermission('notes', 'update'), shareNote)
router.delete('/:id/share/:shareId', requirePermission('notes', 'update'), unshareNote)

export default router
