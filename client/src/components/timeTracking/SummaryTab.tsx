import { useState, useEffect } from 'react'
import { Calendar, FolderOpen, Filter, Clock, ListChecks, TrendingUp, Coffee, Users, BarChart3 } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { timeEntriesApi } from '../../services/timeEntriesApi'
import type { TimeSummary } from '../../types/timeEntries'
import type { Project } from '../../types/projects'

type SummaryTabProps = {
  userId: number
  projects: Project[]
  isManager?: boolean
}

export default function SummaryTab({ userId, projects, isManager }: SummaryTabProps) {
  const [summary, setSummary] = useState<TimeSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (!isManager) params.employee_id = userId
      if (filterProject) params.project_id = filterProject
      if (startDate) params.start_date = startDate.toISOString().split('T')[0]
      if (endDate) params.end_date = endDate.toISOString().split('T')[0]

      const response = await timeEntriesApi.getSummary(params)
      setSummary(response.data)
    } catch (error) {
      console.error('Error fetching summary:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [filterProject, startDate, endDate])

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: '1.5rem', justifyContent: 'space-between' }}>
        {/* Left: Filters label + Project */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="filter-group">
            <Filter size={14} color="var(--text-muted)" />
            <span className="filter-group-label">Filters</span>
          </div>

          <div className="filter-divider" />

          <div className="filter-group">
            <FolderOpen size={13} color="var(--text-muted)" />
            <span className="filter-group-label">Project</span>
            <select
              className="filter-select"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Date range + Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="filter-group">
            <Calendar size={13} color="var(--text-muted)" />
            <span className="filter-group-label">From</span>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="Start date"
              dateFormat="dd MMM yyyy"
              className="summary-datepicker"
              calendarClassName="summary-calendar"
              isClearable={false}
              popperProps={{ strategy: 'fixed' }}
              popperPlacement="bottom-start"
            />
          </div>

          <div className="filter-group">
            <Calendar size={13} color="var(--text-muted)" />
            <span className="filter-group-label">To</span>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate ?? undefined}
              placeholderText="End date"
              dateFormat="dd MMM yyyy"
              className="summary-datepicker"
              calendarClassName="summary-calendar"
              isClearable={false}
              popperProps={{ strategy: 'fixed' }}
              popperPlacement="bottom-start"
            />
          </div>

          {(filterProject || startDate || endDate) && (
            <>
              <div className="filter-divider" />
              <button
                onClick={() => { setFilterProject(''); setStartDate(null); setEndDate(null) }}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1.5px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading summary...</div>
      ) : !summary ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No data available</div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>

          {/* Overall Stat Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { icon: <Clock size={22} color="#fff" />,      watermark: <Clock size={110} color="#fff" strokeWidth={0.8} />,      value: parseFloat(summary.overall.total_hours).toFixed(2) + 'h', label: 'Total Hours',  gradient: 'linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #60a5fa 100%)', shadow: 'rgba(37,99,235,0.5)' },
              { icon: <ListChecks size={22} color="#fff" />, watermark: <ListChecks size={110} color="#fff" strokeWidth={0.8} />, value: String(summary.overall.total_entries),             label: 'Total Entries', gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 55%, #fbbf24 100%)', shadow: 'rgba(217,119,6,0.5)'  },
              { icon: <TrendingUp size={22} color="#fff" />, watermark: <TrendingUp size={110} color="#fff" strokeWidth={0.8} />, value: parseFloat(summary.overall.avg_hours_per_entry).toFixed(1) + 'h', label: 'Avg / Entry', gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 55%, #34d399 100%)', shadow: 'rgba(5,150,105,0.5)'  },
              { icon: <Coffee size={22} color="#fff" />,     watermark: <Coffee size={110} color="#fff" strokeWidth={0.8} />,     value: summary.overall.total_break_minutes + 'm',         label: 'Total Break',   gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 55%, #a78bfa 100%)', shadow: 'rgba(124,58,237,0.5)' },
            ].map(({ icon, watermark, value, label, gradient, shadow }) => (
              <div key={label} style={{ borderRadius: 18, position: 'relative', overflow: 'hidden', background: gradient,
                boxShadow: `0 10px 32px ${shadow}, 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)`,
                transform: 'translateZ(0)',
                transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 18px 40px ${shadow}, 0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateZ(0)'; e.currentTarget.style.boxShadow = `0 10px 32px ${shadow}, 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)` }}
              >
                {/* Top gloss shine */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)', borderRadius: '18px 18px 0 0', pointerEvents: 'none' }} />
                {/* Watermark icon */}
                <div style={{ position: 'absolute', right: -18, bottom: -18, opacity: 0.12, pointerEvents: 'none', transform: 'rotate(-12deg)' }}>
                  {watermark}
                </div>
                {/* Decorative circle */}
                <div style={{ position: 'absolute', top: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                {/* Content */}
                <div style={{ position: 'relative', zIndex: 1, padding: '1.3rem 1.5rem', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.5px', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>{value}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hours by Project */}
          {summary.byProject.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(6,48,98,0.08)', boxShadow: '0 2px 12px rgba(6,48,98,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(6,48,98,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 size={16} color="#2563eb" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.1px' }}>Hours by Project</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{summary.byProject.length} projects</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'grid', gap: 10 }}>
                {summary.byProject.map((project, idx) => {
                  const hours = parseFloat(project.total_hours)
                  const maxHours = Math.max(...summary.byProject.map(p => parseFloat(p.total_hours)))
                  const percentage = maxHours > 0 ? (hours / maxHours) * 100 : 0
                  const colors = ['#2563eb','#059669','#7c3aed','#d97706','#dc2626']
                  const color = colors[idx % colors.length]
                  return (
                    <div key={idx} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid rgba(6,48,98,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>{project.project_name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>{hours.toFixed(2)}h</span>
                          <span style={{ fontSize: 11.5, color: '#94a3b8', background: 'rgba(6,48,98,0.05)', padding: '2px 8px', borderRadius: 999 }}>{project.entry_count} entries</span>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 4, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hours by Employee */}
          {isManager && summary.byEmployee.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(6,48,98,0.08)', boxShadow: '0 2px 12px rgba(6,48,98,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(6,48,98,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(5,150,105,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} color="#059669" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.1px' }}>Hours by Employee</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{summary.byEmployee.length} employees</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {summary.byEmployee.map((emp, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderBottom: idx < summary.byEmployee.length - 1 ? '1px solid rgba(6,48,98,0.05)' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #1e40af, #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {emp.employee_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>{emp.employee_name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{emp.entry_count} entries · {emp.total_break_minutes}m break</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb' }}>{parseFloat(emp.total_hours).toFixed(2)}h</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
