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
router.get('/employees', requirePermission('payroll', 'manage_employee_data'), getAllEmployeesWithPayroll)
router.get('/employees/:id', requirePermission('payroll', 'manage_employee_data'), getEmployeePayrollData)
router.put('/employees/:id', requirePermission('payroll', 'manage_employee_data'), updateEmployeePayrollData)

// Payslip CRUD routes
router.get('/payslips', requirePermission('payroll', 'view_all'), getAllPayslips)
router.get('/payslips/:id', requirePermission('payroll', 'view_all'), getPayslipById)
router.post('/payslips', requirePermission('payroll', 'create'), createPayslip)
router.put('/payslips/:id', requirePermission('payroll', 'update'), updatePayslip)
router.delete('/payslips/:id', requirePermission('payroll', 'delete'), deletePayslip)

// Workflow routes
router.post('/payslips/:id/submit-for-review', requirePermission('payroll', 'create'), submitForReview)
router.post('/payslips/:id/staff-approve', requirePermission('payroll', 'staff_approve'), staffApprove)
router.post('/payslips/:id/admin-approve', requirePermission('payroll', 'admin_approve'), adminApprove)
router.post('/payslips/:id/employee-sign', requirePermission('payroll', 'view_own'), employeeSign)
router.post('/payslips/:id/reject', requirePermission('payroll', 'staff_approve'), rejectPayslip)

// Reporting routes
router.get('/archive', requirePermission('payroll', 'view_all'), getArchive)
router.get('/reports/monthly', requirePermission('payroll', 'view_reports'), getMonthlyReport)
router.get('/reports/employee/:id/history', requirePermission('payroll', 'view_reports'), getEmployeePayrollHistory)

// Download routes
router.get('/payslips/:id/download', requirePermission('payroll', 'view_all'), downloadPayslip)

export default router
