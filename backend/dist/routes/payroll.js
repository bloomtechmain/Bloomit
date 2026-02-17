"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middleware/authorize");
const payrollController_1 = require("../controllers/payrollController");
const router = (0, express_1.Router)();
// Employee payroll data management routes
router.get('/employees', (0, authorize_1.requirePermission)('payroll', 'manage_employee_data'), payrollController_1.getAllEmployeesWithPayroll);
router.get('/employees/:id', (0, authorize_1.requirePermission)('payroll', 'manage_employee_data'), payrollController_1.getEmployeePayrollData);
router.put('/employees/:id', (0, authorize_1.requirePermission)('payroll', 'manage_employee_data'), payrollController_1.updateEmployeePayrollData);
// Payslip CRUD routes
router.get('/payslips', (0, authorize_1.requirePermission)('payroll', 'view_all'), payrollController_1.getAllPayslips);
router.get('/payslips/:id', (0, authorize_1.requirePermission)('payroll', 'view_all'), payrollController_1.getPayslipById);
router.post('/payslips', (0, authorize_1.requirePermission)('payroll', 'create'), payrollController_1.createPayslip);
router.put('/payslips/:id', (0, authorize_1.requirePermission)('payroll', 'update'), payrollController_1.updatePayslip);
router.delete('/payslips/:id', (0, authorize_1.requirePermission)('payroll', 'delete'), payrollController_1.deletePayslip);
// Workflow routes
router.post('/payslips/:id/submit-for-review', (0, authorize_1.requirePermission)('payroll', 'create'), payrollController_1.submitForReview);
router.post('/payslips/:id/staff-approve', (0, authorize_1.requirePermission)('payroll', 'staff_approve'), payrollController_1.staffApprove);
router.post('/payslips/:id/admin-approve', (0, authorize_1.requirePermission)('payroll', 'admin_approve'), payrollController_1.adminApprove);
router.post('/payslips/:id/employee-sign', (0, authorize_1.requirePermission)('payroll', 'view_own'), payrollController_1.employeeSign);
router.post('/payslips/:id/reject', (0, authorize_1.requirePermission)('payroll', 'staff_approve'), payrollController_1.rejectPayslip);
// Reporting routes
router.get('/archive', (0, authorize_1.requirePermission)('payroll', 'view_all'), payrollController_1.getArchive);
router.get('/reports/monthly', (0, authorize_1.requirePermission)('payroll', 'view_reports'), payrollController_1.getMonthlyReport);
router.get('/reports/employee/:id/history', (0, authorize_1.requirePermission)('payroll', 'view_reports'), payrollController_1.getEmployeePayrollHistory);
// Download routes
router.get('/payslips/:id/download', (0, authorize_1.requirePermission)('payroll', 'view_all'), payrollController_1.downloadPayslip);
exports.default = router;
