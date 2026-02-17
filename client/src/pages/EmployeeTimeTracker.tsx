import { useState, useEffect, useCallback } from 'react'
import { Clock, Plus, List, BarChart3 } from 'lucide-react'
import TimerTab from '../components/timeTracking/TimerTab'
import ManualEntryTab from '../components/timeTracking/ManualEntryTab'
import MyEntriesTab from '../components/timeTracking/MyEntriesTab'
import ReportsTab from '../components/timeTracking/ReportsTab'
import { getActiveTimer } from '../services/employeePortalService'
import { projectsApi } from '../services/projectsApi'
import type { Project } from '../types/projects'

interface EmployeeTimeTrackerProps {
  employeeId: number
  accessToken: string
}

type TabType = 'timer' | 'manual' | 'entries' | 'reports'

export default function EmployeeTimeTracker({ employeeId, accessToken }: EmployeeTimeTrackerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('timer')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTimer, setActiveTimer] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsApi.getAll()
        setProjects(response.data.projects || [])
      } catch (error) {
        console.error('Error fetching projects:', error)
      }
    }
    fetchProjects()
  }, [])

  // Fetch active timer
  const fetchActiveTimer = useCallback(async () => {
    try {
      const timer = await getActiveTimer(employeeId, accessToken)
      setActiveTimer(timer)
    } catch (error) {
      console.error('Error fetching active timer:', error)
    }
  }, [employeeId, accessToken])

  // Initial fetch and polling
  useEffect(() => {
    fetchActiveTimer()
    
    // Poll every 10 seconds when on timer tab
    if (activeTab === 'timer') {
      const interval = setInterval(fetchActiveTimer, 10000)
      return () => clearInterval(interval)
    }
  }, [fetchActiveTimer, activeTab])

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
    fetchActiveTimer()
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '12px 24px',
          borderRadius: 8,
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          fontWeight: 600,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease'
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginTop: 0, fontSize: 28, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={32} />
          Time Tracker
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          Track your work hours with timer or manual entry. 
          {activeTimer && (
            <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 600 }}>
              ⏱️ Timer Active
            </span>
          )}
        </p>
      </div>

      {/* Info Banner - Read Only */}
      <div className="glass-panel" style={{ 
        padding: 16, 
        marginBottom: 24, 
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24 }}>ℹ️</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Important Note</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              Once submitted, time entries cannot be edited or deleted. If you need to make corrections, 
              please contact your manager to reject the entry, then submit a corrected one.
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={() => setActiveTab('timer')}
            style={{
              padding: '16px 24px',
              background: activeTab === 'timer' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'timer' ? '#fff' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'timer' ? '3px solid #3b82f6' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'timer' ? 600 : 400,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <Clock size={18} />
            Timer
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '16px 24px',
              background: activeTab === 'manual' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'manual' ? '#fff' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'manual' ? '3px solid #3b82f6' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'manual' ? 600 : 400,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} />
            Manual Entry
          </button>

          <button
            onClick={() => setActiveTab('entries')}
            style={{
              padding: '16px 24px',
              background: activeTab === 'entries' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'entries' ? '#fff' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'entries' ? '3px solid #3b82f6' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'entries' ? 600 : 400,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <List size={18} />
            My Entries
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            style={{
              padding: '16px 24px',
              background: activeTab === 'reports' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'reports' ? '#fff' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'reports' ? '3px solid #3b82f6' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'reports' ? 600 : 400,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={18} />
            Reports
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: 24 }}>
          {activeTab === 'timer' && (
            <TimerTab
              userId={employeeId}
              projects={projects}
              activeTimer={activeTimer}
              onRefresh={handleRefresh}
              onTimerUpdate={fetchActiveTimer}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'manual' && (
            <ManualEntryTab
              userId={employeeId}
              projects={projects}
              onSuccess={handleRefresh}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'entries' && (
            <MyEntriesTab
              userId={employeeId}
              projects={projects}
              refreshTrigger={refreshTrigger}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              employeeId={employeeId}
              accessToken={accessToken}
            />
          )}
        </div>
      </div>
    </div>
  )
}
