import axios, { type AxiosResponse, AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_URL } from '../config/api'
import type { Subscription } from '../types/subscriptions'

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

export const subscriptionsApi = {
  // Get all subscriptions
  getAll: () => 
    api.get<{ subscriptions: Subscription[] }>('/subscriptions'),

  // Get subscription by ID
  getById: (id: number) => 
    api.get<{ subscription: Subscription }>(`/subscriptions/${id}`),

  // Create subscription
  create: (data: {
    description: string
    amount: number | string
    due_date: string
    frequency: 'MONTHLY' | 'YEARLY'
    auto_pay?: boolean
    is_active?: boolean
  }) => api.post<{ subscription: Subscription }>('/subscriptions', data),

  // Update subscription
  update: (id: number, data: {
    description: string
    amount: number | string
    due_date: string
    frequency: 'MONTHLY' | 'YEARLY'
    auto_pay?: boolean
    is_active?: boolean
  }) => api.put<{ subscription: Subscription }>(`/subscriptions/${id}`, data),

  // Delete subscription
  delete: (id: number) => 
    api.delete<{ message: string; id: number }>(`/subscriptions/${id}`)
}
