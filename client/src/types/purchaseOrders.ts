export interface PurchaseOrderItem {
  id?: number
  purchase_order_id?: number
  quantity: number
  description: string
  unit_price: number
  total: number
  line_order?: number
  created_at?: string
}

export interface PurchaseOrder {
  id: number
  po_number: string
  requested_by_user_id?: number
  requested_by_name: string
  requested_by_title?: string
  requested_by_user_name?: string
  vendor_id?: number
  vendor_name?: string
  vendor_invoice_number?: string
  project_id?: number
  project_name?: string
  
  // Financial details
  subtotal: number
  sales_tax: number
  shipping_handling: number
  banking_fee: number
  total_amount: number
  
  // Payment details
  payment_method?: 'DEPOSIT_CHECK' | 'CREDIT_CARD' | 'PAYMENT_CHECK' | 'CASH' | 'PETTY_CASH' | string
  check_number?: string
  payment_amount?: number
  payment_date?: string
  
  // Approval workflow
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  approved_by_user_id?: number
  approved_by_name?: string
  approved_by_title?: string
  approved_by_user_name?: string
  approved_at?: string
  rejection_reason?: string
  
  // Document management
  receipt_document_url?: string
  receipt_uploaded_at?: string
  
  notes?: string
  created_at: string
  updated_at: string
  
  // Items (when fetching single PO)
  items?: PurchaseOrderItem[]
}

export interface CreatePurchaseOrderRequest {
  po_number: string
  requested_by_user_id?: number
  requested_by_name: string
  requested_by_title?: string
  vendor_id?: number
  vendor_invoice_number?: string
  project_id?: number
  subtotal: number
  sales_tax: number
  shipping_handling: number
  banking_fee: number
  total_amount: number
  payment_method?: string
  check_number?: string
  payment_amount?: number
  payment_date?: string
  notes?: string
  items: PurchaseOrderItem[]
}

export interface UpdatePurchaseOrderRequest {
  requested_by_name: string
  requested_by_title?: string
  vendor_id?: number
  vendor_invoice_number?: string
  project_id?: number
  subtotal: number
  sales_tax: number
  shipping_handling: number
  banking_fee: number
  total_amount: number
  payment_method?: string
  check_number?: string
  payment_amount?: number
  payment_date?: string
  notes?: string
  items: PurchaseOrderItem[]
}

export interface ApprovePurchaseOrderRequest {
  approved_by_user_id: number
  approved_by_name: string
  approved_by_title?: string
}

export interface RejectPurchaseOrderRequest {
  rejection_reason: string
}

export interface UploadReceiptRequest {
  receipt_document_url: string
}
