import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, LogOut, RefreshCw } from 'lucide-react'

interface SessionExpirationWarningProps {
  timeRemaining: number // in milliseconds
  onRefreshSession: () => void
  onLogout: () => void
}

export default function SessionExpirationWarning({
  timeRemaining,
  onRefreshSession,
  onLogout
}: SessionExpirationWarningProps) {
  const [countdown, setCountdown] = useState(Math.floor(timeRemaining / 1000))
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          // Auto logout when countdown reaches 0
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [onLogout])
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          maxWidth: 500,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        {/* Warning Icon */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <AlertTriangle
            size={64}
            color="#ff9800"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
        </div>
        
        {/* Title */}
        <h2
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: 24,
            fontWeight: 600,
            color: '#333',
            textAlign: 'center'
          }}
        >
          Session Expiring Soon
        </h2>
        
        {/* Message */}
        <p
          style={{
            margin: 0,
            marginBottom: 24,
            fontSize: 16,
            color: '#666',
            textAlign: 'center',
            lineHeight: 1.5
          }}
        >
          Your session will expire in <strong style={{ color: '#ff9800' }}>{formatTime(countdown)}</strong>.
          <br />
          Would you like to stay logged in?
        </p>
        
        {/* Countdown Display */}
        <div
          style={{
            background: '#f5f5f5',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12
          }}
        >
          <Clock size={24} color="#ff9800" />
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: countdown < 60 ? '#f44336' : '#ff9800',
              fontFamily: 'monospace'
            }}
          >
            {formatTime(countdown)}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onRefreshSession}
            style={{
              flex: 1,
              padding: '14px 20px',
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 10,
              border: 'none',
              background: '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#45a049'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4CAF50'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <RefreshCw size={20} />
            Stay Logged In
          </button>
          
          <button
            onClick={onLogout}
            style={{
              flex: 1,
              padding: '14px 20px',
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 10,
              border: '2px solid #f44336',
              background: '#fff',
              color: '#f44336',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f44336'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.color = '#f44336'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <LogOut size={20} />
            Logout Now
          </button>
        </div>
        
        {/* Auto-logout notice */}
        <p
          style={{
            margin: 0,
            marginTop: 16,
            fontSize: 13,
            color: '#999',
            textAlign: 'center'
          }}
        >
          You will be automatically logged out when the timer reaches zero.
        </p>
      </div>
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
        `}
      </style>
    </div>
  )
}
