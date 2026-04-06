import { useState, useEffect, useCallback } from 'react'
import { Clock, ListChecks, BarChart3, Calendar, FileText } from 'lucide-react'
import { timeEntriesApi } from '../services/timeEntriesApi'
import { projectsApi } from '../services/projectsApi'
import type { ActiveTimer } from '../types/timeEntries'
import type { Project } from '../types/projects'
import TimerTab from '../components/timeTracking/TimerTab'
import ManualEntryTab from '../components/timeTracking/ManualEntryTab'
import MyEntriesTab from '../components/timeTracking/MyEntriesTab'
import ManagerApprovalTab from '../components/timeTracking/ManagerApprovalTab'
import SummaryTab from '../components/timeTracking/SummaryTab'
import { useToast } from '../context/ToastContext'

export type ProjectTimeTabType = 'timer' | 'manual' | 'entries' | 'approval' | 'summary'

export default function ProjectTime({
  userId,
  isManager,
  activeTab,
  setActiveTab,
}: {
  userId: number
  isManager?: boolean
  activeTab: ProjectTimeTabType
  setActiveTab: (tab: ProjectTimeTabType) => void
}) {
  const { toast } = useToast()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') toast.success(message)
    else toast.error(message)
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
    <div style={{ padding: '0.75rem 1.5rem', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <Clock size={520} strokeWidth={0.6} style={{ position: 'absolute', right: -120, top: -100, opacity: 0.07, color: '#3b82f6', transform: 'rotate(-12deg)' }} />
        <Calendar size={380} strokeWidth={0.6} style={{ position: 'absolute', left: -80, bottom: -60, opacity: 0.06, color: '#6366f1', transform: 'rotate(10deg)' }} />
        <ListChecks size={320} strokeWidth={0.6} style={{ position: 'absolute', left: '42%', top: '22%', opacity: 0.05, color: '#3b82f6', transform: 'translateX(-50%) rotate(-5deg)' }} />
        <BarChart3 size={240} strokeWidth={0.6} style={{ position: 'absolute', left: '3%', top: '6%', opacity: 0.06, color: '#818cf8', transform: 'rotate(-8deg)' }} />
        <Clock size={260} strokeWidth={0.6} style={{ position: 'absolute', right: '4%', top: '35%', opacity: 0.05, color: '#6366f1', transform: 'rotate(-10deg)' }} />
        <Calendar size={240} strokeWidth={0.6} style={{ position: 'absolute', right: '6%', bottom: '8%', opacity: 0.06, color: '#3b82f6', transform: 'rotate(7deg)' }} />
        <FileText size={200} strokeWidth={0.6} style={{ position: 'absolute', left: '22%', bottom: '12%', opacity: 0.05, color: '#818cf8', transform: 'rotate(-15deg)' }} />
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
