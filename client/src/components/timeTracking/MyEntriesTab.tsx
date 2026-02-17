import { useState, useEffect } from 'react'
import { Edit, Trash2, Filter } from 'lucide-react'
import { timeEntriesApi } from '../../services/timeEntriesApi'
import type { TimeEntry } from '../../types/timeEntries'
import type { Project } from '../../types/projects'

type MyEntriesTabProps = {
  userId: number
  projects: Project[]
  refreshTrigger: number
  showNotification: (message: string, type: 'success' | 'error') => void
}

export default function MyEntriesTab({
  userId,
  projects,
  refreshTrigger,
  showNotification
}: MyEntriesTabProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [editHours, setEditHours] = useState('')
  const [editBreak, setEditBreak] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const params: any = { employee_id: userId }
      if (filterProject) params.project_id = filterProject
      if (filterStatus !== 'all') params.status = filterStatus

      const response = await timeEntriesApi.getMyEntries(params)
      setEntries(response.data.timeEntries || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
      showNotification('Failed to load time entries', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [refreshTrigger, filterProject, filterStatus])

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setEditHours(entry.total_hours?.toString() || '')
    setEditBreak(entry.break_time_minutes?.toString() || '0')
    setEditDescription(entry.description || '')
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return

    try {
      await timeEntriesApi.update(editingEntry.id, {
        total_hours: parseFloat(editHours),
        break_time_minutes: parseInt(editBreak),
        description: editDescription || undefined
      })
      setEditingEntry(null)
      showNotification('Time entry updated successfully', 'success')
      fetchEntries()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to update entry', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return

    try {
      await timeEntriesApi.delete(id)
      showNotification('Time entry deleted successfully', 'success')
      fetchEntries()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to delete entry', 'error')
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: { bg: '#fef3c7', text: '#92400e', label: '🟡 Pending' },
      approved: { bg: '#dcfce7', text: '#166534', label: '✅ Approved' },
      rejected: { bg: '#fee2e2', text: '#991b1b', label: '❌ Rejected' }
    }
    const style = colors[status as keyof typeof colors] || colors.pending
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        background: style.bg,
        color: style.text
      }}>
        {style.label}
      </span>
    )
  }

  const totalHours = entries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0)

  return (
    <div>
      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} />
          <span style={{ fontWeight: '600' }}>Filters:</span>
        </div>
        
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value ? Number(e.target.value) : '')}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project.project_id} value={project.project_id}>
              {project.project_name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <div style={{ marginLeft: 'auto', fontWeight: '600', color: '#3b82f6' }}>
          Total: {totalHours.toFixed(2)} hours
        </div>
      </div>

      {/* Entries Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
          <h3>No Time Entries Yet</h3>
          <p style={{ color: '#6b7280' }}>Start tracking your time using the Timer or Manual Entry tabs</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#3b82f6', color: '#fff' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Project</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Contract</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Hours</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Break</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id} style={{ borderBottom: idx < entries.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <td style={{ padding: '0.75rem' }}>
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{entry.project_name}</td>
                  <td style={{ padding: '0.75rem' }}>{entry.contract_name || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>
                    {entry.total_hours?.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    {entry.break_time_minutes}m
                  </td>
                  <td style={{ padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.description || ''}>
                    {entry.description || '-'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {getStatusBadge(entry.status)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {entry.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(entry)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setEditingEntry(null)}>
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Time Entry</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Break (minutes)</label>
                <input
                  type="number"
                  value={editBreak}
                  onChange={(e) => setEditBreak(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setEditingEntry(null)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
