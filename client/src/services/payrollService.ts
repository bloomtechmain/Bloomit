import { API_URL } from '../config/api'
import type {
  EmployeePayrollData,
  EmployeePayrollFormData,
  Payslip,
  PayslipFormData,
  PayslipWithSignatures,
  PayslipArchiveItem,
  MonthlyPayrollReport,
  EmployeePayrollHistory
} from '../types/payroll'

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// Employee Payroll Data APIs
export const getAllEmployeesWithPayroll = async (): Promise<{ employees: EmployeePayrollData[] }> => {
  const response = await fetch(`${API_URL}/payroll/employees`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to fetch employees with payroll data')
  }
  return response.json()
}

export const getEmployeePayrollData = async (employeeId: number): Promise<{ employee: EmployeePayrollData }> => {
  const response = await fetch(`${API_URL}/payroll/employees/${employeeId}`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to fetch employee payroll data')
  }
  return response.json()
}

export const updateEmployeePayrollData = async (
  employeeId: number, 
  data: EmployeePayrollFormData
): Promise<{ employee: EmployeePayrollData }> => {
  const response = await fetch(`${API_URL}/payroll/employees/${employeeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error('Failed to update employee payroll data')
  }
  return response.json()
}

// Payslip CRUD APIs
export const getAllPayslips = async (filters?: {
  year?: number
  month?: number
  status?: string
  employee_id?: number
}): Promise<{ payslips: Payslip[] }> => {
  const params = new URLSearchParams()
  if (filters?.year) params.append('year', filters.year.toString())
  if (filters?.month) params.append('month', filters.month.toString())
  if (filters?.status) params.append('status', filters.status)
  if (filters?.employee_id) params.append('employee_id', filters.employee_id.toString())
  
  const url = `${API_URL}/payroll/payslips${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to fetch payslips')
  }
  return response.json()
}

export const getPayslipById = async (payslipId: number): Promise<PayslipWithSignatures> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to fetch payslip')
  }
  return response.json()
}

export const createPayslip = async (data: PayslipFormData): Promise<{ payslip: Payslip }> => {
  const response = await fetch(`${API_URL}/payroll/payslips`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create payslip')
  }
  return response.json()
}

export const updatePayslip = async (
  payslipId: number,
  data: Partial<PayslipFormData>
): Promise<{ payslip: Payslip }> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error('Failed to update payslip')
  }
  return response.json()
}

export const deletePayslip = async (payslipId: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to delete payslip')
  }
  return response.json()
}

// Workflow APIs
export const submitForReview = async (payslipId: number): Promise<{ payslip: Payslip; signature_hash: string }> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}/submit-for-review`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to submit payslip for review')
  }
  return response.json()
}

export const staffApprove = async (payslipId: number): Promise<{ payslip: Payslip; signature_hash: string }> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}/staff-approve`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to approve payslip')
  }
  return response.json()
}

export const adminApprove = async (payslipId: number): Promise<{ payslip: Payslip; signature_hash: string }> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}/admin-approve`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to approve payslip')
  }
  return response.json()
}

export const employeeSign = async (payslipId: number): Promise<{ payslip: Payslip; signature_hash: string }> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}/employee-sign`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to sign payslip')
  }
  return response.json()
}

export const rejectPayslip = async (payslipId: number, reason: string): Promise<{ payslip: Payslip }> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason })
  })
  if (!response.ok) {
    throw new Error('Failed to reject payslip')
  }
  return response.json()
}

// Reporting APIs
export const getArchive = async (): Promise<{ archive: PayslipArchiveItem[] }> => {
  const response = await fetch(`${API_URL}/payroll/archive`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to fetch payslip archive')
  }
  return response.json()
}

export const getMonthlyReport = async (
  year: number,
  month: number
): Promise<MonthlyPayrollReport> => {
  const response = await fetch(`${API_URL}/payroll/reports/monthly?year=${year}&month=${month}`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to fetch monthly report')
  }
  return response.json()
}

export const getEmployeePayrollHistory = async (
  employeeId: number
): Promise<EmployeePayrollHistory> => {
  const response = await fetch(`${API_URL}/payroll/reports/employee/${employeeId}/history`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to fetch employee payroll history')
  }
  return response.json()
}

// Helper function to download payslip PDF (to be implemented with PDF generation)
export const downloadPayslipPDF = async (payslipId: number): Promise<Blob> => {
  const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}/download`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    throw new Error('Failed to download payslip')
  }
  return response.blob()
}
