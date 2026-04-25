export type TemplateType = 'SERVICES' | 'PRODUCTS' | 'CONSULTING' | 'CONSTRUCTION' | 'CUSTOM'
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'FOLLOW_UP'

export interface QuoteItem {
  item_id?: number
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface QuoteAdditionalService {
  service_id?: number
  service_name: string
  price: number
}

export interface Quote {
  quote_id: number
  quote_number: string
  template_type: TemplateType
  company_name: string
  company_address?: string
  date_of_issue: string
  subtotal: number
  total_due: number
  notes?: string
  status: QuoteStatus
  assigned_to?: number
  assigned_to_name?: string
  created_by?: number
  created_by_name?: string
  created_at: string
  updated_at: string
  items?: QuoteItem[]
  additional_services?: QuoteAdditionalService[]
}

export interface QuoteStatusHistory {
  history_id: number
  quote_id: number
  old_status: QuoteStatus
  new_status: QuoteStatus
  changed_by?: number
  changed_by_name?: string
  notes?: string
  changed_at: string
}

export interface ServiceSuggestion {
  service_name: string
  price: number
  usage_count: number
}

export interface CreateQuotePayload {
  template_type: TemplateType
  company_name: string
  company_address?: string
  date_of_issue: string
  notes?: string
  status?: QuoteStatus
  assigned_to?: number
  created_by?: number
  items: QuoteItem[]
  additional_services?: QuoteAdditionalService[]
}

export interface UpdateQuotePayload extends CreateQuotePayload {
  quote_id: number
}

export interface UpdateQuoteStatusPayload {
  status: QuoteStatus
  changed_by?: number
  notes?: string
}

// ========== REMINDER TYPES ==========

export type ReminderType = 'AUTO' | 'MANUAL'
export type ReminderStatus = 'PENDING' | 'SENT' | 'DISMISSED'

export interface QuoteReminder {
  reminder_id: number
  quote_id: number
  reminder_date: string
  reminder_type: ReminderType
  reminder_status: ReminderStatus
  created_by?: number
  created_by_name?: string
  assigned_to?: number
  assigned_to_name?: string
  notes?: string
  quote?: Quote
  quote_number?: string
  company_name?: string
  quote_status?: QuoteStatus
  total_due?: number
  quote_assigned_to?: number
  quote_assigned_to_name?: string
  created_at: string
  updated_at: string
}

export interface QuoteReminderSettings {
  days_after_sent: number
  days_after_follow_up: number
  enable_email_notifications: boolean
  enable_dashboard_notifications: boolean
}

export interface CreateReminderPayload {
  reminder_date: string
  notes?: string
  created_by?: number
  assigned_to?: number
}

export interface PendingRemindersResponse {
  reminders: QuoteReminder[]
  categorized: {
    overdue: QuoteReminder[]
    today: QuoteReminder[]
    upcoming: QuoteReminder[]
  }
}
