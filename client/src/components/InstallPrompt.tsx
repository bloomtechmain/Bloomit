import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user has dismissed the prompt recently
    const dismissedUntil = localStorage.getItem('pwa_install_dismissed_until')
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      return
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    
    if (isIOS) {
      // Show iOS instructions after a delay
      setTimeout(() => {
        setShowIOSInstructions(true)
      }, 5000)
    } else {
      // Handle Chrome/Edge install prompt
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        
        // Show prompt after a short delay
        setTimeout(() => {
          setShowPrompt(true)
        }, 3000)
      }

      window.addEventListener('beforeinstallprompt', handler)

      // Cleanup
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice
    
    console.log(`User ${outcome} the install prompt`)

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowIOSInstructions(false)
    
    // Don't show again for 7 days
    const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000)
    localStorage.setItem('pwa_install_dismissed_until', dismissedUntil.toString())
  }

  const handleRemindLater = () => {
    setShowPrompt(false)
    setShowIOSInstructions(false)
    
    // Show again in 24 hours
    const dismissedUntil = Date.now() + (24 * 60 * 60 * 1000)
    localStorage.setItem('pwa_install_dismissed_until', dismissedUntil.toString())
  }

  // Don't show if already installed
  if (isInstalled) return null

  // Android/Chrome/Edge Install Prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          maxWidth: 400,
          margin: '0 auto',
          zIndex: 1001,
          animation: 'slideUp 0.3s ease'
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: 20,
            borderLeft: '4px solid #3b82f6'
          }}
        >
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 4,
              fontSize: 20
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '50%',
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Download size={28} color="#3b82f6" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#fff' }}>
                Install BloomPortal
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#d1d5db', lineHeight: 1.5 }}>
                Install our app for quick access, offline support, and a better experience!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleInstall}
              className="btn-primary"
              style={{
                flex: 1,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Download size={18} />
              Install
            </button>
            <button
              onClick={handleRemindLater}
              className="btn-secondary"
              style={{
                minHeight: 44,
                padding: '0 16px'
              }}
            >
              Later
            </button>
          </div>
        </div>

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
        `}</style>
      </div>
    )
  }

  // iOS Install Instructions
  if (showIOSInstructions) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          maxWidth: 400,
          margin: '0 auto',
          zIndex: 1001,
          animation: 'slideUp 0.3s ease'
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: 20,
            borderLeft: '4px solid #3b82f6'
          }}
        >
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 4,
              fontSize: 20
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '50%',
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Smartphone size={28} color="#3b82f6" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#fff' }}>
                Install on iOS
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#d1d5db', lineHeight: 1.5 }}>
                Add BloomPortal to your home screen:
              </p>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#d1d5db', lineHeight: 1.7 }}>
                <li>Tap the <strong>Share</strong> button <span style={{ fontSize: 18 }}>⎙</span></li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> to confirm</li>
              </ol>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDismiss}
              className="btn-primary"
              style={{
                flex: 1,
                minHeight: 44
              }}
            >
              Got it
            </button>
            <button
              onClick={handleRemindLater}
              className="btn-secondary"
              style={{
                minHeight: 44,
                padding: '0 16px'
              }}
            >
              Later
            </button>
          </div>
        </div>

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
        `}</style>
      </div>
    )
  }

  return null
}
