import { useState, useEffect } from 'react'
import { Play, Square, Coffee } from 'lucide-react'
import { timeEntriesApi } from '../../services/timeEntriesApi'
import { contractsApi } from '../../services/projectsApi'
import type { ActiveTimer } from '../../types/timeEntries'
import type { Project, Contract } from '../../types/projects'

type TimerTabProps = {
  userId: number
  projects: Project[]
  activeTimer: ActiveTimer | null
  onRefresh: () => void
  onTimerUpdate: () => void
  showNotification: (message: string, type: 'success' | 'error') => void
}

export default function TimerTab({
  userId,
  projects,
  activeTimer,
  onRefresh,
  onTimerUpdate,
  showNotification
}: TimerTabProps) {
  const [selectedProject, setSelectedProject] = useState<number | ''>('')
  const [selectedContract, setSelectedContract] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Calculate elapsed time
  useEffect(() => {
    if (activeTimer) {
      const startTime = new Date(activeTimer.started_at).getTime()
      const updateTime = () => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        setElapsedTime(elapsed)
      }
      updateTime()
      const interval = setInterval(updateTime, 1000)
      return () => clearInterval(interval)
    }
  }, [activeTimer])

  // Fetch contracts when project selected
  useEffect(() => {
    if (selectedProject) {
      contractsApi.getAll(Number(selectedProject))
        .then(res => setContracts(res.data.contracts || []))
        .catch(err => console.error('Error fetching contracts:', err))
    } else {
      setContracts([])
      setSelectedContract('')
    }
  }, [selectedProject])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleStart = async () => {
    if (!selectedProject) {
      showNotification('Please select a project', 'error')
      return
    }

    setLoading(true)
    try {
      await timeEntriesApi.timer.start({
        employee_id: userId,
        project_id: Number(selectedProject),
        contract_id: selectedContract ? Number(selectedContract) : null,
        description: description || undefined
      })
      showNotification('Timer started successfully', 'success')
      onTimerUpdate()
      onRefresh()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to start timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    setLoading(true)
    try {
      await timeEntriesApi.timer.pause(userId)
      showNotification('Break started', 'success')
      onTimerUpdate()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to pause timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async () => {
    setLoading(true)
    try {
      await timeEntriesApi.timer.resume(userId)
      showNotification('Break ended', 'success')
      onTimerUpdate()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to resume timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await timeEntriesApi.timer.stop({
        employee_id: userId,
        description: description || undefined
      })
      showNotification('Timer stopped and submitted for approval', 'success')
      setSelectedProject('')
      setSelectedContract('')
      setDescription('')
      onTimerUpdate()
      onRefresh()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to stop timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {/* Active Timer Display */}
      {activeTimer ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '4rem', fontWeight: '800', color: '#3b82f6', fontFamily: 'monospace', letterSpacing: '-2px' }}>
              {formatTime(elapsedTime)}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              {activeTimer.is_on_break ? '☕ On Break' : '⏱️ Working'}
            </div>
          </div>

          <div style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Project:</strong> {activeTimer.project_name}
            </div>
            {activeTimer.contract_name && (
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Contract:</strong> {activeTimer.contract_name}
              </div>
            )}
            <div>
              <strong>Break Time:</strong> {activeTimer.total_break_time_minutes} minutes
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!activeTimer.is_on_break ? (
              <button
                onClick={handlePause}
                disabled={loading}
                style={{
                  padding: '1rem 2rem',
                  background: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1rem'
                }}
              >
                <Coffee size={20} />
                Start Break
              </button>
            ) : (
              <button
                onClick={handleResume}
                disabled={loading}
                style={{
                  padding: '1rem 2rem',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1rem'
                }}
              >
                <Play size={20} />
                Resume Work
              </button>
            )}
            
            <button
              onClick={handleStop}
              disabled={loading}
              style={{
                padding: '1rem 2rem',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem'
              }}
            >
              <Square size={20} />
              Stop & Submit
            </button>
          </div>
        </div>
      ) : (
        /* Start Timer Form */
        <div className="glass-panel form-container-sm">
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Start New Timer</h3>
          
          <div className="form-grid-1">
            <div className="form-group">
              <label className="form-label">Project *</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Select Project</option>
                {projects.map(project => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Contract (Optional)</label>
              <select
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value ? Number(e.target.value) : '')}
                disabled={!selectedProject}
              >
                <option value="">No Contract</option>
                {contracts.map(contract => (
                  <option key={contract.contract_id} value={contract.contract_id}>
                    {contract.contract_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Task Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What are you working on?"
              />
            </div>

            <button
              onClick={handleStart}
              disabled={loading || !selectedProject}
              style={{
                padding: '1rem',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: selectedProject ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                marginTop: '0.5rem'
              }}
            >
              <Play size={20} />
              {loading ? 'Starting...' : 'Start Timer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
