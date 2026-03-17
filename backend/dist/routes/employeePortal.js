"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeePortalController_1 = require("../controllers/employeePortalController");
const employeeAuth_1 = require("../middleware/employeeAuth");
const timeEntriesController_1 = require("../controllers/timeEntriesController");
/**
 * Employee Portal Routes
 *
 * All routes require authentication (handled by requireAuth in index.ts)
 * Additional employee-specific authorization is applied per route
 *
 * Phase 1: Dashboard and Stats endpoints
 * Future phases will add: Profile, PTO, Payroll, Documents, etc.
 */
const router = (0, express_1.Router)();
// Apply employee role requirement to all routes
router.use(employeeAuth_1.requireEmployeeRole);
// ==================== EMPLOYEE RECORD ====================
/**
 * GET /api/employee-portal/me
 * Get current authenticated user's employee record
 *
 * This is the primary endpoint for employees to get their own employee ID
 * Security: Uses JWT token to identify user, no special permissions needed
 */
router.get('/me', employeePortalController_1.getMyEmployeeRecord);
// ==================== DASHBOARD ====================
/**
 * GET /api/employee-portal/dashboard/:employeeId
 * Get comprehensive dashboard data for employee
 *
 * Security: Employee can only view their own dashboard
 * Admin/Manager can view any employee dashboard
 */
