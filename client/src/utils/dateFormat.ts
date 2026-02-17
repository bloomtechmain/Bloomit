/**
 * Date Formatting Utilities
 * 
 * Provides consistent date formatting throughout the application
 * Format: DD/MM/YYYY as per requirement
 */

/**
 * Format a date to DD/MM/YYYY
 * @param date - Date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = new Date(date)
    
    // Check if date is valid
    if (isNaN(d.getTime())) return '-'
    
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    
    return `${day}/${month}/${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return '-'
  }
}

/**
 * Format a date to DD/MM/YYYY HH:MM
 * @param date - Date string or Date object
 * @returns Formatted date string with time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = new Date(date)
    
    // Check if date is valid
    if (isNaN(d.getTime())) return '-'
    
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return '-'
  }
}

/**
 * Parse DD/MM/YYYY to Date object
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Date object
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  try {
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
    const year = parseInt(parts[2], 10)
    
    const date = new Date(year, month, day)
    
    // Validate the date
    if (isNaN(date.getTime())) return null
    
    return date
  } catch (error) {
    console.error('Error parsing date:', error)
    return null
  }
}

/**
 * Convert Date to YYYY-MM-DD for API calls
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function toISODate(date: Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('Error converting to ISO date:', error)
    return ''
  }
}

/**
 * Calculate days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days (inclusive)
 */
export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
    
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Add 1 to make it inclusive (e.g., Monday to Friday is 5 days, not 4)
    return diffDays + 1
  } catch (error) {
    console.error('Error calculating days between:', error)
    return 0
  }
}

/**
 * Mask sensitive data (show only last 4 characters)
 * @param value - Value to mask
 * @returns Masked value
 */
export function maskSensitiveData(value: string | null | undefined): string {
  if (!value) return '****'
  if (value.length <= 4) return '****'
  
  return '****' + value.slice(-4)
}
