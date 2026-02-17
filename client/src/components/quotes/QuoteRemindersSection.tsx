import React, { useState, useEffect } from 'react'
import { Bell, Calendar, X, Plus, AlertCircle, Clock } from 'lucide-react'
import { getQuoteReminders, createReminder, dismissReminder } from '../../services/quotesApi'
import type { QuoteReminder } from '../../types/quotes'

interface QuoteRemindersSectionProps {
  quoteId: number
  quoteNumber: string
  companyName: string
}

const QuoteRemindersSection: React.FC<QuoteRemindersSectionProps> = ({
  quoteId,
  // quoteNumber,
  // companyName
}) => {
  const [reminders, setReminders] = useState<QuoteReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newReminderDate, setNewReminderDate] = useState('')
  const [newReminderNote, setNewReminderNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadReminders()
  }, [quoteId])

  const loadReminders = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getQuoteReminders(quoteId)
      setReminders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newReminderDate) {
      setError('Reminder date is required')
      return
    }

    const selectedDate = new Date(newReminderDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      setError('Reminder date cannot be in the past')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      await createReminder(quoteId, {
        reminder_date: newReminderDate,
        notes: newReminderNote || undefined,
        created_by: user.id
      })

      // Reset form
      setNewReminderDate('')
      setNewReminderNote('')
      setShowAddForm(false)

      // Reload reminders
      await loadReminders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDismissReminder = async (reminderId: number) => {
    try {
      await dismissReminder(reminderId)
      await loadReminders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss reminder')
    }
  }

  const categorizeReminder = (reminder: QuoteReminder): 'overdue' | 'today' | 'upcoming' => {
    const reminderDate = new Date(reminder.reminder_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    reminderDate.setHours(0, 0, 0, 0)

    if (reminderDate < today) return 'overdue'
    if (reminderDate.getTime() === today.getTime()) return 'today'
    return 'upcoming'
  }

  const getUrgencyStyle = (category: 'overdue' | 'today' | 'upcoming') => {
    switch (category) {
      case 'overdue':
        return {
          border: '1px solid #ef4444',
          background: 'rgba(239, 68, 68, 0.1)',
          icon: <AlertCircle size={16} color="#ef4444" />
        }
      case 'today':
        return {
          border: '1px solid #f59e0b',
          background: 'rgba(245, 158, 11, 0.1)',
          icon: <Bell size={16} color="#f59e0b" />
        }
      case 'upcoming':
        return {
          border: '1px solid #3b82f6',
          background: 'rgba(59, 130, 246, 0.1)',
          icon: <Clock size={16} color="#3b82f6" />
        }
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatRelativeDate = (dateString: string): string => {
    const reminderDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    reminderDate.setHours(0, 0, 0, 0)

    const diffTime = reminderDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
    return `In ${diffDays} days`
  }

  // Filter only pending reminders
  const pendingReminders = reminders.filter(r => r.reminder_status === 'PENDING')

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 24, marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={20} color="var(--accent)" />
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Follow-Up Reminders</h2>
          {pendingReminders.length > 0 && (
            <span
              style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {pendingReminders.length}
            </span>
          )}
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={16} />
            Add Reminder
          </button>
        )}
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

      {/* Add Reminder Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddReminder}
          style={{
            background: 'rgba(255,255,255,0.05)',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: '#fff'
                }}
              >
                <Calendar size={14} />
                Reminder Date *
              </label>
              <input
                type="date"
                value={newReminderDate}
                onChange={(e) => setNewReminderDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 13
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: '#fff'
                }}
              >
                Notes (Optional)
              </label>
              <textarea
                value={newReminderNote}
                onChange={(e) => setNewReminderNote(e.target.value)}
                rows={2}
                placeholder="Add notes about what to discuss..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 13,
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '8px 16px',
                fontSize: 13
              }}
            >
              {submitting ? 'Adding...' : 'Add Reminder'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewReminderDate('')
                setNewReminderNote('')
                setError(null)
              }}
              className="btn-secondary"
              style={{
                padding: '8px 16px',
                fontSize: 13
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reminders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.5)' }}>
          Loading reminders...
        </div>
      ) : pendingReminders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 24,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            border: '1px dashed rgba(255,255,255,0.2)'
          }}
        >
          <Bell size={32} color="rgba(255,255,255,0.3)" style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            No pending reminders for this quote
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {pendingReminders.map((reminder) => {
            const category = categorizeReminder(reminder)
            const style = getUrgencyStyle(category)

            return (
              <div
                key={reminder.reminder_id}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: style.border,
                  background: style.background,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                  <div style={{ marginTop: 2 }}>{style.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                        {formatDate(reminder.reminder_date)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.6)',
                          fontWeight: 500
                        }}
                      >
                        ({formatRelativeDate(reminder.reminder_date)})
                      </span>
                    </div>
                    {reminder.notes && (
                      <p
                        style={{
                          margin: '8px 0 0',
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.8)',
                          lineHeight: 1.5
                        }}
                      >
                        {reminder.notes}
                      </p>
                    )}
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.5)'
                      }}
                    >
                      {reminder.reminder_type === 'AUTO' ? '🤖 Auto-generated' : '👤 Manual'} •{' '}
                      {reminder.created_by_name && `Created by ${reminder.created_by_name}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDismissReminder(reminder.reminder_id)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  title="Dismiss reminder"
                >
                  <X size={14} />
                  Dismiss
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default QuoteRemindersSection
