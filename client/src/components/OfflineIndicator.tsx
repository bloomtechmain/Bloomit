import { useEffect, useState } from 'react'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { OfflineManager } from '../utils/offlineManager'

interface OfflineIndicatorProps {
  accessToken: string
  onSync?: () => void
}

export default function OfflineIndicator({ accessToken, onSync }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Update queue count
    const updateQueueCount = () => {
      setQueueCount(OfflineManager.getQueueCount())
    }

    updateQueueCount()
    const interval = setInterval(updateQueueCount, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      setShowBanner(true)
      
      // Auto-sync queued actions
      if (OfflineManager.getQueueCount() > 0) {
        setSyncing(true)
        try {
          await OfflineManager.processQueue(accessToken)
          setQueueCount(OfflineManager.getQueueCount())
          if (onSync) onSync()
        } catch (error) {
          console.error('Sync failed:', error)
        } finally {
          setSyncing(false)
        }
      }

      // Hide banner after 5 seconds
      setTimeout(() => setShowBanner(false), 5000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [accessToken, onSync])

  const handleManualSync = async () => {
    if (!isOnline || syncing) return

    setSyncing(true)
    try {
      await OfflineManager.processQueue(accessToken)
      setQueueCount(OfflineManager.getQueueCount())
      if (onSync) onSync()
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  // Don't show anything if online and no queued actions
  if (isOnline && queueCount === 0 && !showBanner) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        left: 16,
        maxWidth: 400,
        margin: '0 auto',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease'
      }}
    >
      {/* Offline Banner */}
      {!isOnline && (
        <div
          className="glass-panel"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderLeft: '4px solid #f59e0b'
          }}
        >
          <WifiOff size={24} color="#f59e0b" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>
              You're offline
            </div>
            <div style={{ fontSize: 12, color: '#d1d5db' }}>
              {queueCount > 0 
                ? `${queueCount} action${queueCount > 1 ? 's' : ''} will sync when online`
                : 'Changes will be saved when you reconnect'}
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 4,
              fontSize: 20
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Online Banner with Queued Actions */}
      {isOnline && queueCount > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderLeft: '4px solid #10b981'
          }}
        >
          <Wifi size={24} color="#10b981" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>
              {syncing ? 'Syncing...' : 'Back online'}
            </div>
            <div style={{ fontSize: 12, color: '#d1d5db' }}>
              {syncing 
                ? 'Syncing your changes...'
                : `${queueCount} action${queueCount > 1 ? 's' : ''} waiting to sync`}
            </div>
          </div>
          {!syncing && (
            <button
              onClick={handleManualSync}
              className="btn-secondary"
              style={{
                padding: '8px 12px',
                minHeight: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12
              }}
            >
              <RefreshCw size={14} />
              Sync Now
            </button>
          )}
          {syncing && (
            <div style={{ animation: 'spin 1s linear infinite' }}>
              <RefreshCw size={20} color="#10b981" />
            </div>
          )}
        </div>
      )}

      {/* Connection Restored Banner */}
      {isOnline && queueCount === 0 && showBanner && (
        <div
          className="glass-panel"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderLeft: '4px solid #10b981'
          }}
        >
          <Wifi size={24} color="#10b981" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>
              Connection restored
            </div>
            <div style={{ fontSize: 12, color: '#d1d5db' }}>
              You're back online
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 4,
              fontSize: 20
            }}
          >
            ×
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
