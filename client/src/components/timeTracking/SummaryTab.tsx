import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (!isManager) params.employee_id = userId
      if (filterProject) params.project_id = filterProject
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

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
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} />
          Filter Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Project
            </label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value ? Number(e.target.value) : '')}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading summary...</div>
      ) : !summary ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>No data available</div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Overall Stats */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Overall Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#eff6ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#3b82f6', fontFamily: 'monospace' }}>
                  {parseFloat(summary.overall.total_hours).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>Total Hours</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f59e0b', fontFamily: 'monospace' }}>
                  {summary.overall.total_entries}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>Total Entries</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#dcfce7', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981', fontFamily: 'monospace' }}>
                  {parseFloat(summary.overall.avg_hours_per_entry).toFixed(1)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>Avg Hours/Entry</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#fce7f3', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ec4899', fontFamily: 'monospace' }}>
                  {summary.overall.total_break_minutes}m
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>Total Break Time</div>
              </div>
            </div>
          </div>

          {/* By Project */}
          {summary.byProject.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Hours by Project</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {summary.byProject.map((project, idx) => {
                  const hours = parseFloat(project.total_hours)
                  const maxHours = Math.max(...summary.byProject.map(p => parseFloat(p.total_hours)))
                  const percentage = maxHours > 0 ? (hours / maxHours) * 100 : 0
                  
                  return (
                    <div key={idx} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: '600' }}>{project.project_name}</div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          <span><strong>{hours.toFixed(2)}h</strong></span>
                          <span>{project.entry_count} entries</span>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* By Employee (Manager Only) */}
          {isManager && summary.byEmployee.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Hours by Employee</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Employee</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Total Hours</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Break Time</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byEmployee.map((emp, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>{emp.employee_name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>
                          {parseFloat(emp.total_hours).toFixed(2)}h
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {emp.total_break_minutes}m
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {emp.entry_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
