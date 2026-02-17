import React, { useState, useEffect } from 'react'
import { Bell, Calendar, X, User } from 'lucide-react'
import { scheduleReminder } from '../../services/quotesApi'
import { getAllEmployees, type Employee } from '../../services/employeesApi'

interface QuoteReminderModalProps {
  quoteId: number
  quoteNumber: string
  companyName: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const QuoteReminderModal: React.FC<QuoteReminderModalProps> = ({
  quoteId,
  quoteNumber,
  companyName,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [reminderDate, setReminderDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [assignedTo, setAssignedTo] = useState<number | ''>('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch employees when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEmployees()
    }
  }, [isOpen])

  const fetchEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const data = await getAllEmployees()
      setEmployees(data)
    } catch (err) {
      console.error('Failed to fetch employees:', err)
      // Don't show error to user, just leave dropdown empty
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!reminderDate) {
      setError('Reminder date is required')
      return
    }

    const selectedDate = new Date(reminderDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      setError('Reminder date cannot be in the past')
      return
    }

    setLoading(true)

    try {
      await scheduleReminder({
        quote_id: quoteId,
        reminder_date: reminderDate,
        notes: reminderNote || undefined,
        assigned_to: assignedTo || undefined
      })

      if (onSuccess) {
        onSuccess()
      }

      // Reset form
      setReminderDate('')
      setReminderNote('')
      setAssignedTo('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule reminder')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: 'min(500px, 95vw)',
          padding: 24,
          borderRadius: 16,
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bell size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Schedule Follow-up</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.7 }}>
                Quote #{quoteNumber} - {companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: 14
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Reminder Date */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#fff'
                }}
              >
                <Calendar size={16} />
                Follow-up Date *
              </label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 14
                }}
              />
            </div>

            {/* Assign To */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#fff'
                }}
              >
                <User size={16} />
                Assign To (Optional)
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
                disabled={loadingEmployees}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 14,
                  cursor: loadingEmployees ? 'wait' : 'pointer'
                }}
              >
                <option value="" style={{ background: '#1a1a1a', color: '#fff' }}>
                  {loadingEmployees ? 'Loading users...' : 'Select a user (optional)'}
                </option>
                {employees.map((emp) => (
                  <option 
                    key={emp.employee_id || emp.id} 
                    value={emp.employee_id || emp.id}
                    style={{ background: '#1a1a1a', color: '#fff' }}
                  >
                    {emp.name || `${emp.first_name} ${emp.last_name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#fff'
                }}
              >
                Notes (Optional)
              </label>
              <textarea
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                rows={3}
                placeholder="Add notes about what to discuss during follow-up..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 14,
                  resize: 'vertical',
                  minHeight: 80
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Bell size={16} />
              {loading ? 'Scheduling...' : 'Schedule Reminder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{
                padding: '12px 24px',
                color: '#fff'
              }}
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuoteReminderModal
