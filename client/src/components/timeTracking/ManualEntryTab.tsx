import { useState, useEffect } from 'react'
import { Save, CalendarDays, Clock, FileText, Info } from 'lucide-react'
import { timeEntriesApi } from '../../services/timeEntriesApi'
import { contractsApi } from '../../services/projectsApi'
import type { Project, Contract } from '../../types/projects'
import { useToast } from '../../context/ToastContext'

type ManualEntryTabProps = {
  userId: number
  projects: Project[]
  onSuccess: () => void
  showNotification?: (message: string, type: 'success' | 'error') => void
}

// ── Decorative calendar display ───────────────────────────────────────────────
function CalendarDisplay() {
  const now = new Date()
  const dayName  = now.toLocaleDateString('en-US', { weekday: 'long' })
  const day      = now.getDate()
  const month    = now.toLocaleDateString('en-US', { month: 'long' })
  const year     = now.getFullYear()

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Calendar card */}
      <div style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, overflow: 'hidden', width: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Month header */}
        <div style={{
          width: '100%', padding: '10px 0', textAlign: 'center',
          background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
          fontSize: '0.8rem', fontWeight: 700, color: '#fff',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {month} {year}
        </div>
        {/* Day number */}
        <div style={{
          padding: '18px 0 10px',
          fontSize: '4.5rem', fontWeight: 800, color: '#f0f6ff',
          lineHeight: 1, letterSpacing: '-2px',
          textShadow: '0 2px 20px rgba(99,102,241,0.5)',
        }}>
          {day}
        </div>
        {/* Day name */}
        <div style={{
          paddingBottom: 16,
          fontSize: '0.85rem', fontWeight: 600,
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em',
        }}>
          {dayName}
        </div>
      </div>
    </div>
  )
}

export default function ManualEntryTab({ userId, projects, onSuccess }: ManualEntryTabProps) {
  const { toast } = useToast()
  const [selectedProject,  setSelectedProject]  = useState<number | ''>('')
  const [selectedContract, setSelectedContract] = useState<number | ''>('')
  const [date,             setDate]             = useState(new Date().toISOString().split('T')[0])
  const [totalHours,       setTotalHours]       = useState('')
  const [breakMinutes,     setBreakMinutes]     = useState('0')
  const [description,      setDescription]      = useState('')
  const [contracts,        setContracts]        = useState<Contract[]>([])
  const [loading,          setLoading]          = useState(false)

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
      toast.error('Please fill in all required fields')
      return
    }
    const hours = parseFloat(totalHours)
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      toast.error('Please enter valid hours (0–24)')
      return
    }
    const breaks = parseInt(breakMinutes)
    if (isNaN(breaks) || breaks < 0) {
      toast.error('Please enter valid break minutes')
      return
    }
    setLoading(true)
    try {
      await timeEntriesApi.create({
        employee_id:       userId,
        project_id:        Number(selectedProject),
        contract_id:       selectedContract ? Number(selectedContract) : null,
        date,
        total_hours:       hours,
        break_time_minutes: breaks,
        description:       description || undefined,
      })
      setSelectedProject('')
      setSelectedContract('')
      setDate(new Date().toISOString().split('T')[0])
      setTotalHours('')
      setBreakMinutes('0')
      setDescription('')
      toast.success('Time entry created successfully')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create time entry')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared styles (match TimerTab) ────────────────────────────────────────
  const leftPanel: React.CSSProperties = {
    background: 'linear-gradient(160deg, #080f1e 0%, #0d1e38 55%, #0f2347 100%)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 'var(--card-radius)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '1.5rem', gap: '1.25rem',
  }

  const rightPanel: React.CSSProperties = {
    background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--card-radius)',
    padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 8,
    color: '#f0f6ff', padding: '9px 12px', fontSize: '0.875rem',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', fontWeight: 700,
    color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 5,
  }

  const canSubmit = !!selectedProject && !!totalHours && !!date

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', alignItems: 'stretch' }}>

      {/* ── LEFT: Visual panel ── */}
      <div style={leftPanel}>

        {/* Calendar */}
        <CalendarDisplay />

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f0f6ff', marginBottom: 4 }}>
            Log Time Manually
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
            Record hours for work not tracked<br />with the live timer
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', maxWidth: 280, height: 1, background: 'rgba(255,255,255,0.07)' }} />

        {/* Quick guide */}
        <div style={{
          width: '100%', maxWidth: 280,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Quick Guide
          </div>
          {[
            { icon: <CalendarDays size={13} color="#60a5fa" />, text: 'Pick the date the work was done' },
            { icon: <Clock size={13} color="#34d399" />,        text: 'Enter total hours including breaks' },
            { icon: <FileText size={13} color="#a78bfa" />,     text: 'Add a description for context' },
            { icon: <Info size={13} color="#fbbf24" />,         text: 'Entry goes to manager for approval' },
          ].map(({ icon, text }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {icon}
              </div>
              <span style={{ fontSize: '0.775rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Form panel ── */}
      <div style={rightPanel}>

        {/* Header */}
        <div style={{ marginBottom: 2 }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f6ff' }}>Manual Time Entry</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
            Fill in the details below and submit for approval
          </div>
        </div>

        {/* Project */}
        <div>
          <label style={labelStyle}>Project <span style={{ color: '#f87171' }}>*</span></label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value ? Number(e.target.value) : '')}
            style={inputStyle}
            className="timer-panel-input"
          >
            <option value="">Select Project</option>
            {projects.map(p => (
              <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
            ))}
          </select>
        </div>

        {/* Contract */}
        <div>
          <label style={labelStyle}>Contract <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(Optional)</span></label>
          <select
            value={selectedContract}
            onChange={e => setSelectedContract(e.target.value ? Number(e.target.value) : '')}
            disabled={!selectedProject}
            style={{ ...inputStyle, opacity: selectedProject ? 1 : 0.45 }}
            className="timer-panel-input"
          >
            <option value="">No Contract</option>
            {contracts.map(c => (
              <option key={c.contract_id} value={c.contract_id}>{c.contract_name}</option>
            ))}
          </select>
        </div>

        {/* Date + Hours — side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Date <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={inputStyle}
              className="timer-panel-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Hours Worked <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="number"
              step="0.5" min="0" max="24"
              value={totalHours}
              onChange={e => setTotalHours(e.target.value)}
              placeholder="e.g. 8 or 7.5"
              style={inputStyle}
              className="timer-panel-input"
            />
          </div>
        </div>

        {/* Break */}
        <div>
          <label style={labelStyle}>Break Time <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(minutes)</span></label>
          <input
            type="number"
            min="0"
            value={breakMinutes}
            onChange={e => setBreakMinutes(e.target.value)}
            placeholder="0"
            style={inputStyle}
            className="timer-panel-input"
          />
        </div>

        {/* Description */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Description <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(Optional)</span></label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="What did you work on?"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
            className="timer-panel-input"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          style={{
            marginTop: 'auto', padding: '0.9rem',
            background: canSubmit
              ? 'linear-gradient(135deg, #2563eb, #4f46e5)'
              : 'rgba(255,255,255,0.1)',
            color: canSubmit ? '#fff' : 'rgba(255,255,255,0.4)',
            border: 'none', borderRadius: 8,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontWeight: 700, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, fontSize: '0.95rem',
            boxShadow: canSubmit ? '0 4px 16px rgba(37,99,235,0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Save size={17} />
          {loading ? 'Submitting…' : 'Submit Time Entry'}
        </button>
      </div>
    </div>
  )
}
