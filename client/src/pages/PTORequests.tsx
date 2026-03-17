import { useState, useEffect, useCallback } from 'react'
import { Calendar, FileText, UserCheck, Plus } from 'lucide-react'
import { ptoRequestsApi } from '../services/ptoRequestsApi'
import type { PTORequest, PTOStats } from '../types/ptoRequests'
import { ABSENCE_TYPES } from '../types/ptoRequests'
import { API_URL } from '../config/api'
import { useToast } from '../context/ToastContext'

type TabType = 'request' | 'my-requests' | 'approvals'

type Employee = {
  employee_id: number
  first_name: string
  last_name: string
  email: string
}

type Project = {
  project_id: number
  project_name: string
}

export default function PTORequests({ userId, isManager, accessToken }: { userId: number; isManager?: boolean; accessToken: string }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('request')
  const [myRequests, setMyRequests] = useState<PTORequest[]>([])
  const [pendingRequests, setPendingRequests] = useState<PTORequest[]>([])
  const [stats, setStats] = useState<PTOStats | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [absenceType, setAbsenceType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [totalHours, setTotalHours] = useState('')
  const [projectId, setProjectId] = useState('')
  const [coverPersonId, setCoverPersonId] = useState('')
  const [description, setDescription] = useState('')
  const [managerId, setManagerId] = useState('')

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') toast.success(message)
    else toast.error(message)
  }

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }, [accessToken])

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }, [accessToken])

  // Fetch my requests
  const fetchMyRequests = useCallback(async () => {
    try {
      setLoading(true)
      const response = await ptoRequestsApi.getMyRequests(userId)
      setMyRequests(response.data.ptoRequests)
    } catch (error) {
      console.error('Error fetching my requests:', error)
      showNotification('Failed to load your requests', 'error')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Fetch pending requests (managers)
  const fetchPendingRequests = useCallback(async () => {
    if (!isManager) return
    try {
      setLoading(true)
      const response = await ptoRequestsApi.getPending()
      setPendingRequests(response.data.ptoRequests)
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      showNotification('Failed to load pending requests', 'error')
    } finally {
      setLoading(false)
    }
  }, [isManager])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await ptoRequestsApi.getStats(userId)
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [userId])

  useEffect(() => {
    fetchEmployees()
    fetchProjects()
    fetchMyRequests()
    fetchStats()
    if (isManager) {
      fetchPendingRequests()
    }
  }, [fetchEmployees, fetchProjects, fetchMyRequests, fetchStats, fetchPendingRequests, isManager])

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!absenceType || !fromDate || !toDate || !totalHours) {
      showNotification('Please fill in all required fields', 'error')
      return
    }

    try {
      await ptoRequestsApi.create({
        employee_id: userId,
        manager_id: managerId ? Number(managerId) : undefined,
        absence_type: absenceType,
        from_date: fromDate,
        to_date: toDate,
        total_hours: Number(totalHours),
        project_id: projectId ? Number(projectId) : undefined,
        cover_person_id: coverPersonId ? Number(coverPersonId) : undefined,
        description: description || undefined
      })

      showNotification('PTO request submitted successfully', 'success')
      
      // Reset form
      setAbsenceType('')
      setFromDate('')
      setToDate('')
      setTotalHours('')
      setProjectId('')
      setCoverPersonId('')
      setDescription('')
      setManagerId('')

      // Refresh data
      fetchMyRequests()
      fetchStats()
    } catch (error) {
      console.error('Error submitting request:', error)
      showNotification('Failed to submit request', 'error')
    }
  }

  const handleApprove = async (requestId: number) => {
    try {
      await ptoRequestsApi.approve(requestId, userId)
      showNotification('Request approved successfully', 'success')
      fetchPendingRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      showNotification('Failed to approve request', 'error')
    }
  }

  const handleDeny = async (requestId: number, comments?: string) => {
    try {
      await ptoRequestsApi.deny(requestId, userId, comments)
      showNotification('Request denied', 'success')
      fetchPendingRequests()
    } catch (error) {
      console.error('Error denying request:', error)
      showNotification('Failed to deny request', 'error')
    }
  }

  const handleDelete = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this request?')) return

    try {
      await ptoRequestsApi.delete(requestId)
      showNotification('Request deleted successfully', 'success')
      fetchMyRequests()
      fetchStats()
    } catch (error) {
      console.error('Error deleting request:', error)
      showNotification('Failed to delete request', 'error')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
      approved: { bg: '#DCFCE7', color: '#166534', label: 'Approved' },
      denied: { bg: '#FEE2E2', color: '#991B1B', label: 'Denied' }
    }
    const style = styles[status as keyof typeof styles] || styles.pending
    return (
      <span style={{ 
        padding: '4px 12px', 
        borderRadius: '12px', 
        background: style.bg, 
        color: style.color, 
        fontSize: '12px', 
        fontWeight: 600 
      }}>
        {style.label}
      </span>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
          Time Off Requests
        </h1>
        <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
          Submit and manage paid time off requests
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#DCFCE7', padding: '1rem', borderRadius: '8px', border: '1px solid #86efac' }}>
            <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: 600 }}>Approved</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>{stats.approved_count}</div>
            <div style={{ fontSize: '0.75rem', color: '#15803d' }}>{stats.total_approved_hours} hours</div>
          </div>
          <div style={{ background: '#FEF3C7', padding: '1rem', borderRadius: '8px', border: '1px solid #fcd34d' }}>
            <div style={{ fontSize: '0.875rem', color: '#92400E', fontWeight: 600 }}>Pending</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400E' }}>{stats.pending_count}</div>
            <div style={{ fontSize: '0.75rem', color: '#a16207' }}>{stats.total_pending_hours} hours</div>
          </div>
          <div style={{ background: '#FEE2E2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.875rem', color: '#991B1B', fontWeight: 600 }}>Denied</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991B1B' }}>{stats.denied_count}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('request')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'request' ? '#3b82f6' : 'transparent',
            color: activeTab === 'request' ? '#fff' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'request' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={18} />
          Request Time Off
        </button>

        <button
          onClick={() => setActiveTab('my-requests')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'my-requests' ? '#3b82f6' : 'transparent',
            color: activeTab === 'my-requests' ? '#fff' : '#6b7280',
            border: 'none',
            borderBottom: activeTab === 'my-requests' ? '3px solid #3b82f6' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={18} />
          My Requests
        </button>

        {isManager && (
          <button
            onClick={() => setActiveTab('approvals')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'approvals' ? '#3b82f6' : 'transparent',
              color: activeTab === 'approvals' ? '#fff' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'approvals' ? '3px solid #3b82f6' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <UserCheck size={18} />
            Pending Approvals ({pendingRequests.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'request' && (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '1200px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
            Submit New Request
          </h2>
          <form onSubmit={handleSubmitRequest}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Type of Absence *</label>
                <select
                  value={absenceType}
                  onChange={e => setAbsenceType(e.target.value)}
                  required
                >
                  <option value="">Select type</option>
                  {ABSENCE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Manager</label>
                <select
                  value={managerId}
                  onChange={e => setManagerId(e.target.value)}
                >
                  <option value="">Select manager (optional)</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">From Date *</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">To Date *</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  required
                  min={fromDate}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Hours *</label>
                <input
                  type="number"
                  value={totalHours}
                  onChange={e => setTotalHours(e.target.value)}
                  required
                  min="0"
                  step="0.5"
                  placeholder="e.g., 8"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Project</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                >
                  <option value="">Select project (optional)</option>
                  {projects.map(proj => (
                    <option key={proj.project_id} value={proj.project_id}>
                      {proj.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Who Will Cover You</label>
                <select
                  value={coverPersonId}
                  onChange={e => setCoverPersonId(e.target.value)}
                >
                  <option value="">Select employee (optional)</option>
                  {employees.filter(emp => emp.employee_id !== userId).map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Description / Comments</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Additional details..."
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 2rem',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'my-requests' && (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
            My Requests
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
          ) : myRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <Calendar size={48} style={{ margin: '0 auto 1rem' }} />
              <p>No requests yet. Submit your first time-off request above.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Type</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>From</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>To</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Hours</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Manager</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((request, idx) => (
                    <tr key={request.id} style={{ borderBottom: idx < myRequests.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{request.absence_type}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{new Date(request.from_date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{new Date(request.to_date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{request.total_hours}</td>
                      <td style={{ padding: '0.75rem' }}>{getStatusBadge(request.status)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{request.manager_name || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'approvals' && isManager && (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
            Pending Approvals
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
          ) : pendingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <UserCheck size={48} style={{ margin: '0 auto 1rem' }} />
              <p>No pending requests to review.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {pendingRequests.map(request => (
                <div key={request.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                        {request.employee_name}
                      </div>
                      <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <div><strong>Type:</strong> {request.absence_type}</div>
                        <div><strong>Dates:</strong> {new Date(request.from_date).toLocaleDateString()} - {new Date(request.to_date).toLocaleDateString()}</div>
                        <div><strong>Hours:</strong> {request.total_hours}</div>
                        {request.project_name && <div><strong>Project:</strong> {request.project_name}</div>}
                        {request.cover_employee_name && <div><strong>Coverage:</strong> {request.cover_employee_name}</div>}
                        {request.description && <div><strong>Notes:</strong> {request.description}</div>}
                        <div><strong>Submitted:</strong> {new Date(request.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleApprove(request.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#dcfce7',
                          color: '#166534',
                          border: '1px solid #86efac',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const comments = prompt('Reason for denial (optional):')
                          if (comments !== null) {
                            handleDeny(request.id, comments)
                          }
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
