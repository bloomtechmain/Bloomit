import { useState, useEffect } from 'react'
import { Calendar, Download, TrendingUp, Clock, Briefcase } from 'lucide-react'
import { getTimeReport } from '../../services/employeePortalService'

interface ReportsTabProps {
  employeeId: number
  accessToken: string
}

interface TimeReport {
  employeeId: number
  reportPeriod: {
    startDate: string | null
    endDate: string | null
  }
  overall: {
    totalEntries: number
    totalHours: number
    avgHoursPerEntry: string
    totalBreakMinutes: number
  }
  pending: {
    count: number
    hours: number
  }
  weekly: Array<{
    weekStart: string
    entryCount: number
    totalHours: number
  }>
  monthly: Array<{
    monthStart: string
    entryCount: number
    totalHours: number
  }>
  byProject: Array<{
    projectId: number
    projectName: string
    entryCount: number
    totalHours: number
    avgHoursPerEntry: string
  }>
  daily: Array<{
    date: string
    entryCount: number
    totalHours: number
  }>
}

export default function ReportsTab({ employeeId, accessToken }: ReportsTabProps) {
  const [report, setReport] = useState<TimeReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month')
  const [startDate] = useState('')
  const [endDate] = useState('')

  // Fetch report
  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: any = {}
      
      if (dateRange === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        filters.start_date = weekAgo.toISOString().split('T')[0]
      } else if (dateRange === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        filters.start_date = monthAgo.toISOString().split('T')[0]
      }
      
      if (startDate) filters.start_date = startDate
      if (endDate) filters.end_date = endDate

      const data = await getTimeReport(employeeId, accessToken, filters)
      setReport(data)
    } catch (err) {
      console.error('Error fetching report:', err)
      setError('Failed to load time report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [employeeId, dateRange])

  // Export to CSV
  const exportToCSV = () => {
    if (!report) return

    const csvRows = []
    
    // Headers
    csvRows.push(['Type', 'Date/Project', 'Entries', 'Hours'].join(','))
    
    // Overall
    csvRows.push(['Overall', 'Total', report.overall.totalEntries, report.overall.totalHours].join(','))
    
    // By Project
    report.byProject.forEach(project => {
      csvRows.push(['Project', project.projectName, project.entryCount, project.totalHours].join(','))
    })
    
    // By Week
    report.weekly.forEach(week => {
      const weekDate = new Date(week.weekStart).toLocaleDateString()
      csvRows.push(['Week', weekDate, week.entryCount, week.totalHours].join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading && !report) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div>Loading report...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>
        <button onClick={fetchReport} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  if (!report) return null

  return (
    <div>
      {/* Header & Filters */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Time Tracking Reports</h2>
          <button 
            onClick={exportToCSV}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Date Range Selector */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setDateRange('week')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--primary)',
              background: dateRange === 'week' ? 'var(--accent)' : 'transparent',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Last Week
          </button>
          <button
            onClick={() => setDateRange('month')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--primary)',
              background: dateRange === 'month' ? 'var(--accent)' : 'transparent',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Last Month
          </button>
          <button
            onClick={() => setDateRange('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--primary)',
              background: dateRange === 'all' ? 'var(--accent)' : 'transparent',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Clock size={24} style={{ color: '#3b82f6' }} />
            <div style={{ fontSize: 14, color: '#9ca3af' }}>Total Hours</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{report.overall.totalHours.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {report.overall.totalEntries} entries
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <TrendingUp size={24} style={{ color: '#10b981' }} />
            <div style={{ fontSize: 14, color: '#9ca3af' }}>Average/Entry</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{report.overall.avgHoursPerEntry}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>hours per entry</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Briefcase size={24} style={{ color: '#f59e0b' }} />
            <div style={{ fontSize: 14, color: '#9ca3af' }}>Projects</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{report.byProject.length}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>worked on</div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Calendar size={24} style={{ color: '#8b5cf6' }} />
            <div style={{ fontSize: 14, color: '#9ca3af' }}>Pending</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{report.pending.hours.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {report.pending.count} entries
          </div>
        </div>
      </div>

      {/* Project Breakdown */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Hours by Project</h3>
        {report.byProject.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>
            No project data available
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {report.byProject.map(project => {
              const maxHours = Math.max(...report.byProject.map(p => p.totalHours))
              const percentage = (project.totalHours / maxHours) * 100

              return (
                <div key={project.projectId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{project.projectName}</div>
                    <div style={{ color: '#9ca3af' }}>
                      {project.totalHours.toFixed(1)}h ({project.entryCount} entries)
                    </div>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: 8, 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Weekly Breakdown */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Weekly Summary</h3>
        {report.weekly.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>
            No weekly data available
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 12, textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>
                    Week Starting
                  </th>
                  <th style={{ padding: 12, textAlign: 'right', color: '#9ca3af', fontWeight: 600 }}>
                    Entries
                  </th>
                  <th style={{ padding: 12, textAlign: 'right', color: '#9ca3af', fontWeight: 600 }}>
                    Total Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.weekly.map((week, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 12 }}>
                      {new Date(week.weekStart).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>{week.entryCount}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>
                      {week.totalHours.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
