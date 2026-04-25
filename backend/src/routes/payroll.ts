import { Router } from 'express'
import { requirePermission } from '../middleware/authorize'
import {
  getAllEmployeesWithPayroll,
  getEmployeePayrollData,
  updateEmployeePayrollData,
  getAllPayslips,
  getPayslipById,
  createPayslip,
  updatePayslip,
  deletePayslip,
  submitForReview,
  staffApprove,
  adminApprove,
  employeeSign,
  rejectPayslip,
  getArchive,
  getMonthlyReport,
  downloadPayslip,
  getEmployeePayrollHistory
} from '../controllers/payrollController'

const router = Router()

// Employee payroll data management routes
router.get('/employees', requirePermission('payroll', 'read'), getAllEmployeesWithPayroll)
router.get('/employees/:id', requirePermission('payroll', 'read'), getEmployeePayrollData)
router.put('/employees/:id', requirePermission('payroll', 'update'), updateEmployeePayrollData)

// Payslip CRUD routes
router.get('/payslips', requirePermission('payroll', 'read'), getAllPayslips)
router.get('/payslips/:id', requirePermission('payroll', 'read'), getPayslipById)
router.post('/payslips', requirePermission('payroll', 'create'), createPayslip)
router.put('/payslips/:id', requirePermission('payroll', 'update'), updatePayslip)
router.delete('/payslips/:id', requirePermission('payroll', 'update'), deletePayslip)

// Workflow routes
router.post('/payslips/:id/submit-for-review', requirePermission('payroll', 'submit'), submitForReview)
router.post('/payslips/:id/staff-approve', requirePermission('payroll', 'approve'), staffApprove)
router.post('/payslips/:id/admin-approve', requirePermission('payroll', 'admin_approve'), adminApprove)
router.post('/payslips/:id/employee-sign', requirePermission('payroll', 'read'), employeeSign)
router.post('/payslips/:id/reject', requirePermission('payroll', 'approve'), rejectPayslip)

// Reporting routes
router.get('/archive', requirePermission('payroll', 'read'), getArchive)
router.get('/reports/monthly', requirePermission('payroll', 'read'), getMonthlyReport)
router.get('/reports/employee/:id/history', requirePermission('payroll', 'read'), getEmployeePayrollHistory)

// Download routes
router.get('/payslips/:id/download', requirePermission('payroll', 'read'), downloadPayslip)

export default router
