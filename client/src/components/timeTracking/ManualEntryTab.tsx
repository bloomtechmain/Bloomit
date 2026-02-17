import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { timeEntriesApi } from '../../services/timeEntriesApi'
import { contractsApi } from '../../services/projectsApi'
import type { Project, Contract } from '../../types/projects'

type ManualEntryTabProps = {
  userId: number
  projects: Project[]
  onSuccess: () => void
  showNotification: (message: string, type: 'success' | 'error') => void
}

export default function ManualEntryTab({
  userId,
  projects,
  onSuccess,
  showNotification
}: ManualEntryTabProps) {
  const [selectedProject, setSelectedProject] = useState<number | ''>('')
  const [selectedContract, setSelectedContract] = useState<number | ''>('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [totalHours, setTotalHours] = useState('')
  const [breakMinutes, setBreakMinutes] = useState('0')
  const [description, setDescription] = useState('')
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async () => {
    if (!selectedProject || !totalHours || !date) {
      showNotification('Please fill in all required fields', 'error')
      return
    }

    const hours = parseFloat(totalHours)
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      showNotification('Please enter valid hours (0-24)', 'error')
      return
    }

    const breaks = parseInt(breakMinutes)
    if (isNaN(breaks) || breaks < 0) {
      showNotification('Please enter valid break minutes', 'error')
      return
    }

    setLoading(true)
    try {
      await timeEntriesApi.create({
        employee_id: userId,
        project_id: Number(selectedProject),
        contract_id: selectedContract ? Number(selectedContract) : null,
        date,
        total_hours: hours,
        break_time_minutes: breaks,
        description: description || undefined
      })
      
      // Reset form
      setSelectedProject('')
      setSelectedContract('')
      setDate(new Date().toISOString().split('T')[0])
      setTotalHours('')
      setBreakMinutes('0')
      setDescription('')
      
      onSuccess()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to create time entry', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel form-container-sm">
      <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Manual Time Entry</h3>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Enter hours worked for tasks not tracked with the timer
      </p>

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

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hours Worked *</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
              placeholder="e.g., 8 or 7.5"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Break Time (minutes)</label>
          <input
            type="number"
            min="0"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What did you work on?"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !selectedProject || !totalHours || !date}
          style={{
            padding: '1rem',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: (selectedProject && totalHours && date) ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '1rem',
            marginTop: '0.5rem'
          }}
        >
          <Save size={20} />
          {loading ? 'Submitting...' : 'Submit Time Entry'}
        </button>
      </div>
    </div>
  )
}
