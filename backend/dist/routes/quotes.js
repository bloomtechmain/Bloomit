"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quotesController_1 = require("../controllers/quotesController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
// Get all quotes (read permission)
router.get('/', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'read'), quotesController_1.getAllQuotes);
// Get service suggestions for autocomplete (read permission)
router.get('/suggestions/services', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'read'), quotesController_1.getServiceSuggestions);
// ========== REMINDER ROUTES (must be before /:id routes) ==========
// Get all pending reminders (read permission) - Dashboard widget
router.get('/reminders/pending', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'read'), quotesController_1.getAllPendingReminders);
// Get reminder settings (read permission)
router.get('/reminders/settings', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'read'), quotesController_1.getReminderSettings);
// Update reminder settings (admin permission)
router.put('/reminders/settings', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'admin'), quotesController_1.updateReminderSettings);
// Dismiss a reminder (manage permission)
router.patch('/reminders/:id/dismiss', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'manage'), quotesController_1.dismissReminder);
// Get quote by ID (read permission)
router.get('/:id', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'read'), quotesController_1.getQuoteById);
// Get quote status history (read permission)
router.get('/:id/history', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'read'), quotesController_1.getQuoteStatusHistory);
// Get all reminders for a specific quote (read permission)
router.get('/:id/reminders', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'read'), quotesController_1.getQuoteReminders);
// Create a manual reminder for a quote (manage permission)
router.post('/:id/reminders', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'manage'), quotesController_1.createReminder);
// Create new quote (manage permission)
router.post('/', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'manage'), quotesController_1.createQuote);
// Update quote (manage permission)
router.put('/:id', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'manage'), quotesController_1.updateQuote);
// Update quote status (manage permission)
router.patch('/:id/status', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'manage'), quotesController_1.updateQuoteStatus);
// Assign quote to employee (manage permission)
router.patch('/:id/assign', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'manage'), quotesController_1.assignQuote);
// Delete quote (manage permission)
router.delete('/:id', auth_1.requireAuth, (0, authorize_1.requirePermission)('quotes', 'manage'), quotesController_1.deleteQuote);
exports.default = router;
