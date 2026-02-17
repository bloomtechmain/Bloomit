import { API_URL } from '../config/api'

/**
 * Employee Portal API Service
 * Handles all API calls for the employee self-service portal
 */

export interface EmployeeDashboardData {
  employee: {
    id: number
    employeeNumber: string
    firstName: string
    lastName: string
    email: string
    phone: string
    position: string
    department: string
  }
  stats: {
    ptoBalance: number
    pendingPtoRequests: number
    approvedPtoRequests: number
    timeEntriesThisWeek: number
    pendingTimeEntries: number
    unreadNotifications: number
  }
  announcements: Array<{
    id: number
    title: string
    content: string
    priority: string
    category: string
    startDate: string
    createdAt: string
  }>
  recentNotifications: Array<{
    id: number
    notificationType: string
    title: string
    message: string
    link: string
    priority: string
    isRead: boolean
    createdAt: string
  }>
}

export interface EmployeeStatsData {
  employeeId: number
  pto: {
    totalAllowance: number
    daysUsed: number
    balance: number
    pendingRequests: number
    approvedRequests: number
    deniedRequests: number
  }
  timeTracking: {
    hoursThisWeek: number
    hoursThisMonth: number
    entriesThisMonth: number
    pendingEntries: number
    approvedEntries: number
    rejectedEntries: number
  }
  notifications: {
    total: number
    unread: number
    urgent: number
  }
}

/**
 * Fetch comprehensive dashboard data for an employee
 */
