import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, User, Calendar, Clock, DollarSign, FileText, Settings, ChevronLeft, ChevronRight, Menu, Bell, Users } from 'lucide-react'
import MobileNavigation from '../components/employee/MobileNavigation'
import OfflineIndicator from '../components/OfflineIndicator'
import InstallPrompt from '../components/InstallPrompt'
import { getEmployeeDashboard } from '../services/employeePortalService'
import type { EmployeeDashboardData } from '../services/employeePortalService'
import EmployeeStatsCard from '../components/employee/EmployeeStatsCard'
import PTOBalanceCard from '../components/employee/PTOBalanceCard'
import AnnouncementsFeed from '../components/employee/AnnouncementsFeed'
import UpcomingDeadlines from '../components/employee/UpcomingDeadlines'
import CalendarWidget from '../components/CalendarWidget'
import NotesWidget from '../components/NotesWidget'
import TodosWidget from '../components/TodosWidget'
import SystemClock from '../components/SystemClock'
import InternationalClock from '../components/InternationalClock'
import EmployeeProfile from './EmployeeProfile'
import EmployeeTimeOff from './EmployeeTimeOff'
import EmployeeTimeTracker from './EmployeeTimeTracker'
import EmployeePayroll from './EmployeePayroll'
import EmployeeDocuments from './EmployeeDocuments'
import EmployeeDirectory from './EmployeeDirectory'
import EmployeeNotifications from './EmployeeNotifications'
import EmployeeSettings from './EmployeeSettings'

type User = {
  id: number
  name: string
  email: string
  roleId: number | null
  roleName: string | null
  roleNames?: string[]
  permissions: string[]
}

interface EmployeePortalProps {
  user: User
  accessToken: string
  onLogout?: () => void
}

