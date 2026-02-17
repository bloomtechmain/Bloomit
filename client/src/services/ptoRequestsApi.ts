import axios, { type AxiosResponse, AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_URL } from '../config/api'
import type { PTORequest, PTOStats } from '../types/ptoRequests'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const ptoRequestsApi = {
  // Get all PTO requests (managers)
  getAll: (params?: { status?: string; employee_id?: number }) => 
    api.get<{ ptoRequests: PTORequest[] }>('/pto-requests', { params }),

  // Get employee's own PTO requests
  getMyRequests: (employeeId: number) => 
    api.get<{ ptoRequests: PTORequest[] }>(`/pto-requests/my/${employeeId}`),

  // Get pending PTO requests (manager approval)
  getPending: () => 
    api.get<{ ptoRequests: PTORequest[] }>('/pto-requests/pending'),

  // Get PTO statistics
  getStats: (employeeId: number, year?: number) => 
    api.get<{ stats: PTOStats }>(`/pto-requests/stats/${employeeId}`, { 
      params: { year } 
    }),

  // Create PTO request
  create: (data: {
    employee_id: number
    manager_id?: number
    absence_type: string
    from_date: string
    to_date: string
    total_hours: number
    project_id?: number
    cover_person_id?: number
    cover_person_name?: string
    description?: string
  }) => api.post<{ ptoRequest: PTORequest }>('/pto-requests', data),

  // Update PTO request
  update: (id: number, data: Partial<{
    manager_id: number
    absence_type: string
    from_date: string
    to_date: string
    total_hours: number
    project_id: number
    cover_person_id: number
    cover_person_name: string
    description: string
  }>) => api.put<{ ptoRequest: PTORequest }>(`/pto-requests/${id}`, data),

  // Delete PTO request
  delete: (id: number) => 
    api.delete<{ message: string; id: number }>(`/pto-requests/${id}`),

  // Approve PTO request
  approve: (id: number, manager_id: number, manager_comments?: string) => 
    api.post<{ ptoRequest: PTORequest }>(`/pto-requests/${id}/approve`, { 
      manager_id, 
      manager_comments 
    }),

  // Deny PTO request
  deny: (id: number, manager_id: number, manager_comments?: string) => 
    api.post<{ ptoRequest: PTORequest }>(`/pto-requests/${id}/deny`, { 
      manager_id, 
      manager_comments 
    })
}
