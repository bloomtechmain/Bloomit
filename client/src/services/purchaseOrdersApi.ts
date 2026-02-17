import axios, { type AxiosResponse, AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_URL } from '../config/api'
import type {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  ApprovePurchaseOrderRequest,
  RejectPurchaseOrderRequest,
  UploadReceiptRequest
} from '../types/purchaseOrders'

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

export const purchaseOrdersApi = {
  // Get all purchase orders with optional filters
  getAll: (params?: {
    status?: string
    vendor_id?: number
    search?: string
    start_date?: string
    end_date?: string
  }) => api.get<{ purchase_orders: PurchaseOrder[] }>('/purchase-orders', { params }),

  // Get next PO number
  getNextPoNumber: () => 
    api.get<{ po_number: string }>('/purchase-orders/next-po-number'),

  // Get purchase order by ID
  getById: (id: number) => 
    api.get<{ purchase_order: PurchaseOrder }>(`/purchase-orders/${id}`),

  // Create purchase order
  create: (data: CreatePurchaseOrderRequest) => 
    api.post<{ purchase_order: PurchaseOrder }>('/purchase-orders', data),

  // Update purchase order
  update: (id: number, data: UpdatePurchaseOrderRequest) => 
    api.put<{ purchase_order: PurchaseOrder }>(`/purchase-orders/${id}`, data),

  // Approve purchase order (Admin only)
  approve: (id: number, data: ApprovePurchaseOrderRequest) => 
    api.post<{ purchase_order: PurchaseOrder }>(`/purchase-orders/${id}/approve`, data),

  // Reject purchase order (Admin only)
  reject: (id: number, data: RejectPurchaseOrderRequest) => 
    api.post<{ purchase_order: PurchaseOrder }>(`/purchase-orders/${id}/reject`, data),

  // Upload receipt document
  uploadReceipt: (id: number, data: UploadReceiptRequest) => 
    api.post<{ purchase_order: PurchaseOrder }>(`/purchase-orders/${id}/upload-receipt`, data),

  // Delete purchase order (Admin/Super Admin only)
  delete: (id: number) => 
    api.delete<{ message: string; po_number: string; status: string }>(`/purchase-orders/${id}`)
}
