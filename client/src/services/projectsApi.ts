import axios, { type AxiosResponse, AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_URL } from '../config/api'
import type { Project, Contract, ContractItem } from '../types/projects'

// Create axios instance with base configuration
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

// Projects endpoints
export const projectsApi = {
  getAll: () => api.get<{ projects: Project[] }>('/projects'),
  getById: (id: number) => api.get<{ project: Project }>(`/projects/${id}`),
  create: (data: Partial<Project>) => api.post<{ project: Project }>('/projects', data),
  update: (id: number, data: Partial<Project>) => api.put<{ project: Project }>(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`)
}

// Contracts endpoints
export const contractsApi = {
  getAll: (projectId: number) => api.get<{ contracts: Contract[] }>(`/projects/${projectId}/contracts`),
  getById: (projectId: number, contractId: number) => 
    api.get<{ contract: Contract }>(`/projects/${projectId}/contracts/${contractId}`),
  create: (projectId: number, data: Partial<Contract>) => 
    api.post<{ contract: Contract }>(`/projects/${projectId}/contracts`, data),
  update: (projectId: number, contractId: number, data: Partial<Contract>) => 
    api.put<{ contract: Contract }>(`/projects/${projectId}/contracts/${contractId}`, data),
  delete: (projectId: number, contractId: number) => 
    api.delete(`/projects/${projectId}/contracts/${contractId}`)
}

// Items endpoints
export const itemsApi = {
  getAll: (projectId: number, contractId: number) => 
    api.get<{ items: ContractItem[], budget?: any, total_items_cost?: number }>(`/projects/${projectId}/contracts/${contractId}/items`),
  create: (projectId: number, contractId: number, data: Partial<ContractItem>) => 
    api.post<{ item: ContractItem }>(`/projects/${projectId}/contracts/${contractId}/items`, data),
  update: (projectId: number, contractId: number, requirements: string, data: Partial<ContractItem>) => 
    api.put<{ item: ContractItem }>(`/projects/${projectId}/contracts/${contractId}/items/${encodeURIComponent(requirements)}`, data),
  delete: (projectId: number, contractId: number, requirements: string) => 
    api.delete(`/projects/${projectId}/contracts/${contractId}/items/${encodeURIComponent(requirements)}`)
}

// Export the axios instance for custom requests if needed
export default api
