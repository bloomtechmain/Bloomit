import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { timeEntriesApi } from '../../services/timeEntriesApi'
import type { TimeEntry } from '../../types/timeEntries'
import { useToast } from '../../context/ToastContext'

type ManagerApprovalTabProps = {
  userId: number
  refreshTrigger: number
  onSuccess: () => void
  showNotification?: (message: string, type: 'success' | 'error') => void
}

export default function ManagerApprovalTab({
  userId,
  refreshTrigger,
  onSuccess
}: ManagerApprovalTabProps) {
  const { toast } = useToast()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [rejectingEntry, setRejectingEntry] = useState<TimeEntry | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')

  const fetchPendingEntries = async () => {
    setLoading(true)
    try {
      const response = await timeEntriesApi.manager.getPending()
      setEntries(response.data.timeEntries || [])
    } catch (error) {
      console.error('Error fetching pending entries:', error)
      toast.error('Failed to load pending entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingEntries()
  }, [refreshTrigger])

  const handleApprove = async (entryId: number) => {
    try {
      await timeEntriesApi.manager.approve(entryId, userId)
      toast.success('Time entry approved successfully')
      fetchPendingEntries()
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve entry')
    }
  }

  const handleReject = async () => {
    if (!rejectingEntry) return

    try {
      await timeEntriesApi.manager.reject(rejectingEntry.id, userId, rejectionNote || undefined)
      toast.success('Time entry rejected')
      setRejectingEntry(null)
      setRejectionNote('')
      fetchPendingEntries()
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject entry')
    }
  }

  const handleBulkApprove = async () => {
    if (!confirm(`Approve all ${entries.length} pending entries?`)) return

    setLoading(true)
    try {
      for (const entry of entries) {
        await timeEntriesApi.manager.approve(entry.id, userId)
      }
      toast.success(`${entries.length} entries approved successfully`)
      fetchPendingEntries()
      onSuccess()
    } catch (error: any) {
      toast.error('Some entries failed to approve')
      fetchPendingEntries()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Pending Approvals</h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} pending review
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handleBulkApprove}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Check size={18} />
            Approve All
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading pending entries...</div>
      ) : entries.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3>All Caught Up!</h3>
          <p style={{ color: '#6b7280' }}>No pending time entries to review</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {entries.map(entry => (
            <div key={entry.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                      {entry.employee_name}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {entry.employee_email}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '800', color: '#3b82f6', fontFamily: 'monospace' }}>
                      {entry.total_hours?.toFixed(2)}h
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Break: {entry.break_time_minutes}m
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Date</div>
                    <div style={{ fontWeight: '600' }}>{new Date(entry.date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Project</div>
                    <div style={{ fontWeight: '600' }}>{entry.project_name}</div>
                  </div>
                  {entry.contract_name && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Contract</div>
                      <div style={{ fontWeight: '600' }}>{entry.contract_name}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Entry Type</div>
                    <div style={{ fontWeight: '600' }}>{entry.is_timer_based ? '⏱️ Timer' : '✍️ Manual'}</div>
                  </div>
                </div>

                {entry.description && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Description</div>
                    <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem' }}>
                      {entry.description}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => handleApprove(entry.id)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Check size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectingEntry(entry)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <X size={18} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingEntry && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setRejectingEntry(null)}>
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#ef4444' }}>Reject Time Entry</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Rejecting time entry from <strong>{rejectingEntry.employee_name}</strong>
            </p>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={4}
                placeholder="Provide feedback to the employee..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setRejectingEntry(null)
                  setRejectionNote('')
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
