import { API_URL } from '../config/api'
import type {
  Quote,
  CreateQuotePayload,
  UpdateQuotePayload,
  UpdateQuoteStatusPayload,
  QuoteStatusHistory,
  ServiceSuggestion,
  QuoteReminder,
  QuoteReminderSettings,
  CreateReminderPayload,
  PendingRemindersResponse
} from '../types/quotes'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// Get all quotes
export const getAllQuotes = async (): Promise<Quote[]> => {
  const response = await fetch(`${API_URL}/quotes`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch quotes')
  }
  
  const data = await response.json()
  return data.quotes
}

// Get quote by ID
export const getQuoteById = async (id: number): Promise<Quote> => {
  const response = await fetch(`${API_URL}/quotes/${id}`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch quote')
  }
  
  const data = await response.json()
  return data.quote
}

// Create new quote
export const createQuote = async (payload: CreateQuotePayload): Promise<Quote> => {
  const response = await fetch(`${API_URL}/quotes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create quote')
  }
  
  const data = await response.json()
  return data.quote
}

// Update quote
export const updateQuote = async (id: number, payload: UpdateQuotePayload): Promise<Quote> => {
  const response = await fetch(`${API_URL}/quotes/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update quote')
  }
  
  const data = await response.json()
  return data.quote
}

// Update quote status
export const updateQuoteStatus = async (
  id: number,
  payload: UpdateQuoteStatusPayload
): Promise<Quote> => {
  const response = await fetch(`${API_URL}/quotes/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update quote status')
  }
  
  const data = await response.json()
  return data.quote
}

// Get quote status history
export const getQuoteStatusHistory = async (id: number): Promise<QuoteStatusHistory[]> => {
  const response = await fetch(`${API_URL}/quotes/${id}/history`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch quote history')
  }
  
  const data = await response.json()
  return data.history
}

// Delete quote
export const deleteQuote = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/quotes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete quote')
  }
}

// Get service suggestions for autocomplete
export const getServiceSuggestions = async (): Promise<ServiceSuggestion[]> => {
  const response = await fetch(`${API_URL}/quotes/suggestions/services`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch service suggestions')
  }
  
  const data = await response.json()
  return data.suggestions
}

// Assign quote to employee
export const assignQuote = async (id: number, assignedTo: number): Promise<Quote> => {
  const response = await fetch(`${API_URL}/quotes/${id}/assign`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ assigned_to: assignedTo })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to assign quote')
  }
  
  const data = await response.json()
  return data.quote
}

// ========== REMINDER API FUNCTIONS ==========

// Get all pending reminders (for dashboard widget)
export const getAllPendingReminders = async (): Promise<PendingRemindersResponse> => {
  const response = await fetch(`${API_URL}/quotes/reminders/pending`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch pending reminders')
  }
  
  return await response.json()
}

// Get reminders for a specific quote
export const getQuoteReminders = async (quoteId: number): Promise<QuoteReminder[]> => {
  const response = await fetch(`${API_URL}/quotes/${quoteId}/reminders`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch quote reminders')
  }
  
  const data = await response.json()
  return data.reminders
}

// Create a manual reminder for a quote
export const createReminder = async (
  quoteId: number,
  payload: CreateReminderPayload
): Promise<QuoteReminder> => {
  const response = await fetch(`${API_URL}/quotes/${quoteId}/reminders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create reminder')
  }
  
  const data = await response.json()
  return data.reminder
}

// Dismiss a reminder
export const dismissReminder = async (reminderId: number): Promise<QuoteReminder> => {
  const response = await fetch(`${API_URL}/quotes/reminders/${reminderId}/dismiss`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to dismiss reminder')
  }
  
  const data = await response.json()
  return data.reminder
}

// Get reminder settings
export const getReminderSettings = async (): Promise<QuoteReminderSettings> => {
  const response = await fetch(`${API_URL}/quotes/reminders/settings`, {
    method: 'GET',
    headers: getAuthHeaders()
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch reminder settings')
  }
  
  const data = await response.json()
  return data.settings
}

// Update reminder settings
export const updateReminderSettings = async (
  settings: Partial<QuoteReminderSettings>
): Promise<QuoteReminderSettings> => {
  const response = await fetch(`${API_URL}/quotes/reminders/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update reminder settings')
  }
  
  const data = await response.json()
  return data.settings
}

// Schedule a new reminder (alias for createReminder for backward compatibility)
export const scheduleReminder = async (data: {
  quote_id: number
  reminder_date: string
  notes?: string
  assigned_to?: number
}): Promise<QuoteReminder> => {
  return createReminder(data.quote_id, {
    reminder_date: data.reminder_date,
    notes: data.notes,
    assigned_to: data.assigned_to
  })
}
