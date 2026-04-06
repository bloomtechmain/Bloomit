import { useState, useEffect } from 'react'
import { Edit2, Trash2, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Save, X } from 'lucide-react'
import { timeEntriesApi } from '../../services/timeEntriesApi'
import type { TimeEntry } from '../../types/timeEntries'
import type { Project } from '../../types/projects'

type MyEntriesTabProps = {
  userId: number
  projects: Project[]
  refreshTrigger: number
  showNotification: (message: string, type: 'success' | 'error') => void
}

const STATUS_CFG = {
  pending:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Pending',  Icon: AlertCircle },
  approved: { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: 'Approved', Icon: CheckCircle },
  rejected: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Rejected', Icon: XCircle },
} as const

// Safely parse numeric fields that PostgreSQL may return as strings
const toNum = (v: unknown) => parseFloat(String(v ?? 0)) || 0

function fmtDate(dateStr: string) {
  // Add noon time to avoid UTC-midnight timezone shifts
  const d = new Date(dateStr.split('T')[0] + 'T12:00:00')
  return {
    day:   d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    year:  d.getFullYear(),
  }
}

export default function MyEntriesTab({ userId, projects, refreshTrigger, showNotification }: MyEntriesTabProps) {
  const [entries,         setEntries]         = useState<TimeEntry[]>([])
  const [loading,         setLoading]         = useState(false)
  const [filterProject,   setFilterProject]   = useState<number | ''>('')
  const [filterStatus,    setFilterStatus]    = useState<string>('all')
  const [editingEntry,    setEditingEntry]    = useState<TimeEntry | null>(null)
  const [editHours,       setEditHours]       = useState('')
  const [editBreak,       setEditBreak]       = useState('')
  const [editDescription, setEditDescription] = useState('')

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchEntries = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { employee_id: userId }
      if (filterProject)        params.project_id = filterProject
      if (filterStatus !== 'all') params.status   = filterStatus
      const response = await timeEntriesApi.getMyEntries(params as Parameters<typeof timeEntriesApi.getMyEntries>[0])
      setEntries(response.data.timeEntries || [])
    } catch (err) {
      console.error('Error fetching entries:', err)
      showNotification('Failed to load time entries', 'error')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEntries() }, [refreshTrigger, filterProject, filterStatus, userId])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setEditHours(String(entry.total_hours ?? ''))
    setEditBreak(String(entry.break_time_minutes ?? '0'))
    setEditDescription(entry.description || '')
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return
    try {
      await timeEntriesApi.update(editingEntry.id, {
        total_hours:        parseFloat(editHours),
        break_time_minutes: parseInt(editBreak),
        description:        editDescription || undefined,
      })
      setEditingEntry(null)
      showNotification('Time entry updated', 'success')
      fetchEntries()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      showNotification(msg || 'Failed to update entry', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this time entry?')) return
    try {
      await timeEntriesApi.delete(id)
      showNotification('Entry deleted', 'success')
      fetchEntries()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      showNotification(msg || 'Failed to delete entry', 'error')
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalHours    = entries.reduce((s, e) => s + toNum(e.total_hours), 0)
  const pendingCount  = entries.filter(e => e.status === 'pending').length
  const approvedCount = entries.filter(e => e.status === 'approved').length
  const rejectedCount = entries.filter(e => e.status === 'rejected').length

  // ── Shared input/label styles (edit modal) ────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: '0.875rem',
    border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
  }

  // ── Dark-panel select style (left panel) ─────────────────────────────────
  const darkSelectStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 7,
    color: '#f0f6ff', padding: '7px 10px', fontSize: '0.8rem',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem', alignItems: 'start' }}>

        {/* ── LEFT: Stats + Filters ── */}
        <div style={{
          background: 'linear-gradient(160deg, #080f1e 0%, #0d1e38 55%, #0f2347 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 'var(--card-radius)',
          padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          {/* Title */}
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f6ff' }}>My Entries</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} found
            </div>
          </div>

          {/* Total hours tile */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
              Total Hours
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
                {totalHours.toFixed(1)}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>hrs</span>
            </div>
          </div>

          {/* Status breakdown — clickable to filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([
              { key: 'pending',  label: 'Pending',  count: pendingCount,  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
              { key: 'approved', label: 'Approved', count: approvedCount, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
              { key: 'rejected', label: 'Rejected', count: rejectedCount, color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
            ] as const).map(({ key, label, count, color, bg }) => (
              <button key={key}
                onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 10px', borderRadius: 8, background: filterStatus === key ? bg : 'transparent',
                  border: `1px solid ${filterStatus === key ? color + '44' : 'rgba(255,255,255,0.06)'}`,
                  cursor: 'pointer', transition: 'all 0.15s', width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{label}</span>
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color }}>{count}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Filters
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', marginBottom: 4 }}>Project</div>
              <select value={filterProject}
                onChange={e => setFilterProject(e.target.value ? Number(e.target.value) : '')}
                style={darkSelectStyle} className="timer-panel-input">
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', marginBottom: 4 }}>Status</div>
              <select value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={darkSelectStyle} className="timer-panel-input">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {(filterProject !== '' || filterStatus !== 'all') && (
              <button onClick={() => { setFilterProject(''); setFilterStatus('all') }}
                style={{
                  padding: '7px 10px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)',
                  color: '#fca5a5', cursor: 'pointer', transition: 'opacity 0.15s',
                }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Entry list ── */}
        <div style={{
          background: '#fff', borderRadius: 'var(--card-radius)',
          border: '1px solid rgba(6,48,98,0.08)', boxShadow: '0 2px 12px rgba(6,48,98,0.06)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 195px)', overflow: 'hidden',
        }}>
          {/* List header */}
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid rgba(6,48,98,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#f8fafc', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Clock size={14} color="#2563eb" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Time Entries</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
              {totalHours.toFixed(2)} hrs total
            </span>
          </div>

          {/* Scrollable rows */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Loading entries…
              </div>
            ) : entries.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <TrendingUp size={36} color="#e2e8f0" style={{ margin: '0 auto 12px', display: 'block' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>No entries found</div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  {filterProject || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start tracking time using the Timer or Manual Entry tabs'}
                </div>
              </div>
            ) : entries.map((entry, idx) => {
              const { day, month, year } = fmtDate(entry.date)
              const hours = toNum(entry.total_hours)
              const cfg = STATUS_CFG[entry.status] ?? STATUS_CFG.pending
              const StatusIcon = cfg.Icon
              return (
                <div key={entry.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 18px',
                    borderBottom: idx < entries.length - 1 ? '1px solid rgba(6,48,98,0.05)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Date block */}
                  <div style={{
                    width: 48, flexShrink: 0, textAlign: 'center',
                    background: 'linear-gradient(135deg, #1e40af, #2563eb)',
                    borderRadius: 9, padding: '6px 4px',
                  }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{month}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{day}</div>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{year}</div>
                  </div>

                  {/* Project + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {entry.project_name}
                      {entry.contract_name && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#94a3b8' }}>· {entry.contract_name}</span>
                      )}
                    </div>
                    {entry.description && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.description}
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
                      {entry.is_timer_based ? 'Timer' : 'Manual'}
                      {entry.break_time_minutes > 0 && ` · ${entry.break_time_minutes}m break`}
                    </div>
                  </div>

                  {/* Hours */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>
                      {hours.toFixed(2)}h
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 9px', borderRadius: 99,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    fontSize: '0.7rem', fontWeight: 700, color: cfg.color,
                    minWidth: 80, justifyContent: 'center',
                  }}>
                    <StatusIcon size={11} />
                    {cfg.label}
                  </div>

                  {/* Action buttons */}
                  <div style={{ flexShrink: 0, display: 'flex', gap: 5 }}>
                    {entry.status === 'pending' ? (
                      <>
                        <button onClick={() => handleEdit(entry)} title="Edit" style={{
                          width: 28, height: 28, borderRadius: 7, border: '1.5px solid #dbeafe',
                          background: '#eff6ff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Edit2 size={12} color="#2563eb" />
                        </button>
                        <button onClick={() => handleDelete(entry.id)} title="Delete" style={{
                          width: 28, height: 28, borderRadius: 7, border: '1.5px solid #fecaca',
                          background: '#fef2f2', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Trash2 size={12} color="#ef4444" />
                        </button>
                      </>
                    ) : (
                      <div style={{ width: 61 }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Edit modal ── */}
      {editingEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setEditingEntry(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: 400, maxWidth: '92vw', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Edit Time Entry</div>
              <button onClick={() => setEditingEntry(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={17} color="#94a3b8" />
              </button>
            </div>

            {/* Entry context */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '9px 12px', marginBottom: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{editingEntry.project_name}</span>
              {' · '}{fmtDate(editingEntry.date).month} {fmtDate(editingEntry.date).day}, {fmtDate(editingEntry.date).year}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Hours <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" step="0.5" min="0" max="24" value={editHours}
                    onChange={e => setEditHours(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Break (min)</label>
                  <input type="number" min="0" value={editBreak}
                    onChange={e => setEditBreak(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 68 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                <button onClick={() => setEditingEntry(null)} style={{
                  padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  background: '#f8fafc', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#64748b',
                }}>
                  Cancel
                </button>
                <button onClick={handleSaveEdit} style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                }}>
                  <Save size={13} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
