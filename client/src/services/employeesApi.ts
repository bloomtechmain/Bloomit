import { API_URL } from '../config/api'

export interface Employee {
  employee_id?: number
  id?: number
  employee_number: string
  first_name: string
  last_name: string
  name?: string
  email: string
  phone: string
  dob?: string
  nic?: string
  address?: string
  role: string
  designation?: string
  tax?: string
  created_at?: string
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// Get all employees
export const getAllEmployees = async (): Promise<Employee[]> => {
  const response = await fetch(`${API_URL}/employees`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch employees')
  }
  
  const data = await response.json()
  return data.employees
}

// Get employee by ID
export const getEmployeeById = async (id: number): Promise<Employee> => {
  const response = await fetch(`${API_URL}/employees/${id}`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch employee')
  }
  
  const data = await response.json()
  return data.employee
}
