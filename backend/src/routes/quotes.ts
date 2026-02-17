import { Router } from 'express'
import {
  getAllQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  updateQuoteStatus,
  getQuoteStatusHistory,
  deleteQuote,
  getServiceSuggestions,
  assignQuote,
  createReminder,
  getQuoteReminders,
  getAllPendingReminders,
  dismissReminder,
  getReminderSettings,
  updateReminderSettings
} from '../controllers/quotesController'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorize'

const router = Router()

// Get all quotes (read permission)
router.get('/', requireAuth, requirePermission('quotes', 'read'), getAllQuotes)

// Get service suggestions for autocomplete (read permission)
router.get('/suggestions/services', requireAuth, requirePermission('quotes', 'read'), getServiceSuggestions)

// ========== REMINDER ROUTES (must be before /:id routes) ==========

// Get all pending reminders (read permission) - Dashboard widget
router.get('/reminders/pending', requireAuth, requirePermission('quotes', 'read'), getAllPendingReminders)

// Get reminder settings (read permission)
router.get('/reminders/settings', requireAuth, requirePermission('quotes', 'read'), getReminderSettings)

// Update reminder settings (admin permission)
router.put('/reminders/settings', requireAuth, requirePermission('quotes', 'admin'), updateReminderSettings)

// Dismiss a reminder (manage permission)
router.patch('/reminders/:id/dismiss', requireAuth, requirePermission('quotes', 'manage'), dismissReminder)

// Get quote by ID (read permission)
router.get('/:id', requireAuth, requirePermission('quotes', 'read'), getQuoteById)

// Get quote status history (read permission)
router.get('/:id/history', requireAuth, requirePermission('quotes', 'read'), getQuoteStatusHistory)

// Get all reminders for a specific quote (read permission)
router.get('/:id/reminders', requireAuth, requirePermission('quotes', 'read'), getQuoteReminders)

// Create a manual reminder for a quote (manage permission)
router.post('/:id/reminders', requireAuth, requirePermission('quotes', 'manage'), createReminder)

// Create new quote (manage permission)
router.post('/', requireAuth, requirePermission('quotes', 'manage'), createQuote)

// Update quote (manage permission)
router.put('/:id', requireAuth, requirePermission('quotes', 'manage'), updateQuote)

// Update quote status (manage permission)
router.patch('/:id/status', requireAuth, requirePermission('quotes', 'manage'), updateQuoteStatus)

// Assign quote to employee (manage permission)
router.patch('/:id/assign', requireAuth, requirePermission('quotes', 'manage'), assignQuote)

// Delete quote (manage permission)
router.delete('/:id', requireAuth, requirePermission('quotes', 'manage'), deleteQuote)

export default router
