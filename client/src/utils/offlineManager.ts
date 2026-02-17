/**
 * Offline Manager - Phase 22 Day 3
 * Handles offline data caching, action queuing, and synchronization
 */

interface QueuedAction {
  id: string
  type: string
  endpoint: string
  method: string
  data: any
  timestamp: number
}

export class OfflineManager {
  private static CACHE_PREFIX = 'bloom_portal_cache_'
  private static QUEUE_KEY = 'bloom_portal_offline_queue'
  private static MAX_CACHE_AGE = 60 * 60 * 1000 // 1 hour

  /**
   * Cache dashboard data for offline viewing
   */
  static cacheDashboard(employeeId: number, data: any): void {
    try {
      const cacheKey = `${this.CACHE_PREFIX}dashboard_${employeeId}`
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Failed to cache dashboard:', error)
    }
  }

  /**
   * Retrieve cached dashboard data if available and fresh
   */
  static getCachedDashboard(employeeId: number): any | null {
    try {
      const cacheKey = `${this.CACHE_PREFIX}dashboard_${employeeId}`
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp

      // Return cached data if less than MAX_CACHE_AGE old
      if (age < this.MAX_CACHE_AGE) {
        return data
      }

      // Clear old cache
      localStorage.removeItem(cacheKey)
      return null
    } catch (error) {
      console.error('Failed to retrieve cached dashboard:', error)
      return null
    }
  }

  /**
   * Cache PTO balance data
   */
  static cachePTOBalance(employeeId: number, data: any): void {
    try {
      const cacheKey = `${this.CACHE_PREFIX}pto_balance_${employeeId}`
      const cacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Failed to cache PTO balance:', error)
    }
  }

  /**
   * Retrieve cached PTO balance
   */
  static getCachedPTOBalance(employeeId: number): any | null {
    try {
      const cacheKey = `${this.CACHE_PREFIX}pto_balance_${employeeId}`
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp

      if (age < this.MAX_CACHE_AGE) {
        return data
      }

      localStorage.removeItem(cacheKey)
      return null
    } catch (error) {
      console.error('Failed to retrieve cached PTO balance:', error)
      return null
    }
  }

  /**
   * Check if device is online
   */
  static isOnline(): boolean {
    return navigator.onLine
  }

  /**
   * Queue an action to be performed when online
   */
  static queueAction(action: Omit<QueuedAction, 'id' | 'timestamp'>): void {
    try {
      const queue = this.getQueue()
      const queuedAction: QueuedAction = {
        ...action,
        id: this.generateId(),
        timestamp: Date.now()
      }
      queue.push(queuedAction)
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue))
      
      console.log('Action queued for sync:', queuedAction.type)
    } catch (error) {
      console.error('Failed to queue action:', error)
    }
  }

  /**
   * Get all queued actions
   */
  static getQueue(): QueuedAction[] {
    try {
      const queue = localStorage.getItem(this.QUEUE_KEY)
      return queue ? JSON.parse(queue) : []
    } catch (error) {
      console.error('Failed to get queue:', error)
      return []
    }
  }

  /**
   * Get count of queued actions
   */
  static getQueueCount(): number {
    return this.getQueue().length
  }

  /**
   * Process all queued actions when connection is restored
   */
  static async processQueue(accessToken: string): Promise<void> {
    if (!this.isOnline()) {
      console.log('Cannot process queue: offline')
      return
    }

    const queue = this.getQueue()
    if (queue.length === 0) {
      console.log('No queued actions to process')
      return
    }

    console.log(`Processing ${queue.length} queued actions...`)
    const results = []

    for (const action of queue) {
      try {
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: action.data ? JSON.stringify(action.data) : undefined
        })

        if (response.ok) {
          results.push({ id: action.id, success: true })
          console.log(`✓ Synced action: ${action.type}`)
        } else {
          results.push({ id: action.id, success: false, error: response.statusText })
          console.error(`✗ Failed to sync action: ${action.type}`, response.statusText)
        }
      } catch (error) {
        results.push({ id: action.id, success: false, error: String(error) })
        console.error(`✗ Error syncing action: ${action.type}`, error)
      }
    }

    // Remove successful actions from queue
    const successfulIds = results.filter(r => r.success).map(r => r.id)
    const remainingQueue = queue.filter(a => !successfulIds.includes(a.id))
    
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remainingQueue))
    
    console.log(`Sync complete: ${successfulIds.length} successful, ${remainingQueue.length} remaining`)
  }

  /**
   * Clear all queued actions
   */
  static clearQueue(): void {
    localStorage.removeItem(this.QUEUE_KEY)
  }

  /**
   * Clear all cached data
   */
  static clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
      console.log('All cache cleared')
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  /**
   * Generate unique ID for queued actions
   */
  private static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { cacheSize: number; queueSize: number } {
    try {
      let cacheSize = 0
      const keys = Object.keys(localStorage)
      
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const item = localStorage.getItem(key)
          if (item) {
            cacheSize += item.length
          }
        }
      })

      return {
        cacheSize: Math.round(cacheSize / 1024), // KB
        queueSize: this.getQueueCount()
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return { cacheSize: 0, queueSize: 0 }
    }
  }
}

/**
 * Setup online/offline event listeners
 */
export function setupOfflineListeners(onStatusChange?: (isOnline: boolean) => void): () => void {
  const handleOnline = () => {
    console.log('✓ Connection restored')
    if (onStatusChange) onStatusChange(true)
  }

  const handleOffline = () => {
    console.log('✗ Connection lost')
    if (onStatusChange) onStatusChange(false)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
