"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const loansController_1 = require("../controllers/loansController");
const router = (0, express_1.Router)();
// All routes require authentication and loans:view permission minimum
router.use(auth_1.requireAuth);
// Get all loans - requires loans:view
router.get('/', (0, authorize_1.requirePermission)('loans', 'read'), loansController_1.getLoans);
// Get single loan details - requires loans:view
router.get('/:id', (0, authorize_1.requirePermission)('loans', 'read'), loansController_1.getLoanById);
// Get loan summary with calculations - requires loans:view
router.get('/:id/summary', (0, authorize_1.requirePermission)('loans', 'read'), loansController_1.getLoanSummary);
// Create new loan - requires loans:create
router.post('/', (0, authorize_1.requirePermission)('loans', 'create'), loansController_1.createLoan);
// Update loan - requires loans:update
router.put('/:id', (0, authorize_1.requirePermission)('loans', 'update'), loansController_1.updateLoan);
// Delete loan - requires loans:delete
router.delete('/:id', (0, authorize_1.requirePermission)('loans', 'delete'), loansController_1.deleteLoan);
// Get installments for a loan - requires loans:view
router.get('/:id/installments', (0, authorize_1.requirePermission)('loans', 'read'), loansController_1.getInstallments);
// Record installment payment - requires loans:manage_installments
router.post('/:id/installments', (0, authorize_1.requirePermission)('loans', 'manage_installments'), loansController_1.recordInstallmentPayment);
// Update installment - requires loans:manage_installments
router.put('/:id/installments/:installmentId', (0, authorize_1.requirePermission)('loans', 'manage_installments'), loansController_1.updateInstallment);
exports.default = router;