export async function getEmployeeDashboard(
  employeeId: number,
  token: string
): Promise<EmployeeDashboardData> {
  const response = await fetch(`${API_URL}/api/employee-portal/dashboard/${employeeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 5: PTO Balance
 */
export interface PTOBalanceResponse {
  employeeId: number
  year: number
  totalAllowance: number
  daysUsed: number
  daysPending: number
  daysRemaining: number
  percentageUsed: number
  status: 'healthy' | 'warning' | 'critical'
  breakdown: {
    vacation: number
    sick: number
    personal: number
  }
  counts: {
    approved: number
    pending: number
  }
}

export async function getEmployeePTOBalance(
  employeeId: number,
  token: string
): Promise<PTOBalanceResponse> {
  const response = await fetch(`${API_URL}/api/employee-portal/pto-balance/${employeeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch PTO balance: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch detailed statistics for an employee
 */
export async function getEmployeeStats(
  employeeId: number,
  token: string
): Promise<EmployeeStatsData> {
  const response = await fetch(`${API_URL}/api/employee-portal/stats/${employeeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 13: Profile Editing
 */
export async function updateEmployeeProfile(
  employeeId: number,
  token: string,
  data: {
    phone?: string
    address?: string
    emergencyContact?: {
      name?: string
      relationship?: string
      phone?: string
    }
  }
): Promise<{ message: string; profile: EmployeeProfileData }> {
  const response = await fetch(`${API_URL}/api/employee-portal/profile/${employeeId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to update profile: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 3: Profile Viewing
 */
export interface EmployeeProfileData {
  id: number
  employeeNumber: string
  personalInfo: {
    firstName: string
    lastName: string
    fullName: string
    email: string
    phone: string
    dateOfBirth: string
    nic: string
    address: string
  }
  employmentDetails: {
    position: string
    department: string
    role: string
    hireDate: string
    manager: string
    status: string
    ptoAllowance: number
  }
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  bankingInfo: {
    bankName: string
    accountNumber: string
    branch: string
  }
  benefits: {
    epfEnabled: boolean
    etfEnabled: boolean
  }
}

export async function getEmployeeProfile(
  employeeId: number,
  token: string
): Promise<EmployeeProfileData> {
  const response = await fetch(`${API_URL}/api/employee-portal/profile/${employeeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 14: PTO Request Submission
 */
export async function submitPTORequest(
  employeeId: number,
  token: string,
  data: {
    fromDate: string
    toDate: string
    absenceType: string
    description: string
  }
): Promise<{ 
  message: string
  request: PTORequest
  balanceWarning?: string | null
}> {
  const response = await fetch(`${API_URL}/api/employee-portal/pto-requests/${employeeId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to submit PTO request: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 4: PTO Requests Viewing
 */
export interface PTORequest {
  id: number
  employeeId: number
  absenceType: string
  fromDate: string
  toDate: string
  totalDays: number
  totalHours: number
  description: string
  status: string
  managerComments: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  employeeName: string
  managerName: string | null
  projectName: string | null
  coverPersonName: string | null
}

export interface PTORequestsResponse {
  ptoRequests: PTORequest[]
  total: number
}

export async function getEmployeePTORequests(
  employeeId: number,
  token: string,
  filters?: {
    status?: string
    startDate?: string
    endDate?: string
  }
): Promise<PTORequestsResponse> {
  const params = new URLSearchParams()
  
  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status)
  }
  if (filters?.startDate) {
    params.append('startDate', filters.startDate)
  }
  if (filters?.endDate) {
    params.append('endDate', filters.endDate)
  }

  const queryString = params.toString()
  const url = `${API_URL}/api/employee-portal/pto-requests/${employeeId}${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch PTO requests: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 15: Cancel PTO Request
 */
export async function cancelPTORequest(
  employeeId: number,
  requestId: number,
  token: string
): Promise<{ success: boolean; message: string; requestId: number }> {
  const response = await fetch(`${API_URL}/api/employee-portal/pto-requests/${employeeId}/${requestId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to cancel PTO request: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 7: Time Tracking - Get Active Timer
 */
export interface ActiveTimer {
  id: number
  employee_id: number
  time_entry_id: number
  started_at: string
  is_on_break: boolean
  total_break_time_minutes: number
  last_break_start: string | null
  project_id: number
  contract_id: number | null
  description: string | null
  date: string
  project_name: string
  contract_name: string | null
}

export async function getActiveTimer(
  employeeId: number,
  token: string
): Promise<ActiveTimer | null> {
  const response = await fetch(`${API_URL}/api/employee-portal/timer/active/${employeeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch active timer: ${response.statusText}`)
  }

  const data = await response.json()
  return data.activeTimer
}

/**
 * Phase 7: Time Tracking - Get Time Entries
 */
export interface TimeEntry {
  id: number
  employee_id: number
  project_id: number
  contract_id: number | null
  entry_date: string
  total_hours: number
  break_time_minutes: number
  description: string | null
  clock_in: string | null
  clock_out: string | null
  is_timer_based: boolean
  approval_status: string
  approved_by: number | null
  approved_at: string | null
  rejection_note: string | null
  created_at: string
  updated_at: string
  project_name: string
  contract_name: string | null
  approver_name: string | null
}

export interface TimeEntriesResponse {
  timeEntries: TimeEntry[]
  total: number
}

export async function getTimeEntries(
  employeeId: number,
  token: string,
  filters?: {
    start_date?: string
    end_date?: string
    project_id?: number
    status?: string
  }
): Promise<TimeEntriesResponse> {
  const params = new URLSearchParams()
  
  if (filters?.start_date) {
    params.append('start_date', filters.start_date)
  }
  if (filters?.end_date) {
    params.append('end_date', filters.end_date)
  }
  if (filters?.project_id) {
    params.append('project_id', filters.project_id.toString())
  }
  if (filters?.status) {
    params.append('status', filters.status)
  }

  const queryString = params.toString()
  const url = `${API_URL}/api/employee-portal/time-entries/${employeeId}${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch time entries: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 7: Time Tracking - Create Manual Time Entry
 */
export async function createTimeEntry(
  employeeId: number,
  token: string,
  data: {
    project_id: number
    contract_id?: number | null
    date: string
    total_hours: number
    break_time_minutes?: number
    description?: string
  }
): Promise<{ message: string; timeEntry: TimeEntry }> {
  const response = await fetch(`${API_URL}/api/employee-portal/time-entries/${employeeId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to create time entry: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 8: Time Reports
 */
export interface TimeReport {
  employeeId: number
  reportPeriod: {
    startDate: string | null
    endDate: string | null
  }
  overall: {
    totalEntries: number
    totalHours: number
    avgHoursPerEntry: string
    totalBreakMinutes: number
  }
  pending: {
    count: number
    hours: number
  }
  weekly: Array<{
    weekStart: string
    entryCount: number
    totalHours: number
  }>
  monthly: Array<{
    monthStart: string
    entryCount: number
    totalHours: number
  }>
  byProject: Array<{
    projectId: number
    projectName: string
    entryCount: number
    totalHours: number
    avgHoursPerEntry: string
  }>
  daily: Array<{
    date: string
    entryCount: number
    totalHours: number
  }>
}

export async function getTimeReport(
  employeeId: number,
  token: string,
  filters?: {
    start_date?: string
    end_date?: string
    project_id?: number
  }
): Promise<TimeReport> {
  const params = new URLSearchParams()
  
  if (filters?.start_date) {
    params.append('start_date', filters.start_date)
  }
  if (filters?.end_date) {
    params.append('end_date', filters.end_date)
  }
  if (filters?.project_id) {
    params.append('project_id', filters.project_id.toString())
  }

  const queryString = params.toString()
  const url = `${API_URL}/api/employee-portal/time-report/${employeeId}${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch time report: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 9: Payslip Archive
 */
export interface PayslipSummary {
  payslip_id: number
  employee_id: number
  payslip_month: number
  payslip_year: number
  basic_salary: number
  gross_salary: number
  net_salary: number
  total_deductions: number
  status: string
  created_at: string
  updated_at: string
}

export interface PayslipDetails {
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
  status: string
  employee_name: string
  employee_number: string
  designation: string
  employee_department: string
}

export interface PayslipSignature {
  signature_id: number
  signer_user_id: number
  signer_role: string
  signed_at: string
  signer_name: string
  signer_email: string
}

export interface PayslipWithSignatures {
  payslip: PayslipDetails
  signatures: PayslipSignature[]
}

export async function getEmployeePayslips(
  employeeId: number,
  token: string,
  year?: number
): Promise<{ payslips: PayslipSummary[]; total: number }> {
  const params = new URLSearchParams()
  
  if (year) {
    params.append('year', year.toString())
  }

  const queryString = params.toString()
  const url = `${API_URL}/api/employee-portal/payslips/${employeeId}${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch payslips: ${response.statusText}`)
  }

  return response.json()
}

export async function getEmployeePayslipDetails(
  employeeId: number,
  payslipId: number,
  token: string
): Promise<PayslipWithSignatures> {
  const response = await fetch(`${API_URL}/api/employee-portal/payslips/${employeeId}/${payslipId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch payslip details: ${response.statusText}`)
  }

  return response.json()
}

export async function downloadEmployeePayslip(
  employeeId: number,
  payslipId: number,
  token: string
): Promise<Blob> {
  const response = await fetch(`${API_URL}/api/employee-portal/payslips/${employeeId}/${payslipId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to download payslip: ${response.statusText}`)
  }

  return response.blob()
}

/**
 * Phase 24: Employee Directory
 */
export interface DirectoryEmployee {
  id: number
  employeeNumber: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string | null
  phoneVisible: boolean
  position: string
  department: string
  role: string
}

export interface EmployeeDirectoryResponse {
  employees: DirectoryEmployee[]
  total: number
  filters: {
    departments: string[]
    roles: string[]
  }
}

export async function getEmployeeDirectory(
  token: string,
  filters?: {
    search?: string
    department?: string
    role?: string
  }
): Promise<EmployeeDirectoryResponse> {
  const params = new URLSearchParams()
  
  if (filters?.search && filters.search.trim().length > 0) {
    params.append('search', filters.search.trim())
  }
  if (filters?.department && filters.department !== 'all') {
    params.append('department', filters.department)
  }
  if (filters?.role && filters.role !== 'all') {
    params.append('role', filters.role)
  }

  const queryString = params.toString()
  const url = `${API_URL}/api/employee-portal/directory${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch employee directory: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 10: YTD Earnings
 */
export interface YTDEarnings {
  employeeId: number
  year: number
  summary: {
    totalGross: number
    totalDeductions: number
    totalNet: number
    epfEmployee: number
    epfEmployer: number
    etf: number
    monthsPaid: number
  }
  monthlyBreakdown: Array<{
    month: number
    year: number
    basicSalary: number
    grossSalary: number
    deductions: number
    netSalary: number
    epfEmployee: number
  }>
  taxInfo: {
    epfEmployeeTotal: number
    epfEmployeeRate: number
    epfEmployerTotal: number
    etfEmployerTotal: number
  }
}

export async function getEmployeeYTDEarnings(
  employeeId: number,
  token: string,
  year?: number
): Promise<YTDEarnings> {
  const params = new URLSearchParams()
  
  if (year) {
    params.append('year', year.toString())
  }

  const queryString = params.toString()
  const url = `${API_URL}/api/employee-portal/ytd-earnings/${employeeId}${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch YTD earnings: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Phase 11: Token Verification
 */
export interface TokenValidationResponse {
  valid: boolean
  payslipId?: number
  employeeId?: number
  expiresAt?: string
  error?: string
  errorCode?: 'EXPIRED' | 'ALREADY_USED' | 'NOT_FOUND' | 'INVALID'
}

export async function verifyPayslipToken(
  signatureToken: string
): Promise<TokenValidationResponse> {
  const response = await fetch(`${API_URL}/api/employee-portal/payslip-token/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token: signatureToken })
  })

  if (!response.ok) {
    const error = await response.json()
    return {
      valid: false,
      error: error.error || 'Token validation failed',
      errorCode: error.errorCode
    }
  }

  return response.json()
}

/**
 * Phase 12: Sign Payslip
 */
export interface SignPayslipResponse {
  success: boolean
  message: string
  signatureId?: number
  signedAt?: string
  error?: string
}

export async function signEmployeePayslip(
  employeeId: number,
  payslipId: number,
  signatureData: string,
  signatureToken: string,
  accessToken: string
): Promise<SignPayslipResponse> {
  const response = await fetch(
    `${API_URL}/api/employee-portal/payslips/${employeeId}/${payslipId}/sign`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signature: signatureData,
        token: signatureToken
      })
    }
  )

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Failed to sign payslip',
      error: data.error
    }
  }

  return {
    success: true,
    message: data.message,
    signatureId: data.signatureId,
    signedAt: data.signedAt
  }
}

/**
 * Phase 16: Document Bank Access
 */
export interface Document {
  document_id: number
  document_name: string
  document_type: string
  file_path: string
  file_size: number
  uploaded_by: number
  uploaded_at: string
  description: string | null
  uploaded_by_name: string | null
}

export interface DocumentsResponse {
  documents: Document[]
  total: number
}

export async function getEmployeeDocuments(
  employeeId: number,
  token: string,
  filters?: {
    category?: string
    search?: string
  }
): Promise<DocumentsResponse> {
  const params = new URLSearchParams()
  
  if (filters?.category && filters.category !== 'all') {
    params.append('category', filters.category)
  }
  if (filters?.search) {
    params.append('search', filters.search)
  }

  const queryString = params.toString()
  const url = `${API_URL}/api/employee-portal/documents/${employeeId}${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.statusText}`)
  }

  return response.json()
}

export async function downloadEmployeeDocument(
  employeeId: number,
  documentId: number,
  token: string
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/api/employee-portal/documents/${employeeId}/${documentId}/download`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to download document: ${response.statusText}`)
  }

  return response.blob()
}
