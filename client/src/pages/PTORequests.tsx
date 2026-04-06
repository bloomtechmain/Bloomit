import { useState, useEffect, useCallback } from 'react'
import { Calendar, FileText, UserCheck, Plus, Users, Hash, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { ptoRequestsApi } from '../services/ptoRequestsApi'
import type { PTORequest, PTOStats } from '../types/ptoRequests'
import { ABSENCE_TYPES } from '../types/ptoRequests'
import { API_URL } from '../config/api'
import { useToast } from '../context/ToastContext'

type TabType = 'my-requests' | 'approvals'

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

export default function PTORequests({ userId, isManager, accessToken, activeTab, setActiveTab, drawerOpen, setDrawerOpen }: { userId: number; isManager?: boolean; accessToken: string; activeTab: TabType; setActiveTab: (t: TabType) => void; drawerOpen: boolean; setDrawerOpen: (v: boolean) => void }) {
  const { toast } = useToast()
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

  const handleSubmitRequest = async () => {
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
      setDrawerOpen(false)

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
      pending: { bg: 'linear-gradient(135deg, #78350f, #b45309)', color: '#fde68a', label: 'Pending' },
      approved: { bg: 'linear-gradient(135deg, #064e3b, #059669)', color: '#6ee7b7', label: 'Approved' },
      denied:   { bg: 'linear-gradient(135deg, #7f1d1d, #dc2626)', color: '#fca5a5', label: 'Denied'  }
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
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      {/* Decorative background watermarks */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <Calendar size={560} strokeWidth={0.6} style={{ position: 'absolute', right: -120, top: -100, opacity: 0.07, color: '#3b82f6', transform: 'rotate(-12deg)' }} />
        <Clock size={380} strokeWidth={0.6} style={{ position: 'absolute', left: -80, bottom: -60, opacity: 0.06, color: '#6366f1', transform: 'rotate(10deg)' }} />
        <UserCheck size={320} strokeWidth={0.6} style={{ position: 'absolute', left: '42%', top: '22%', opacity: 0.05, color: '#3b82f6', transform: 'translateX(-50%) rotate(-5deg)' }} />
        <Calendar size={240} strokeWidth={0.6} style={{ position: 'absolute', left: '3%', top: '6%', opacity: 0.06, color: '#818cf8', transform: 'rotate(-8deg)' }} />
        <CheckCircle2 size={260} strokeWidth={0.6} style={{ position: 'absolute', right: '4%', top: '35%', opacity: 0.05, color: '#6366f1', transform: 'rotate(-10deg)' }} />
        <Clock size={240} strokeWidth={0.6} style={{ position: 'absolute', right: '6%', bottom: '8%', opacity: 0.06, color: '#3b82f6', transform: 'rotate(7deg)' }} />
        <XCircle size={200} strokeWidth={0.6} style={{ position: 'absolute', left: '22%', bottom: '12%', opacity: 0.05, color: '#818cf8', transform: 'rotate(-15deg)' }} />
        <FileText size={180} strokeWidth={0.6} style={{ position: 'absolute', left: '60%', top: '65%', opacity: 0.04, color: '#6366f1', transform: 'rotate(12deg)' }} />
        <Users size={200} strokeWidth={0.6} style={{ position: 'absolute', left: '15%', top: '40%', opacity: 0.05, color: '#3b82f6', transform: 'rotate(-4deg)' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>

          {/* Approved */}
          <div
            style={{
              position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '1.5rem 1.5rem 1.25rem',
              background: 'linear-gradient(145deg, #bbf7d0 0%, #6ee7b7 50%, #34d399 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset, 0 2px 0 #059669, 0 4px 0 #047857, 0 6px 0 #065f46, 0 10px 24px rgba(5,150,105,0.35)',
              transform: 'translateY(0)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.55) inset, 0 2px 0 #059669, 0 4px 0 #047857, 0 8px 0 #065f46, 0 16px 32px rgba(5,150,105,0.4)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.55) inset, 0 2px 0 #059669, 0 4px 0 #047857, 0 6px 0 #065f46, 0 10px 24px rgba(5,150,105,0.35)' }}
          >
            <div style={{ position: 'absolute', top: -18, right: -18, opacity: 0.18 }}>
              <CheckCircle2 size={100} color="#064e3b" strokeWidth={1.5} />
            </div>
            <div style={{ position: 'absolute', bottom: -10, left: -10, opacity: 0.08 }}>
              <CheckCircle2 size={70} color="#064e3b" strokeWidth={1.5} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                  <CheckCircle2 size={16} color="#064e3b" />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#064e3b', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Approved</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#064e3b', lineHeight: 1, textShadow: '0 1px 2px rgba(255,255,255,0.4)' }}>{stats.approved_count}</div>
              <div style={{ fontSize: '0.8rem', color: '#065f46', marginTop: 6, fontWeight: 600 }}>{stats.total_approved_hours} hours taken</div>
            </div>
          </div>

          {/* Pending */}
          <div
            style={{
              position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '1.5rem 1.5rem 1.25rem',
              background: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 0 #d97706, 0 4px 0 #b45309, 0 6px 0 #92400e, 0 10px 24px rgba(217,119,6,0.35)',
              transform: 'translateY(0)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 0 #d97706, 0 4px 0 #b45309, 0 8px 0 #92400e, 0 16px 32px rgba(217,119,6,0.4)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 0 #d97706, 0 4px 0 #b45309, 0 6px 0 #92400e, 0 10px 24px rgba(217,119,6,0.35)' }}
          >
            <div style={{ position: 'absolute', top: -18, right: -18, opacity: 0.18 }}>
              <Clock size={100} color="#78350f" strokeWidth={1.5} />
            </div>
            <div style={{ position: 'absolute', bottom: -10, left: -10, opacity: 0.08 }}>
              <Clock size={70} color="#78350f" strokeWidth={1.5} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                  <Clock size={16} color="#78350f" />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pending</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#78350f', lineHeight: 1, textShadow: '0 1px 2px rgba(255,255,255,0.4)' }}>{stats.pending_count}</div>
              <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 6, fontWeight: 600 }}>{stats.total_pending_hours} hours awaiting</div>
            </div>
          </div>

          {/* Denied */}
          <div
            style={{
              position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '1.5rem 1.5rem 1.25rem',
              background: 'linear-gradient(145deg, #fee2e2 0%, #fca5a5 50%, #f87171 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset, 0 2px 0 #dc2626, 0 4px 0 #b91c1c, 0 6px 0 #991b1b, 0 10px 24px rgba(220,38,38,0.35)',
              transform: 'translateY(0)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.55) inset, 0 2px 0 #dc2626, 0 4px 0 #b91c1c, 0 8px 0 #991b1b, 0 16px 32px rgba(220,38,38,0.4)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.55) inset, 0 2px 0 #dc2626, 0 4px 0 #b91c1c, 0 6px 0 #991b1b, 0 10px 24px rgba(220,38,38,0.35)' }}
          >
            <div style={{ position: 'absolute', top: -18, right: -18, opacity: 0.18 }}>
              <XCircle size={100} color="#7f1d1d" strokeWidth={1.5} />
            </div>
            <div style={{ position: 'absolute', bottom: -10, left: -10, opacity: 0.08 }}>
              <XCircle size={70} color="#7f1d1d" strokeWidth={1.5} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                  <XCircle size={16} color="#7f1d1d" />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#7f1d1d', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Denied</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#7f1d1d', lineHeight: 1, textShadow: '0 1px 2px rgba(255,255,255,0.4)' }}>{stats.denied_count}</div>
              <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: 6, fontWeight: 600 }}>requests rejected</div>
            </div>
          </div>

        </div>
      )}


      {activeTab === 'my-requests' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#7aa3d4' }}>Loading...</div>
          ) : myRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#7aa3d4', background: 'rgba(255,255,255,0.03)', borderRadius: 14 }}>
              <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ margin: 0 }}>No requests yet. Click "Request Time Off" to submit your first request.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
              {myRequests.map(request => {
                const accentMap: Record<string, string> = {
                  approved: '#10b981',
                  pending:  '#f59e0b',
                  denied:   '#ef4444',
                }
                const statusLabel: Record<string, { text: string; textColor: string; bgColor: string }> = {
                  approved: { text: 'Approved', textColor: '#059669', bgColor: 'rgba(16,185,129,0.1)' },
                  pending:  { text: 'Pending',  textColor: '#d97706', bgColor: 'rgba(245,158,11,0.1)' },
                  denied:   { text: 'Denied',   textColor: '#dc2626', bgColor: 'rgba(239,68,68,0.08)' },
                }
                const accentColor = accentMap[request.status] ?? '#6366f1'
                const sl = statusLabel[request.status] ?? statusLabel.pending
                const words = (request.absence_type ?? 'Time Off').split(' ')
                const initials = words.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                  <div
                    key={request.id}
                    style={{
                      background: 'linear-gradient(160deg, #ffffff 60%, #f4f7ff 100%)',
                      border: '1px solid #e8edf5',
                      borderRadius: 16,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      transition: 'box-shadow 0.2s, transform 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(6,48,98,0.14)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                  >
                    {/* Colored top accent bar */}
                    <div style={{ height: 4, background: accentColor, flexShrink: 0 }} />

                    {/* Main body */}
                    <div style={{ padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                      {/* Status badge — top right */}
                      <div style={{ position: 'absolute', top: 14, right: 12 }}>
                        <span style={{ background: sl.bgColor, borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: sl.textColor, letterSpacing: 0.4 }}>
                          {sl.text}
                        </span>
                      </div>

                      {/* Avatar + absence type */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: accentColor,
                          boxShadow: `0 0 0 3px ${accentColor}28`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0, letterSpacing: 0.5
                        }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                            {request.absence_type}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {request.manager_name ? `Manager: ${request.manager_name}` : 'No manager assigned'}
                          </div>
                        </div>
                      </div>

                      {/* Hours pill */}
                      <div>
                        <span style={{ background: `${accentColor}18`, color: accentColor, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                          {request.total_hours}h
                        </span>
                      </div>
                    </div>

                    {/* Date footer */}
                    <div style={{ background: '#f8fafc', borderTop: '1px solid #eef2f7', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#475569' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.2" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        <span>{new Date(request.from_date).toLocaleDateString()} → {new Date(request.to_date).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {request.project_name ? `Project: ${request.project_name}` : 'No project linked'}
                        </div>
                        {request.status === 'pending' ? (
                          <button
                            onClick={() => handleDelete(request.id)}
                            style={{ padding: '3px 10px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'approvals' && isManager && (
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
            Pending Approvals
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
          ) : pendingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#7aa3d4' }}>
              <UserCheck size={48} style={{ margin: '0 auto 1rem' }} />
              <p>No pending requests to review.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {pendingRequests.map(request => (
                <div key={request.id} style={{ border: '1px solid #1e3a5f', borderRadius: '8px', padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                        {request.employee_name}
                      </div>
                      <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem', color: '#7aa3d4' }}>
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
      </div>{/* end zIndex:1 wrapper */}
      {/* ── Request Time Off Drawer ── */}
      {drawerOpen && (
        <>
          <div className="emp-drawer-overlay" onClick={() => { setDrawerOpen(false); setAbsenceType(''); setFromDate(''); setToDate(''); setTotalHours(''); setProjectId(''); setCoverPersonId(''); setDescription(''); setManagerId('') }} />
          <div className="emp-drawer">

            {/* Drawer header */}
            <div style={{ background: 'linear-gradient(160deg, #0f172a 0%, #4c1d95 55%, #6d28d9 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: 30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Time Off</div>
                  <div style={{ color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>Request Time Off</div>
                </div>
                <button onClick={() => { setDrawerOpen(false); setAbsenceType(''); setFromDate(''); setToDate(''); setTotalHours(''); setProjectId(''); setCoverPersonId(''); setDescription(''); setManagerId('') }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>

              {/* Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: absenceType ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : 'rgba(255,255,255,0.1)', border: '2.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', boxShadow: absenceType ? '0 4px 16px rgba(167,139,250,0.4)' : 'none', transition: 'all 0.3s', flexShrink: 0 }}>
                  {absenceType ? absenceType[0].toUpperCase() : <Calendar size={24} color="rgba(255,255,255,0.35)" />}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.1px', minHeight: 22 }}>
                    {absenceType || 'Type not selected'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 3 }}>
                    {fromDate && toDate ? `${new Date(fromDate).toLocaleDateString()} → ${new Date(toDate).toLocaleDateString()}` : fromDate ? `From ${new Date(fromDate).toLocaleDateString()}` : 'Dates not set'}
                    {totalHours ? ` · ${totalHours}h` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="emp-drawer-body">

              {/* Section 1: Leave Details */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(109,40,217,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={13} color="#7c3aed" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Leave Details</span>
                </div>

                {/* Absence Type */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><FileText size={11} color="#94a3b8" /> Type of Absence *</span>
                    <select value={absenceType} onChange={e => setAbsenceType(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none', appearance: 'none', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}>
                      <option value="">Select type</option>
                      {ABSENCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                </div>

                {/* From + To Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Calendar size={11} color="#94a3b8" /> From Date *</span>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Calendar size={11} color="#94a3b8" /> To Date *</span>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                </div>

                {/* Total Hours */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Hash size={11} color="#94a3b8" /> Total Hours *</span>
                    <input type="number" value={totalHours} onChange={e => setTotalHours(e.target.value)} min="0" step="0.5" placeholder="e.g. 8" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none', width: '100%', boxSizing: 'border-box' as const, transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                </div>

                {/* Description */}
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><FileText size={11} color="#94a3b8" /> Description / Comments</span>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Additional details..." style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none', resize: 'none', width: '100%', boxSizing: 'border-box' as const, transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                </label>
              </div>

              {/* Section divider */}
              <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

              {/* Section 2: Coverage */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(79,70,229,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserCheck size={13} color="#4f46e5" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Coverage & Approval</span>
                </div>

                {/* Manager */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><UserCheck size={11} color="#94a3b8" /> Manager</span>
                    <select value={managerId} onChange={e => setManagerId(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none', appearance: 'none', cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}>
                      <option value="">Select manager (optional)</option>
                      {employees.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>)}
                    </select>
                  </label>
                </div>

                {/* Cover Person + Project */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Users size={11} color="#94a3b8" /> Who Will Cover You</span>
                    <select value={coverPersonId} onChange={e => setCoverPersonId(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none', appearance: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}>
                      <option value="">Select employee</option>
                      {employees.filter(emp => emp.employee_id !== userId).map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><FileText size={11} color="#94a3b8" /> Current Project</span>
                    <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, color: '#1e293b', outline: 'none', appearance: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}>
                      <option value="">Select project</option>
                      {projects.map(proj => <option key={proj.project_id} value={proj.project_id}>{proj.project_name}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => { setDrawerOpen(false); setAbsenceType(''); setFromDate(''); setToDate(''); setTotalHours(''); setProjectId(''); setCoverPersonId(''); setDescription(''); setManagerId('') }} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button disabled={loading} onClick={handleSubmitRequest} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4c1d95, #6d28d9)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(109,40,217,0.3)' }}>
                {loading ? 'Submitting...' : <><Plus size={15} /> Submit Request</>}
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
