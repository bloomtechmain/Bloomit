import axios from 'axios'
import { API_URL } from '../config/api'
import type { TimeEntry, ActiveTimer, TimeSummary } from '../types/timeEntries'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Time Entries API
export const timeEntriesApi = {
  // Get employee's own time entries
  getMyEntries: (params: {
    employee_id: number
    start_date?: string
    end_date?: string
    project_id?: number
    status?: string
  }) => api.get<{ timeEntries: TimeEntry[] }>('/time-entries/my-entries', { params }),

  // Create manual time entry
  create: (data: {
    employee_id: number
    project_id: number
    contract_id?: number | null
    date: string
    total_hours: number
    break_time_minutes?: number
    description?: string
  }) => api.post<{ timeEntry: TimeEntry }>('/time-entries', data),

  // Update time entry
  update: (id: number, data: {
    total_hours?: number
    break_time_minutes?: number
    description?: string
    date?: string
  }) => api.put<{ timeEntry: TimeEntry }>(`/time-entries/${id}`, data),

  // Delete time entry
  delete: (id: number) => api.delete(`/time-entries/${id}`),

  // Timer operations
  timer: {
    // Start timer
    start: (data: {
      employee_id: number
      project_id: number
      contract_id?: number | null
      description?: string
    }) => api.post<{ timeEntry: TimeEntry; activeTimer: ActiveTimer }>('/time-entries/timer/start', data),

    // Get active timer
    getActive: (employeeId: number) => 
      api.get<{ activeTimer: ActiveTimer | null }>(`/time-entries/timer/active/${employeeId}`),

    // Pause timer (start break)
    pause: (employee_id: number) =>
      api.post<{ activeTimer: ActiveTimer }>('/time-entries/timer/pause', { employee_id }),

    // Resume timer (end break)
    resume: (employee_id: number) =>
      api.post<{ activeTimer: ActiveTimer }>('/time-entries/timer/resume', { employee_id }),

    // Stop timer
    stop: (data: {
      employee_id: number
      description?: string
    }) => api.post<{ timeEntry: TimeEntry }>('/time-entries/timer/stop', data)
  },

  // Manager operations
  manager: {
    // Get pending time entries
    getPending: () => api.get<{ timeEntries: TimeEntry[] }>('/time-entries/pending'),

    // Approve time entry
    approve: (id: number, approved_by: number) =>
      api.put<{ timeEntry: TimeEntry }>(`/time-entries/${id}/approve`, { approved_by }),

    // Reject time entry
    reject: (id: number, approved_by: number, rejection_note?: string) =>
      api.put<{ timeEntry: TimeEntry }>(`/time-entries/${id}/reject`, { approved_by, rejection_note })
  },

  // Get summary statistics
  getSummary: (params?: {
    employee_id?: number
    project_id?: number
    start_date?: string
    end_date?: string
  }) => api.get<TimeSummary>('/time-entries/summary', { params })
}

export default timeEntriesApi
