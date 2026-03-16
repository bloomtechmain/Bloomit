import './App.css'
import { useState, useEffect, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmployeePortal from './pages/EmployeePortal'
import SessionExpirationWarning from './components/SessionExpirationWarning'
import { isTokenExpired, isTokenExpiringSoon, getTimeUntilExpiry } from './utils/tokenManager'
import { API_URL } from './config/api'

type User = { 
  id: number
  name: string
  email: string
  roleId: number | null
  roleName: string | null
  roleNames?: string[]
  permissions: string[]
}

type AuthState = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ background: '#eee', padding: 10, borderRadius: 4, maxWidth: '800px', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, background: '#0061ff', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Reload Application
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Try to load auth state from localStorage
    const stored = localStorage.getItem('authState')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        
        // Check if token is expired
        if (parsed.accessToken && isTokenExpired(parsed.accessToken)) {
          console.log('⚠️ Token expired on app initialization, clearing auth state')
          localStorage.removeItem('authState')
          localStorage.removeItem('token')
          return { user: null, accessToken: null, refreshToken: null }
        }
        
        // Ensure token is also available for API interceptors
        if (parsed.accessToken) {
          localStorage.setItem('token', parsed.accessToken)
        }
        return parsed
      } catch {
        return { user: null, accessToken: null, refreshToken: null }
      }
    }
    return { user: null, accessToken: null, refreshToken: null }
  })
  
  const [showExpirationWarning, setShowExpirationWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (authState.user && authState.accessToken) {
      localStorage.setItem('authState', JSON.stringify(authState))
    } else {
      localStorage.removeItem('authState')
    }
  }, [authState])

  const handleLogin = (user: User, accessToken: string, refreshToken: string) => {
    setAuthState({ user, accessToken, refreshToken })
    // Store token separately for API interceptors
    localStorage.setItem('token', accessToken)
  }

  const handleLogout = () => {
    console.log('🚪 Logging out user')
    // Call backend to delete the active session row (fire-and-forget)
    const token = authState.accessToken
    if (token) {
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* ignore network errors — local state is cleared regardless */})
    }
    setAuthState({ user: null, accessToken: null, refreshToken: null })
    localStorage.removeItem('authState')
    localStorage.removeItem('token')
    setShowExpirationWarning(false)
  }
  
  // Monitor token expiration
  useEffect(() => {
    if (!authState.accessToken) return
    
    // Check token expiration every 10 seconds
    const interval = setInterval(() => {
      const token = authState.accessToken
      
      if (!token) {
        clearInterval(interval)
        return
      }
      
      // Check if token is expired
      if (isTokenExpired(token)) {
        console.log('⏰ Token expired, logging out')
        handleLogout()
        return
      }
      
      // Check if token is expiring soon (5 minutes)
      if (isTokenExpiringSoon(token, 5) && !showExpirationWarning) {
        const remaining = getTimeUntilExpiry(token)
        console.log('⚠️ Token expiring soon, showing warning')
        setTimeRemaining(remaining)
        setShowExpirationWarning(true)
      }
    }, 10000) // Check every 10 seconds
    
    // Initial check
    if (isTokenExpired(authState.accessToken)) {
      console.log('⏰ Token expired on mount, logging out')
      handleLogout()
    } else if (isTokenExpiringSoon(authState.accessToken, 5)) {
      const remaining = getTimeUntilExpiry(authState.accessToken)
      console.log('⚠️ Token expiring soon on mount, showing warning')
      setTimeRemaining(remaining)
      setShowExpirationWarning(true)
    }
    
    return () => clearInterval(interval)
  }, [authState.accessToken, showExpirationWarning])
  
  // Handle session refresh
  const handleRefreshSession = async () => {
    console.log('🔄 Refreshing session via user request')
    
    if (!authState.refreshToken) {
      console.error('❌ No refresh token available')
      handleLogout()
      return
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: authState.refreshToken }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const newAccessToken = data.accessToken
        
        console.log('✅ Session refreshed successfully')
        
        // Update auth state with new token
        setAuthState(prev => ({ ...prev, accessToken: newAccessToken }))
        localStorage.setItem('token', newAccessToken)
        
        // Update authState in localStorage
        const stored = localStorage.getItem('authState')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            parsed.accessToken = newAccessToken
            localStorage.setItem('authState', JSON.stringify(parsed))
          } catch (e) {
            console.error('Failed to update authState:', e)
          }
        }
        
        // Hide warning
        setShowExpirationWarning(false)
      } else {
        console.error('❌ Session refresh failed')
        handleLogout()
      }
    } catch (error) {
      console.error('❌ Session refresh error:', error)
      handleLogout()
    }
  }

  if (!authState.user || !authState.accessToken || !authState.refreshToken) {
    return <Login onLoggedIn={handleLogin} />
  }

  // Check if user is a regular employee (not admin/manager)
  const isRegularEmployee = authState.user.roleNames?.includes('Employee') && 
    !authState.user.roleNames?.includes('Admin') && 
    !authState.user.roleNames?.includes('Super Admin') &&
    !authState.user.roleNames?.includes('Manager')

  return (
    <ErrorBoundary>
      {/* Session Expiration Warning Modal */}
      {showExpirationWarning && (
        <SessionExpirationWarning
          timeRemaining={timeRemaining}
          onRefreshSession={handleRefreshSession}
          onLogout={handleLogout}
        />
      )}
      
      {isRegularEmployee ? (
        <EmployeePortal 
          user={authState.user} 
          accessToken={authState.accessToken}
          onLogout={handleLogout}
        />
      ) : (
        <Dashboard 
          user={authState.user} 
          accessToken={authState.accessToken}
          refreshToken={authState.refreshToken}
          onLogout={handleLogout}
          onTokenRefresh={(newAccessToken: string) => {
            console.log('🔄 Token refreshed via Dashboard callback')
            setAuthState(prev => ({ ...prev, accessToken: newAccessToken }))
            localStorage.setItem('token', newAccessToken)
            
            // Update authState in localStorage
            const stored = localStorage.getItem('authState')
            if (stored) {
              try {
                const parsed = JSON.parse(stored)
                parsed.accessToken = newAccessToken
                localStorage.setItem('authState', JSON.stringify(parsed))
              } catch (e) {
                console.error('Failed to update authState:', e)
              }
            }
          }}
        />
      )}
    </ErrorBoundary>
  )
}
