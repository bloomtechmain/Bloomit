import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  getMyTimeEntries,
  getPendingTimeEntries,
  createTimeEntry,
  startTimer,
  getActiveTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  updateTimeEntry,
  deleteTimeEntry,
  approveTimeEntry,
  rejectTimeEntry,
  getTimeSummary
} from '../controllers/timeEntriesController'

const router = Router()

// Time entry CRUD
router.get('/my-entries', requireAuth, getMyTimeEntries)
router.post('/', requireAuth, createTimeEntry)
router.put('/:id', requireAuth, updateTimeEntry)
router.delete('/:id', requireAuth, deleteTimeEntry)

// Timer operations
router.post('/timer/start', requireAuth, startTimer)
router.get('/timer/active/:employeeId', requireAuth, getActiveTimer)
router.post('/timer/pause', requireAuth, pauseTimer)
router.post('/timer/resume', requireAuth, resumeTimer)
router.post('/timer/stop', requireAuth, stopTimer)

// Manager operations
router.get('/pending', requireAuth, getPendingTimeEntries)
router.put('/:id/approve', requireAuth, approveTimeEntry)
router.put('/:id/reject', requireAuth, rejectTimeEntry)

// Statistics
router.get('/summary', requireAuth, getTimeSummary)

export default router
