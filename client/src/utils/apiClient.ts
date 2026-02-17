import { API_URL } from '../config/api'

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

/**
 * Enhanced fetch with automatic token refresh on 401 errors
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  // Get tokens from localStorage
  const authState = localStorage.getItem('authState')
  let accessToken = localStorage.getItem('token')
  let refreshToken: string | null = null

  if (authState) {
    try {
      const parsed = JSON.parse(authState)
      accessToken = parsed.accessToken || accessToken
      refreshToken = parsed.refreshToken
    } catch (e) {
      console.error('Failed to parse authState:', e)
    }
  }

  // Add authorization header if token exists
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  // Make the request
  let response = await fetch(url, {
    ...options,
    headers,
  })

  // If we get a 401 and we have a refresh token, try to refresh
  if (response.status === 401 && refreshToken) {
    console.log('🔄 Token expired, attempting refresh...')

    // If already refreshing, wait for the new token
    if (isRefreshing) {
      return new Promise((resolve) => {
        addRefreshSubscriber((newToken: string) => {
          // Retry the original request with new token
          const newHeaders = {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          }
          resolve(
            fetch(url, {
              ...options,
              headers: newHeaders,
            })
          )
        })
      })
    }

    isRefreshing = true

    try {
      // Attempt to refresh the token
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        const newAccessToken = data.accessToken

        // Update stored tokens
        localStorage.setItem('token', newAccessToken)

        // Update authState in localStorage
        if (authState) {
          try {
            const parsed = JSON.parse(authState)
            parsed.accessToken = newAccessToken
            localStorage.setItem('authState', JSON.stringify(parsed))
          } catch (e) {
            console.error('Failed to update authState:', e)
          }
        }

        console.log('✅ Token refreshed successfully')

        // Notify all waiting requests
        onRefreshed(newAccessToken)
        isRefreshing = false

        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${newAccessToken}`
        response = await fetch(url, {
          ...options,
          headers,
        })

        return response
      } else {
        // Refresh failed - token is invalid or expired
        console.error('❌ Token refresh failed (status:', refreshResponse.status, '), logging out')
        isRefreshing = false

        // Clear auth state and redirect to login
        localStorage.removeItem('authState')
        localStorage.removeItem('token')
        
        // Show user-friendly message
        alert('Your session has expired. Please log in again.')
        
        // Trigger a page reload to show login page
        window.location.href = '/'
        
        return response
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error)
      isRefreshing = false

      // Clear auth state on error
      localStorage.removeItem('authState')
      localStorage.removeItem('token')
      
      // Show user-friendly message
      alert('Your session has expired. Please log in again.')
      
      // Trigger a page reload to show login page
      window.location.href = '/'
      
      return response
    }
  }

  return response
}

/**
 * Convenience wrapper for GET requests
 */
export async function apiGet(url: string): Promise<Response> {
  return fetchWithAuth(url, { method: 'GET' })
}

/**
 * Convenience wrapper for POST requests
 */
export async function apiPost(url: string, body?: any): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Convenience wrapper for PUT requests
 */
export async function apiPut(url: string, body?: any): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Convenience wrapper for DELETE requests
 */
export async function apiDelete(url: string): Promise<Response> {
  return fetchWithAuth(url, { method: 'DELETE' })
}
