import { API_URL } from '../config/api'

export interface EmployeeOnboardingData {
  // Personal Information
  first_name: string
  last_name: string
  email: string
  phone: string
  dob?: string
  nic?: string
  address?: string
  
  // Employment Details
  employee_number: string
  designation?: string
  employee_department?: string
  hire_date?: string
  
  // Payroll Configuration
  base_salary?: number
  epf_enabled?: boolean
  epf_contribution_rate?: number
  etf_enabled?: boolean
  allowances?: Record<string, number>
  pto_allowance?: number
  
  // Account & Permissions
  roleIds: number[]
  
  // Options
  send_email?: boolean
}

export interface EmployeeWithUserStatus {
  employee_id: number
  employee_number: string
  first_name: string
  last_name: string
  email: string
  phone: string
  designation: string | null
  employee_department: string | null
  base_salary: string | null
  hire_date: string
  is_active: boolean
  user_id: number | null
  created_at: string
  suspended_at: string | null
  suspended_reason: string | null
  terminated_at: string | null
  terminated_reason: string | null
  scheduled_purge_date: string | null
  user_name: string | null
  user_email: string | null
  account_status: 'active' | 'suspended' | 'terminated' | null
  has_user_account: boolean
  roles: Array<{
    id: number
    name: string
    is_system_role: boolean
  }>
}

export interface OnboardingResult {
  success: boolean
  employee: {
    id: number
    employee_number: string
    first_name: string
    last_name: string
    email: string
    designation: string | null
    employee_department: string | null
    created_at: string
  }
  user: {
    id: number
    email: string
    name: string
  }
  temporaryPassword: string
  emailSent: boolean
  emailError?: string
  roleCount: number
  message: string
}

/**
 * Onboard a new employee with user account
 */
export const onboardEmployee = async (
  data: EmployeeOnboardingData,
  accessToken: string
): Promise<OnboardingResult> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/onboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to onboard employee')
  }

  return response.json()
}

/**
 * Get all employees with their user account status
 */
export const getAllEmployeesWithUserStatus = async (
  accessToken: string
): Promise<{ employees: EmployeeWithUserStatus[]; total: number }> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/list`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch employees')
  }

  return response.json()
}

/**
 * Generate next available employee number
 */
export const generateEmployeeNumber = async (
  accessToken: string
): Promise<{ employeeNumber: string }> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/generate-number`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to generate employee number')
  }

  return response.json()
}

/**
 * Get full employee profile
 */
export const getFullEmployeeProfile = async (
  employeeId: number,
  accessToken: string
): Promise<any> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/${employeeId}/profile`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch employee profile')
  }

  return response.json()
}

/**
 * Update employee profile
 */
export const updateEmployeeProfile = async (
  employeeId: number,
  data: Partial<EmployeeOnboardingData>,
  accessToken: string
): Promise<any> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/${employeeId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update employee profile')
  }

  return response.json()
}

/**
 * Link existing employee to existing user
 */
export const linkEmployeeToUser = async (
  employeeId: number,
  userId: number,
  accessToken: string
): Promise<any> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/${employeeId}/link-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ userId })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to link employee to user')
  }

  return response.json()
}

/**
 * Suspend employee account (reversible)
 */
export const suspendEmployee = async (
  employeeId: number,
  reason: string,
  accessToken: string
): Promise<{ success: boolean; message: string; employeeId: number }> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/${employeeId}/suspend`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ reason })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to suspend employee')
  }

  return response.json()
}

/**
 * Reactivate suspended employee account
 */
export const reactivateEmployee = async (
  employeeId: number,
  accessToken: string
): Promise<{ success: boolean; message: string; employeeId: number }> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/${employeeId}/reactivate`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to reactivate employee')
  }

  return response.json()
}

/**
 * Terminate employee account (permanent, soft delete with 2-year retention)
 */
export const terminateEmployee = async (
  employeeId: number,
  reason: string,
  accessToken: string
): Promise<{ success: boolean; message: string; employeeId: number; terminationDate: string; scheduledPurgeDate: string }> => {
  const response = await fetch(`${API_URL}/api/employee-onboarding/${employeeId}/terminate`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ reason })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to terminate employee')
  }

  return response.json()
}
