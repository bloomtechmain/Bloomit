import { X, LayoutDashboard, User, Calendar, Clock, DollarSign, FileText, Settings, Bell, Users } from 'lucide-react'

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  currentView: string
  onNavigate: (view: 'dashboard' | 'profile' | 'timeoff' | 'timetracker' | 'payroll' | 'documents' | 'directory' | 'notifications' | 'settings') => void
}

export default function MobileNavigation({ isOpen, onClose, currentView, onNavigate }: MobileNavigationProps) {
  if (!isOpen) return null

  const handleNavigate = (view: 'dashboard' | 'profile' | 'timeoff' | 'timetracker' | 'payroll' | 'documents' | 'directory' | 'notifications' | 'settings') => {
    onNavigate(view)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="mobile-nav-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 998,
          animation: 'fadeIn 0.2s ease'
        }}
      />

      {/* Navigation Menu */}
      <nav 
        className="mobile-nav-menu"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '80vw',
          background: 'rgba(6, 48, 98, 0.98)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: '8px',
          animation: 'slideInLeft 0.3s ease',
          overflowY: 'auto'
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            alignSelf: 'flex-end',
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '8px',
            marginBottom: '16px',
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px'
          }}
          aria-label="Close menu"
        >
          <X size={24} />
        </button>

        {/* Logo/Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          padding: '0 8px'
        }}>
          <img 
            src="/BLOOM_AUDIT_LOGO_XS.png" 
            alt="BloomTech Logo" 
            style={{ height: 40, width: 'auto', objectFit: 'contain' }} 
          />
          <span style={{
            color: '#fff',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: "'Zalando Sans Expanded', sans-serif"
          }}>
            Portal
          </span>
        </div>

        {/* Navigation Items */}
        <button 
          onClick={() => handleNavigate('dashboard')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'dashboard' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'dashboard' ? 600 : 400
          }}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>

        <button 
          onClick={() => handleNavigate('profile')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'profile' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'profile' ? 600 : 400
          }}
        >
          <User size={20} />
          <span>My Profile</span>
        </button>

        <button 
          onClick={() => handleNavigate('timeoff')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'timeoff' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'timeoff' ? 600 : 400
          }}
        >
          <Calendar size={20} />
          <span>Time Off</span>
        </button>

        <button 
          onClick={() => handleNavigate('timetracker')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'timetracker' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'timetracker' ? 600 : 400
          }}
        >
          <Clock size={20} />
          <span>Time Tracker</span>
        </button>

        <button 
          onClick={() => handleNavigate('payroll')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'payroll' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'payroll' ? 600 : 400
          }}
        >
          <DollarSign size={20} />
          <span>Payroll</span>
        </button>

        <button 
          onClick={() => handleNavigate('documents')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'documents' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'documents' ? 600 : 400
          }}
        >
          <FileText size={20} />
          <span>Documents</span>
        </button>

        <button 
          onClick={() => handleNavigate('directory')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'directory' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'directory' ? 600 : 400
          }}
        >
          <Users size={20} />
          <span>Directory</span>
        </button>

        <button 
          onClick={() => handleNavigate('notifications')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'notifications' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'notifications' ? 600 : 400
          }}
        >
          <Bell size={20} />
          <span>Notifications</span>
        </button>

        <button 
          onClick={() => handleNavigate('settings')}
          className="mobile-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--primary)',
            background: currentView === 'settings' ? 'var(--accent)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            minHeight: '48px',
            textAlign: 'left',
            width: '100%',
            fontWeight: currentView === 'settings' ? 600 : 400
          }}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </nav>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .mobile-nav-item:active {
          transform: scale(0.98);
        }
      `}</style>
    </>
  )
}