router.get('/dashboard/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getDashboard);
/**
 * GET /api/employee-portal/stats/:employeeId
 * Get detailed statistics for employee
 *
 * Security: Employee can only view their own stats
 * Admin/Manager can view any employee stats
 */
router.get('/stats/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getStats);
// ==================== PROFILE (Phase 3) ====================
/**
 * GET /api/employee-portal/profile/:employeeId
 * View employee profile
 *
 * Security: Employee can only view their own profile
 * Admin/Manager can view any employee profile
 */
router.get('/profile/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getProfile);
/**
 * PUT /api/employee-portal/profile/:employeeId
 * Update employee profile (limited fields)
 *
 * Phase 13 implementation - ACTIVE
 */
router.put('/profile/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.updateProfile);
// ==================== PTO (Phase 4) ====================
/**
 * GET /api/employee-portal/pto-requests/:employeeId
 * Get PTO request history with optional filters
 * Query params: status, startDate, endDate
 *
 * Security: Employee can only view their own PTO requests
 * Admin/Manager can view any employee PTO requests
 */
router.get('/pto-requests/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getPtoRequests);
/**
 * GET /api/employee-portal/pto-balance/:employeeId
 * Get detailed PTO balance including breakdown by type
 *
 * Phase 5 implementation
 */
router.get('/pto-balance/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getPtoBalance);
/**
 * POST /api/employee-portal/pto-requests/:employeeId
 * Submit new PTO request
 *
 * Phase 14 implementation - ACTIVE
 */
router.post('/pto-requests/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.createPtoRequest);
/**
 * DELETE /api/employee-portal/pto-requests/:employeeId/:requestId
 * Cancel pending PTO request
 *
 * Phase 15 implementation - ACTIVE
 */
router.delete('/pto-requests/:employeeId/:requestId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.cancelPtoRequest);
// ==================== TIME TRACKING (Phase 7-8) ====================
/**
 * GET /api/employee-portal/time-entries/:employeeId
 * Get time entry history with filters
 *
 * Phase 7 implementation - read-only for employees
 */
router.get('/time-entries/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getTimeEntries);
/**
 * POST /api/employee-portal/time-entries/:employeeId
 * Create new manual time entry
 *
 * Phase 7 implementation - employees can create but not edit/delete
 */
router.post('/time-entries/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.createTimeEntry);
/**
 * GET /api/employee-portal/timer/active/:employeeId
 * Get active timer status
 *
 * Phase 7 implementation
 */
router.get('/timer/active/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getActiveTimer);
/**
 * POST /api/employee-portal/timer/start
 * Start timer for a project
 *
 * Phase 7 implementation - delegates to existing timer controller
 */
router.post('/timer/start', employeeAuth_1.requireEmployeeRole, timeEntriesController_1.startTimer);
/**
 * POST /api/employee-portal/timer/stop
 * Stop active timer
 *
 * Phase 7 implementation - delegates to existing timer controller
 */
router.post('/timer/stop', employeeAuth_1.requireEmployeeRole, timeEntriesController_1.stopTimer);
/**
 * POST /api/employee-portal/timer/pause
 * Pause active timer (start break)
 *
 * Phase 7 implementation - delegates to existing timer controller
 */
router.post('/timer/pause', employeeAuth_1.requireEmployeeRole, timeEntriesController_1.pauseTimer);
/**
 * POST /api/employee-portal/timer/resume
 * Resume active timer (end break)
 *
 * Phase 7 implementation - delegates to existing timer controller
 */
router.post('/timer/resume', employeeAuth_1.requireEmployeeRole, timeEntriesController_1.resumeTimer);
/**
 * GET /api/employee-portal/time-report/:employeeId
 * Get comprehensive time tracking reports and analytics
 *
 * Phase 8 implementation
 */
router.get('/time-report/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getTimeReport);
// ==================== PAYROLL (Phase 9-10) ====================
/**
 * GET /api/employee-portal/payslips/:employeeId
 * Get payslip archive list
 *
 * Phase 9 implementation
 * Query params: year (optional)
 */
router.get('/payslips/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getPayslips);
/**
 * GET /api/employee-portal/payslips/:employeeId/:payslipId
 * Get specific payslip details with signatures
 *
 * Phase 9 implementation
 */
router.get('/payslips/:employeeId/:payslipId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getPayslipDetails);
/**
 * GET /api/employee-portal/payslips/:employeeId/:payslipId/download
 * Download payslip as PDF
 *
 * Phase 9 implementation
 */
router.get('/payslips/:employeeId/:payslipId/download', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.downloadPayslip);
/**
 * POST /api/employee-portal/payslip-token/verify
 * Verify a payslip signature token
 *
 * Phase 11 implementation - token validation endpoint
 * No auth required (token itself is the authentication)
 */
router.post('/payslip-token/verify', employeePortalController_1.verifyPayslipToken);
/**
 * POST /api/employee-portal/payslips/:employeeId/:payslipId/sign
 * Sign a payslip with digital signature
 *
 * Phase 12 implementation - employee signature submission
 * Requires authentication and token validation
 */
router.post('/payslips/:employeeId/:payslipId/sign', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.signPayslip);
/**
 * GET /api/employee-portal/ytd-earnings/:employeeId
 * Get year-to-date earnings summary
 *
 * Phase 10 implementation
 * Query params: year (optional)
 */
router.get('/ytd-earnings/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getYtdEarnings);
// ==================== DOCUMENTS (Phase 16-17) ====================
/**
 * GET /api/employee-portal/documents/:employeeId
 * Get employee documents
 *
 * Phase 16 implementation - ACTIVE
 */
router.get('/documents/:employeeId', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getDocuments);
/**
 * GET /api/employee-portal/documents/:employeeId/:documentId/download
 * Download a document
 *
 * Phase 16 implementation - ACTIVE
 */
router.get('/documents/:employeeId/:documentId/download', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.downloadDocument);
/**
 * POST /api/employee-portal/documents/:employeeId/upload
 * Upload a personal document
 *
 * To be implemented in Phase 17
 */
// router.post('/documents/:employeeId/upload', validateEmployeeAccess, uploadDocument)
// ==================== NOTIFICATIONS (Placeholder for Phase 18) ====================
/**
 * GET /api/employee-portal/notifications/:employeeId
 * Get employee notifications
 *
 * To be implemented in Phase 18
 */
// router.get('/notifications/:employeeId', validateEmployeeAccess, getNotifications)
/**
 * PUT /api/employee-portal/notifications/:employeeId/:notificationId/read
 * Mark notification as read
 *
 * To be implemented in Phase 18
 */
// router.put('/notifications/:employeeId/:notificationId/read', validateEmployeeAccess, markNotificationRead)
// ==================== SETTINGS ====================
/**
 * GET /api/employee-portal/settings/:employeeId/email-preferences
 * Get email notification preferences
 *
 * Phase 19 implementation - ACTIVE
 */
router.get('/settings/:employeeId/email-preferences', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.getEmailPreferences);
/**
 * PUT /api/employee-portal/settings/:employeeId/email-preferences
 * Update email notification preferences
 *
 * Phase 19 implementation - ACTIVE
 * Note: Payslip notifications cannot be disabled (critical emails)
 */
router.put('/settings/:employeeId/email-preferences', employeeAuth_1.validateEmployeeAccess, employeePortalController_1.updateEmailPreferences);
// ==================== DIRECTORY (Phase 24) ====================
/**
 * GET /api/employee-portal/directory
 * Get company employee directory with search and filters
 *
 * Phase 24 implementation
 * Query params: search, department, role
 *
 * Security: All authenticated employees can view directory
 * Privacy: Respects employee privacy settings (show_in_directory, hide_phone_in_directory)
 */
router.get('/directory', employeeAuth_1.requireEmployeeRole, employeePortalController_1.getEmployeeDirectory);
exports.default = router;
