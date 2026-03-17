import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { Calendar, Filter, CheckCircle, XCircle, Clock, Plus, Trash2 } from 'lucide-react'
import { getEmployeePTORequests, submitPTORequest, cancelPTORequest } from '../services/employeePortalService'
import type { PTORequest } from '../services/employeePortalService'
import PTOBalanceCard from '../components/employee/PTOBalanceCard'
import { useToast } from '../context/ToastContext'

interface EmployeeTimeOffProps {
  employeeId: number
  accessToken: string
}

export default function EmployeeTimeOff({ employeeId, accessToken }: EmployeeTimeOffProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<PTORequest[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // PTO Submission Form
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    absenceType: 'Vacation',
    description: ''
  })
  
  // Phase 15: Cancellation state
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState<number | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [employeeId, accessToken, filterStatus, startDate, endDate])

  const fetchRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = {
        status: filterStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      }
      const data = await getEmployeePTORequests(employeeId, accessToken, filters)
      setRequests(data.ptoRequests)
    } catch (err) {
      console.error('Error fetching PTO requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load PTO requests')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; icon: ReactElement | null }> = {
      approved: {
        bg: 'var(--success)',
        color: '#fff',
        icon: <CheckCircle size={16} />
      },
      pending: {
        bg: '#f59e0b',
        color: '#fff',
        icon: <Clock size={16} />
      },
      denied: {
        bg: 'var(--danger)',
        color: '#fff',
        icon: <XCircle size={16} />
      }
    }

    const style = styles[status] || { bg: '#6b7280', color: '#fff', icon: null }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 12,
        background: style.bg,
        color: style.color,
        fontSize: 14,
        fontWeight: 500
      }}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const clearFilters = () => {
    setFilterStatus('all')
    setStartDate('')
    setEndDate('')
  }

  const calculateDays = () => {
    if (!formData.fromDate || !formData.toDate) return 0
    const from = new Date(formData.fromDate)
    const to = new Date(formData.toDate)
    const diffTime = to.getTime() - from.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays > 0 ? diffDays : 0
  }

  const handleSubmitRequest = async () => {
    // Validation
    if (!formData.fromDate || !formData.toDate || !formData.absenceType || !formData.description) {
      setSubmitError('All fields are required')
      return
    }

    if (formData.description.trim().length < 10) {
      setSubmitError('Description must be at least 10 characters')
      return
    }

    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      setSubmitError('End date must be after start date')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const result = await submitPTORequest(employeeId, accessToken, formData)

      toast.success(result.message + (result.balanceWarning ? ' ' + result.balanceWarning : ''))
      setShowSubmitForm(false)
      setFormData({
        fromDate: '',
        toDate: '',
        absenceType: 'Vacation',
        description: ''
      })

      // Refresh the requests list
      fetchRequests()
    } catch (err) {
      console.error('Error submitting PTO request:', err)
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit PTO request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelSubmit = () => {
    setShowSubmitForm(false)
    setSubmitError(null)
    setFormData({
      fromDate: '',
      toDate: '',
      absenceType: 'Vacation',
      description: ''
    })
  }

  // Phase 15: Cancel PTO Request
  const handleCancelRequest = async (requestId: number) => {
    setCancellingId(requestId)
    try {
      const result = await cancelPTORequest(employeeId, requestId, accessToken)
      toast.success(result.message)
      setShowCancelDialog(null)

      // Refresh the requests list
      fetchRequests()
    } catch (err) {
      console.error('Error cancelling PTO request:', err)
      setSubmitError(err instanceof Error ? err.message : 'Failed to cancel PTO request')
    } finally {
      setCancellingId(null)
    }
  }

  if (loading && requests.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div>Loading PTO requests...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 28 }}>
            Time Off Requests
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            View and submit PTO requests
          </p>
        </div>
        <button
          onClick={() => setShowSubmitForm(!showSubmitForm)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} />
          Submit New Request
        </button>
      </div>

      {/* PTO Balance Card - Phase 5 */}
      <div style={{ marginBottom: 24 }}>
        <PTOBalanceCard 
          employeeId={employeeId}
          accessToken={accessToken}
        />
      </div>

      {/* PTO Submission Form - Phase 14 */}
      {showSubmitForm && (
        <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 20 }}>📝 Submit New Time Off Request</h3>

          {submitError && (
            <div style={{ padding: 12, marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: 'var(--danger)', fontSize: 14 }}>
              ⚠ {submitError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                Request Type <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                value={formData.absenceType}
                onChange={(e) => setFormData({ ...formData, absenceType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'inherit',
                  fontSize: 14
                }}
              >
                <option value="Vacation">Vacation</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Personal Leave">Personal Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                From Date <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'inherit',
                  fontSize: 14
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                To Date <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                min={formData.fromDate || new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'inherit',
                  fontSize: 14
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
                Total Days
              </label>
              <div style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--primary)',
                textAlign: 'center'
              }}>
                {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 500 }}>
              Reason / Description <span style={{ color: 'var(--danger)' }}>*</span>
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 'normal', marginLeft: 8 }}>
                (Minimum 10 characters)
              </span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please provide a brief reason for your time off request..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'inherit',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              {formData.description.length} / 10 characters minimum
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancelSubmit}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRequest}
              className="btn-primary"
              style={{ background: 'var(--success)' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Filter size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: 18 }}>Filters</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 6, color: '#6b7280' }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'inherit',
                fontSize: 14
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 6, color: '#6b7280' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'inherit',
                fontSize: 14
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 6, color: '#6b7280' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'inherit',
                fontSize: 14
              }}
            />
          </div>

          <div>
            <button
              onClick={clearFilters}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-panel" style={{ padding: 24, marginBottom: 24, border: '1px solid var(--danger)' }}>
          <p style={{ margin: 0, color: 'var(--danger)' }}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Results Summary */}
      <div style={{ marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
        Showing {requests.length} request{requests.length !== 1 ? 's' : ''}
        {filterStatus !== 'all' && ` (${filterStatus})`}
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="glass-panel" style={{ padding: 60, textAlign: 'center' }}>
          <Calendar size={64} style={{ color: '#6b7280', margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#6b7280' }}>No PTO Requests Found</h3>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>
            {filterStatus !== 'all' || startDate || endDate
              ? 'Try adjusting your filters'
              : 'You haven\'t submitted any time off requests yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {requests.map((request) => (
            <div
              key={request.id}
              className="glass-panel"
              style={{
                padding: 24,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>
                    {request.absenceType}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 14 }}>
                    <Calendar size={16} />
                    <span>
                      {formatDate(request.fromDate)} - {formatDate(request.toDate)}
                    </span>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: 8, 
                      background: 'rgba(59, 130, 246, 0.2)',
                      fontSize: 13,
                      fontWeight: 500
                    }}>
                      {request.totalDays} day{request.totalDays !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {getStatusBadge(request.status)}
                  {/* Phase 15: Cancel button for pending requests */}
                  {request.status === 'pending' && (
                    <button
                      onClick={() => setShowCancelDialog(request.id)}
                      className="btn-secondary"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--danger)'
                      }}
                      disabled={cancellingId === request.id}
                    >
                      <Trash2 size={14} />
                      {cancellingId === request.id ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                  )}
                </div>
              </div>

              {request.description && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                    Reason
                  </label>
                  <p style={{ margin: 0, fontSize: 15 }}>
                    {request.description}
                  </p>
                </div>
              )}

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 16,
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                {request.managerName && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      Manager
                    </label>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {request.managerName}
                    </div>
                  </div>
                )}

                {request.projectName && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      Project
                    </label>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {request.projectName}
                    </div>
                  </div>
                )}

                {request.coverPersonName && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      Coverage
                    </label>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {request.coverPersonName}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                    Submitted
                  </label>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {formatDate(request.createdAt)}
                  </div>
                </div>

                {request.approvedAt && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      {request.status === 'approved' ? 'Approved' : 'Processed'}
                    </label>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {formatDate(request.approvedAt)}
                    </div>
                  </div>
                )}
              </div>

              {request.managerComments && (
                <div style={{ 
                  marginTop: 16, 
                  padding: 12, 
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 6,
                  borderLeft: '3px solid var(--primary)'
                }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                    Manager Comments
                  </label>
                  <p style={{ margin: 0, fontSize: 14 }}>
                    {request.managerComments}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Phase 15: Cancel Confirmation Dialog */}
      {showCancelDialog !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ 
            padding: 32, 
            maxWidth: 500,
            width: '90%',
            margin: 20
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 20 }}>
              ⚠️ Cancel PTO Request?
            </h3>
            <p style={{ margin: '0 0 24px', color: '#9ca3af', lineHeight: 1.6 }}>
              Are you sure you want to cancel this time off request? This action cannot be undone. 
              Your manager will be notified of the cancellation.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelDialog(null)}
                className="btn-secondary"
                disabled={cancellingId !== null}
              >
                Keep Request
              </button>
              <button
                onClick={() => showCancelDialog && handleCancelRequest(showCancelDialog)}
                className="btn-primary"
                style={{ background: 'var(--danger)' }}
                disabled={cancellingId !== null}
              >
                {cancellingId !== null ? 'Cancelling...' : 'Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
