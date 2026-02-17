// Employee Payroll Data Types
export type EmployeePayrollData = {
  employee_id: number
  name: string
  email: string
  phone: string | null
  role: string
  department: string | null
  hire_date: string | null
  salary: number | null
  is_active: boolean
  base_salary: number | null
  allowances: Record<string, number>
  epf_enabled: boolean
  epf_contribution_rate: number
  etf_enabled: boolean
  employee_department: string | null
  created_at: string
  updated_at: string
}

// Payslip Types
export type PayslipStatus = 
  | 'DRAFT' 
  | 'PENDING_STAFF_REVIEW' 
  | 'PENDING_ADMIN_APPROVAL' 
  | 'PENDING_EMPLOYEE_SIGNATURE' 
  | 'COMPLETED'
  | 'REJECTED'

export type Payslip = {
  payslip_id: number
  employee_id: number
  payslip_month: number
  payslip_year: number
  basic_salary: number
  allowances: Record<string, number>
  gross_salary: number
  epf_employee_deduction: number
  epf_employee_rate: number
  other_deductions: Record<string, number>
  total_deductions: number
  epf_employer_contribution: number
  etf_employer_contribution: number
  net_salary: number
  status: PayslipStatus
  rejection_reason: string | null
  created_by_user_id: number
  created_at: string
  updated_at: string
  // Joined fields
  first_name?: string
  last_name?: string
  employee_number?: string
  employee_department?: string
  designation?: string
  created_by_name?: string
}

export type PayslipSignature = {
  signature_id: number
  payslip_id: number
  signer_user_id: number
  signer_role: 'JUNIOR_ACCOUNTANT' | 'STAFF_ACCOUNTANT' | 'ADMIN' | 'EMPLOYEE'
  signature_hash: string
  signed_at: string
  ip_address: string | null
  // Joined fields
  signer_name?: string
  signer_email?: string
}

export type PayslipWithSignatures = {
  payslip: Payslip
  signatures: PayslipSignature[]
}

export type PayslipArchiveItem = {
  payslip_year: number
  payslip_month: number
  payslip_count: number
  total_net_salary: number
  total_gross_salary: number
}

export type MonthlyPayrollReport = {
  summary: {
    total_employees: number
    total_basic_salary: number
    total_gross_salary: number
    total_deductions: number
    total_net_salary: number
    total_epf_employer: number
    total_etf_employer: number
    total_payroll_cost: number
  }
  by_department: Array<{
    employee_department: string | null
    employee_count: number
    total_gross: number
    total_net: number
  }>
}

export type EmployeePayrollHistory = {
  payslips: Payslip[]
  ytd_totals: {
    ytd_gross: number
    ytd_net: number
    ytd_deductions: number
    ytd_epf_employee: number
    ytd_epf_employer: number
    ytd_etf_employer: number
  }
}

// Form Types
export type PayslipFormData = {
  employee_id: number
  payslip_month: number
  payslip_year: number
  allowances?: Record<string, number>
  other_deductions?: Record<string, number>
  epf_employee_rate?: number
}

export type EmployeePayrollFormData = {
  base_salary?: number
  allowances?: Record<string, number>
  epf_enabled?: boolean
  epf_contribution_rate?: number
  etf_enabled?: boolean
  employee_department?: string
}
