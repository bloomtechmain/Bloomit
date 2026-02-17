import { useState, useEffect, useCallback } from 'react'
import { Clock, ListChecks, UserCheck, BarChart3 } from 'lucide-react'
import { timeEntriesApi } from '../services/timeEntriesApi'
import { projectsApi } from '../services/projectsApi'
import type { ActiveTimer } from '../types/timeEntries'
import type { Project } from '../types/projects'
import TimerTab from '../components/timeTracking/TimerTab'
import ManualEntryTab from '../components/timeTracking/ManualEntryTab'
import MyEntriesTab from '../components/timeTracking/MyEntriesTab'
import ManagerApprovalTab from '../components/timeTracking/ManagerApprovalTab'
import SummaryTab from '../components/timeTracking/SummaryTab'

type TabType = 'timer' | 'manual' | 'entries' | 'approval' | 'summary'

export default function ProjectTime({ userId, isManager }: { userId: number; isManager?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabType>('timer')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectsApi.getAll()
      setProjects(response.data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }, [])

  // Fetch active timer
  const fetchActiveTimer = useCallback(async () => {
    try {
      const response = await timeEntriesApi.timer.getActive(userId)
      setActiveTimer(response.data.activeTimer)
    } catch (error) {
      console.error('Error fetching active timer:', error)
    }
  }, [userId])

  useEffect(() => {
    fetchProjects()
    fetchActiveTimer()
  }, [fetchProjects, fetchActiveTimer])

  // Poll for active timer updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveTimer()
    }, 10000)

    return () => clearInterval(interval)
  }, [fetchActiveTimer])

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            padding: '1rem 1.5rem',
            backgroundColor: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fecaca'}`,
            borderRadius: '8px',
            color: notification.type === 'success' ? '#166534' : '#991b1b',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
          Project Time Tracking
        </h1>
        <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
          Track your work hours with timer or manual entry
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('timer')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'timer' ? '#3b82f6' : 'transparent',
            color: activeTab === 'timer' ? '#fff' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'timer' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <Clock size={18} />
          Live Timer
        </button>
        
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'manual' ? '#3b82f6' : 'transparent',
            color: activeTab === 'manual' ? '#fff' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'manual' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <ListChecks size={18} />
          Manual Entry
        </button>
        
        <button
          onClick={() => setActiveTab('entries')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'entries' ? '#3b82f6' : 'transparent',
            color: activeTab === 'entries' ? '#fff' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'entries' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <ListChecks size={18} />
          My Time Entries
        </button>

        {isManager && (
          <button
            onClick={() => setActiveTab('approval')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'approval' ? '#3b82f6' : 'transparent',
              color: activeTab === 'approval' ? '#fff' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'approval' ? '3px solid #3b82f6' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <UserCheck size={18} />
            Approval
          </button>
        )}

        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'summary' ? '#3b82f6' : 'transparent',
            color: activeTab === 'summary' ? '#fff' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'summary' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <BarChart3 size={18} />
          Summary
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'timer' && (
          <TimerTab
            userId={userId}
            projects={projects}
            activeTimer={activeTimer}
            onRefresh={refreshData}
            onTimerUpdate={fetchActiveTimer}
            showNotification={showNotification}
          />
        )}
        
        {activeTab === 'manual' && (
          <ManualEntryTab
            userId={userId}
            projects={projects}
            onSuccess={() => {
              showNotification('Time entry created successfully', 'success')
              refreshData()
            }}
            showNotification={showNotification}
          />
        )}
        
        {activeTab === 'entries' && (
          <MyEntriesTab
            userId={userId}
            projects={projects}
            refreshTrigger={refreshTrigger}
            showNotification={showNotification}
          />
        )}
        
        {activeTab === 'approval' && isManager && (
          <ManagerApprovalTab
            userId={userId}
            refreshTrigger={refreshTrigger}
            onSuccess={() => {
              showNotification('Time entry processed successfully', 'success')
              refreshData()
            }}
            showNotification={showNotification}
          />
        )}
        
        {activeTab === 'summary' && (
          <SummaryTab
            userId={userId}
            projects={projects}
            isManager={isManager}
          />
        )}
      </div>
    </div>
  )
}