export default function EmployeePortal({ user, accessToken, onLogout }: EmployeePortalProps) {
  const [navOpen, setNavOpen] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<EmployeeDashboardData | null>(null)
  const [internationalTimezone, setInternationalTimezone] = useState('America/New_York')
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile' | 'timeoff' | 'timetracker' | 'payroll' | 'documents' | 'directory' | 'notifications' | 'settings'>('dashboard')
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  // Detect mobile/tablet/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setNavOpen(false)
      } else {
        setNavOpen(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch employee dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Get employee record using the new /me endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/employee-portal/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch employee record')
      }
      
      const data = await response.json()
      
      if (!data.employee) {
        setError('Employee record not found. Please contact HR.')
        return
      }

      const dashboard = await getEmployeeDashboard(data.employee.id, accessToken)
      setDashboardData(dashboard)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    fetchDashboard()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  // Update unread notification count from dashboard data
  useEffect(() => {
    if (dashboardData?.stats.unreadNotifications !== undefined) {
      setUnreadNotifications(dashboardData.stats.unreadNotifications)
    }
  }, [dashboardData])

  // Fetch international timezone setting
  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/settings/international_timezone`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        if (r.ok) {
          const data = await r.json()
          if (data.setting?.setting_value) {
            setInternationalTimezone(data.setting.setting_value)
          }
        }
      } catch (err) {
        console.error('Error fetching timezone:', err)
      }
    }
    fetchTimezone()
  }, [accessToken])

  if (loading && !dashboardData) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>Loading your portal...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div className="glass-panel" style={{ padding: 40, maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Error Loading Portal</h2>
          <p style={{ marginBottom: 24, color: '#666' }}>{error}</p>
          <button onClick={fetchDashboard} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100%', 
      display: 'grid', 
      gridTemplateRows: '56px 1fr', 
      background: 'transparent', 
      color: 'var(--text-main)', 
      overflow: 'hidden' 
    }}>
      {/* Mobile Navigation */}
      <MobileNavigation 
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentView={currentView}
        onNavigate={setCurrentView}
      />

      {/* Offline Indicator */}
      <OfflineIndicator 
        accessToken={accessToken}
        onSync={fetchDashboard}
      />

      {/* Install Prompt */}
      <InstallPrompt />

      {/* Header */}
      <header className="glass-header employee-portal-header" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 16px' 
      }}>
        <div style={{ 
          fontWeight: 600, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          fontFamily: "'Zalando Sans Expanded', sans-serif", 
          fontSize: isMobile ? '18px' : '24px'
        }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <button 
              onClick={() => setMobileNavOpen(true)}
              className="btn-icon"
              style={{
                minHeight: '44px',
                minWidth: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          )}
          <img src="/BLOOM_AUDIT_LOGO_XS.png" alt="BloomTech Logo" style={{ 
            height: isMobile ? 36 : 48, 
            width: 'auto', 
            objectFit: 'contain' 
          }} />
          {!isMobile && <span>Employee Portal</span>}
        </div>
        <div className="employee-portal-header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Notification Bell */}
          <button
            onClick={() => setCurrentView('notifications')}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px'
            }}
            title="Notifications"
          >
            <Bell size={22} />
            {unreadNotifications > 0 && (
              <span style={{
                position: 'absolute',
                top: 4,
                right: 4,
                backgroundColor: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                minWidth: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                padding: '0 4px'
              }}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
          
          <span className="employee-greeting" style={{ display: isMobile ? 'none' : 'inline' }}>
            👋 {dashboardData?.employee.firstName || user.name}
          </span>
          <button onClick={onLogout} className="btn-primary" style={{ 
            padding: isMobile ? '8px 16px' : '8px 12px',
            minHeight: '44px'
          }}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        height: 'calc(100vh - 56px)', 
        display: 'flex', 
        overflow: 'hidden' 
      }}>
        {/* Sidebar Navigation - Hidden on mobile */}
        {!isMobile && (
          <aside className="glass-sidebar" style={{ 
            width: navOpen ? 240 : 64, 
            transition: 'width 0.2s ease', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 4, 
            padding: 12 
          }}>
          <button 
            onClick={() => setCurrentView('dashboard')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: navOpen ? 'flex-start' : 'center', 
              gap: navOpen ? 12 : 0, 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--primary)', 
              background: currentView === 'dashboard' ? 'var(--accent)' : 'transparent', 
              color: '#fff', 
              cursor: 'pointer',
              opacity: currentView === 'dashboard' ? 1 : 0.7
            }}
          >
            <LayoutDashboard size={20} />
            {navOpen && <span>Dashboard</span>}
          </button>

          <button 
            onClick={() => setCurrentView('profile')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: navOpen ? 'flex-start' : 'center', 
              gap: navOpen ? 12 : 0, 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--primary)', 
              background: currentView === 'profile' ? 'var(--accent)' : 'transparent', 
              color: '#fff', 
              cursor: 'pointer',
              opacity: currentView === 'profile' ? 1 : 0.7
            }}
            title="Phase 3: View your profile"
          >
            <User size={20} />
            {navOpen && <span>My Profile</span>}
          </button>

          <button 
            onClick={() => setCurrentView('timeoff')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: navOpen ? 'flex-start' : 'center', 
              gap: navOpen ? 12 : 0, 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--primary)', 
              background: currentView === 'timeoff' ? 'var(--accent)' : 'transparent', 
              color: '#fff', 
              cursor: 'pointer',
              opacity: currentView === 'timeoff' ? 1 : 0.7
            }}
            title="Phase 4: View your PTO requests"
          >
            <Calendar size={20} />
            {navOpen && <span>Time Off</span>}
          </button>

          <button 
            onClick={() => setCurrentView('timetracker')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: navOpen ? 'flex-start' : 'center', 
              gap: navOpen ? 12 : 0, 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--primary)', 
              background: currentView === 'timetracker' ? 'var(--accent)' : 'transparent', 
              color: '#fff', 
              cursor: 'pointer',
              opacity: currentView === 'timetracker' ? 1 : 0.7
            }}
            title="Phase 7: Track your work hours"
          >
            <Clock size={20} />
            {navOpen && <span>Time Tracker</span>}
          </button>

          <button 
            onClick={() => setCurrentView('payroll')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: navOpen ? 'flex-start' : 'center', 
              gap: navOpen ? 12 : 0, 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--primary)', 
              background: currentView === 'payroll' ? 'var(--accent)' : 'transparent', 
              color: '#fff', 
              cursor: 'pointer',
              opacity: currentView === 'payroll' ? 1 : 0.7
            }}
            title="Phase 9 & 10: View payslips and YTD earnings"
          >
            <DollarSign size={20} />
            {navOpen && <span>Payroll</span>}
          </button>

          <button 
            onClick={() => setCurrentView('documents')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: navOpen ? 'flex-start' : 'center', 
              gap: navOpen ? 12 : 0, 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--primary)', 
              background: currentView === 'documents' ? 'var(--accent)' : 'transparent', 
              color: '#fff', 
              cursor: 'pointer',
              opacity: currentView === 'documents' ? 1 : 0.7
            }}
            title="Phase 16: Document bank access"
          >
            <FileText size={20} />
            {navOpen && <span>Documents</span>}
          </button>

          <button 
            onClick={() => setCurrentView('directory')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: navOpen ? 'flex-start' : 'center', 
              gap: navOpen ? 12 : 0, 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--primary)', 
              background: currentView === 'directory' ? 'var(--accent)' : 'transparent', 
              color: '#fff', 
              cursor: 'pointer',
              opacity: currentView === 'directory' ? 1 : 0.7
            }}
            title="Phase 24: Company directory"
          >
            <Users size={20} />
            {navOpen && <span>Directory</span>}
          </button>

          <button 
            onClick={() => setCurrentView('settings')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: navOpen ? 'flex-start' : 'center', 
              gap: navOpen ? 12 : 0, 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--primary)', 
              background: currentView === 'settings' ? 'var(--accent)' : 'transparent', 
              color: '#fff', 
              cursor: 'pointer',
              opacity: currentView === 'settings' ? 1 : 0.7
            }}
            title="Phase 19: Email preferences and settings"
          >
            <Settings size={20} />
            {navOpen && <span>Settings</span>}
          </button>

          {/* Collapse Button */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
            <button 
              onClick={() => setNavOpen(o => !o)} 
              title={navOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: navOpen ? 'flex-start' : 'center', 
                gap: navOpen ? 12 : 0, 
                padding: '10px 12px', 
                borderRadius: 8, 
                border: 'none', 
                background: 'transparent', 
                color: '#fff', 
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {navOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              {navOpen && <span>Collapse</span>}
            </button>
          </div>
        </aside>
        )}

        {/* Main Content Area */}
        <section className="employee-portal-content" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          background: 'transparent', 
          padding: isMobile ? 12 : 24 
        }}>
          {/* Render different views based on currentView */}
          {currentView === 'dashboard' && dashboardData && (
            <div className="employee-dashboard" style={{ maxWidth: 1400, margin: '0 auto' }}>
              <h1 className="dashboard-title" style={{ 
                marginTop: 0, 
                fontSize: isMobile ? 22 : 28, 
                marginBottom: 8 
              }}>
                Welcome back, {dashboardData.employee.firstName}! 👋
              </h1>
              <p className="dashboard-subtitle" style={{ 
                margin: '0 0 24px', 
                color: '#6b7280', 
                fontSize: isMobile ? 14 : 15 
              }}>
                {dashboardData.employee.position} • {dashboardData.employee.department}
              </p>

              {/* Stats Cards - Enhanced with Navigation */}
              <EmployeeStatsCard 
                stats={dashboardData.stats} 
                onNavigate={(view) => {
                  if (view === 'timeoff') setCurrentView('timeoff')
                  // timetracker and notifications will be implemented in future phases
                }}
              />

              {/* Main Grid Layout */}
              <div className="dashboard-main-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr auto', 
                gap: isMobile ? 16 : 24, 
                alignItems: 'start' 
              }}>
                {/* Left Column - PTO Balance, Notes, To-Do's, and Announcements */}
                <div className="dashboard-left-column" style={{ display: 'grid', gap: isMobile ? 16 : 24 }}>
                  {/* PTO Balance Card - Phase 5 */}
                  <PTOBalanceCard 
                    employeeId={dashboardData.employee.id}
                    accessToken={accessToken}
                    onViewHistory={() => setCurrentView('timeoff')}
                  />

                  <div className="widgets-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                    gap: isMobile ? 16 : 24 
                  }}>
                    <NotesWidget userId={user.id} accessToken={accessToken} />
                    <TodosWidget userId={user.id} accessToken={accessToken} />
                  </div>

                  {/* Announcements */}
                  <AnnouncementsFeed announcements={dashboardData.announcements} />

                  {/* Upcoming Deadlines */}
                  <UpcomingDeadlines 
                    pendingPtoRequests={dashboardData.stats.pendingPtoRequests}
                    pendingTimeEntries={dashboardData.stats.pendingTimeEntries}
                  />
                </div>

                {/* Right Column - Clocks and Calendar (Hidden on mobile, moved to top) */}
                {!isMobile && (
                  <div className="dashboard-right-column" style={{ 
                    minWidth: 320, 
                    maxWidth: 400, 
                    position: 'sticky', 
                    top: 24, 
                    display: 'grid', 
                    gap: 16 
                  }}>
                    <SystemClock />
                    <InternationalClock timezone={internationalTimezone} />
                    <CalendarWidget />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile View - Phase 3 */}
          {currentView === 'profile' && dashboardData && (
            <EmployeeProfile employeeId={dashboardData.employee.id} accessToken={accessToken} />
          )}

          {/* Time Off View - Phase 4 */}
          {currentView === 'timeoff' && dashboardData && (
            <EmployeeTimeOff employeeId={dashboardData.employee.id} accessToken={accessToken} />
          )}

          {/* Time Tracker View - Phase 7 & 8 */}
          {currentView === 'timetracker' && dashboardData && (
            <EmployeeTimeTracker employeeId={dashboardData.employee.id} accessToken={accessToken} />
          )}

          {/* Payroll View - Phase 9 & 10 */}
          {currentView === 'payroll' && dashboardData && (
            <EmployeePayroll employeeId={dashboardData.employee.id} accessToken={accessToken} />
          )}

          {/* Documents View - Phase 16 */}
          {currentView === 'documents' && dashboardData && (
            <EmployeeDocuments employeeId={dashboardData.employee.id} accessToken={accessToken} />
          )}

          {/* Directory View - Phase 24 */}
          {currentView === 'directory' && (
            <EmployeeDirectory accessToken={accessToken} />
          )}

          {/* Notifications View - Phase 18 */}
          {currentView === 'notifications' && dashboardData && (
            <EmployeeNotifications employeeId={dashboardData.employee.id} accessToken={accessToken} />
          )}

          {/* Settings View - Phase 19 */}
          {currentView === 'settings' && dashboardData && (
            <EmployeeSettings employeeId={dashboardData.employee.id} accessToken={accessToken} />
          )}
        </section>
      </main>
    </div>
  )
}
