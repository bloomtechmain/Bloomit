/**
 * PTO Calculation Utilities
 * Phase 5: Helper functions for calculating PTO balance and related metrics
 */

export interface PTOBalanceData {
  totalAllowance: number
  daysUsed: number
  daysPending: number
  daysRemaining: number
  percentageUsed: number
  status: 'healthy' | 'warning' | 'critical'
}

/**
 * Calculate the number of days between two dates (inclusive)
 */
export function calculateDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Calculate difference in milliseconds
  const diffTime = Math.abs(end.getTime() - start.getTime())
  
  // Convert to days and add 1 to make it inclusive
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  return diffDays
}

/**
 * Calculate PTO balance accounting for pending requests
 */
export function calculatePTOBalance(
  totalAllowance: number,
  approvedDays: number,
  pendingDays: number = 0
): PTOBalanceData {
  const daysUsed = approvedDays
  const daysPending = pendingDays
  const daysRemaining = totalAllowance - daysUsed
  const percentageUsed = totalAllowance > 0 ? (daysUsed / totalAllowance) * 100 : 0
  
  // Determine status based on remaining days
  let status: 'healthy' | 'warning' | 'critical'
  if (daysRemaining > totalAllowance * 0.5) {
    status = 'healthy'
  } else if (daysRemaining > totalAllowance * 0.25) {
    status = 'warning'
  } else {
    status = 'critical'
  }
  
  return {
    totalAllowance,
    daysUsed,
    daysPending,
    daysRemaining,
    percentageUsed: Math.round(percentageUsed),
    status
  }
}

/**
 * Get color scheme based on PTO balance status
 */
export function getPTOStatusColor(status: 'healthy' | 'warning' | 'critical'): {
  background: string
  text: string
  progress: string
} {
  switch (status) {
    case 'healthy':
      return {
        background: '#d1fae5',
        text: '#10b981',
        progress: '#10b981'
      }
    case 'warning':
      return {
        background: '#fef3c7',
        text: '#f59e0b',
        progress: '#f59e0b'
      }
    case 'critical':
      return {
        background: '#fee2e2',
        text: '#ef4444',
        progress: '#ef4444'
      }
  }
}

/**
 * Format PTO days for display
 */
export function formatPTODays(days: number): string {
  if (days === 1) return '1 day'
  return `${days} days`
}

/**
 * Calculate average days used per month (year-to-date)
 */
export function calculateMonthlyAverage(daysUsed: number): number {
  const currentMonth = new Date().getMonth() + 1 // 1-12
  if (currentMonth === 0) return 0
  
  return Math.round((daysUsed / currentMonth) * 10) / 10
}

/**
 * Project remaining PTO usage rate
 */
export function projectYearEndBalance(
  totalAllowance: number,
  daysUsed: number
): {
  projectedUsage: number
  projectedRemaining: number
  onTrack: boolean
} {
  const currentMonth = new Date().getMonth() + 1
  const monthsRemaining = 12 - currentMonth
  
  if (monthsRemaining <= 0) {
    return {
      projectedUsage: daysUsed,
      projectedRemaining: totalAllowance - daysUsed,
      onTrack: true
    }
  }
  
  const monthlyAverage = daysUsed / currentMonth
  const projectedUsage = Math.round(daysUsed + (monthlyAverage * monthsRemaining))
  const projectedRemaining = totalAllowance - projectedUsage
  const onTrack = projectedRemaining >= 0
  
  return {
    projectedUsage,
    projectedRemaining,
    onTrack
  }
}
