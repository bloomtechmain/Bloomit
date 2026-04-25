import React, { useState, useEffect } from 'react'
import { Bell, Calendar, X, User, Clock, FileText } from 'lucide-react'
import { scheduleReminder } from '../../services/quotesApi'
import { getAllEmployees, type Employee } from '../../services/employeesApi'
import { useToast } from '../../context/ToastContext'

interface QuoteReminderModalProps {
  quoteId: number
  quoteNumber: string
  companyName: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#f0f6ff',
  padding: '9px 12px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
  marginBottom: 6,
}

const QuoteReminderModal: React.FC<QuoteReminderModalProps> = ({
  quoteId,
  quoteNumber,
  companyName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reminderDate, setReminderDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [assignedTo, setAssignedTo] = useState<number | ''>('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) fetchEmployees()
  }, [isOpen])

  const fetchEmployees = async () => {
    setLoadingEmployees(true)
    try {
      setEmployees(await getAllEmployees())
    } catch {
      // leave dropdown empty silently
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reminderDate) { toast.error('Reminder date is required'); return }

    const selected = new Date(reminderDate)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (selected < today) { toast.error('Reminder date cannot be in the past'); return }

    setLoading(true)
    try {
      await scheduleReminder({
        quote_id: quoteId,
        reminder_date: reminderDate,
        notes: reminderNote || undefined,
        assigned_to: assignedTo || undefined,
      })
      toast.success('Follow-up reminder scheduled!')
      setReminderDate(''); setReminderNote(''); setAssignedTo('')
      onSuccess ? onSuccess() : onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule reminder')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(480px, 95vw)',
          background: 'linear-gradient(160deg, #080f1e 0%, #0d1e38 55%, #0f2347 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(234,88,12,0.18) 0%, rgba(249,115,22,0.1) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(234,88,12,0.4)',
            }}>
              <Bell size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f6ff', lineHeight: 1 }}>
                Schedule Follow-up
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                Quote #{quoteNumber} · {companyName}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'grid', gap: 16 }}>

          {/* Reminder Date */}
          <div>
            <label style={labelStyle}>
              <Calendar size={11} /> Follow-up Date <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="date"
              value={reminderDate}
              onChange={e => setReminderDate(e.target.value)}
              min={minDate}
              required
              style={inputStyle}
              className="timer-panel-input"
            />
          </div>

          {/* Assign To */}
          <div>
            <label style={labelStyle}>
              <User size={11} /> Assign To <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none' }}>(Optional)</span>
            </label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingEmployees}
              style={{ ...inputStyle, cursor: loadingEmployees ? 'wait' : 'pointer' }}
              className="timer-panel-input"
            >
              <option value="" style={{ background: '#0d1e38' }}>
                {loadingEmployees ? 'Loading…' : 'Unassigned'}
              </option>
              {employees.map(emp => (
                <option
                  key={emp.employee_id ?? emp.id}
                  value={emp.employee_id ?? emp.id}
                  style={{ background: '#0d1e38' }}
                >
                  {emp.name ?? `${emp.first_name} ${emp.last_name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>
              <FileText size={11} /> Notes <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none' }}>(Optional)</span>
            </label>
            <textarea
              value={reminderNote}
              onChange={e => setReminderNote(e.target.value)}
              rows={3}
              placeholder="What to discuss during follow-up…"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              className="timer-panel-input"
            />
          </div>

          {/* Quick date chips */}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Quick Select
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: 'Tomorrow',  days: 1 },
                { label: '3 days',    days: 3 },
                { label: '1 week',    days: 7 },
                { label: '2 weeks',   days: 14 },
                { label: '1 month',   days: 30 },
              ].map(({ label, days }) => {
                const d = new Date(); d.setDate(d.getDate() + days)
                const val = d.toISOString().split('T')[0]
                const active = reminderDate === val
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setReminderDate(val)}
                    style={{
                      padding: '4px 11px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
                      cursor: 'pointer', border: 'none',
                      background: active ? 'rgba(234,88,12,0.3)' : 'rgba(255,255,255,0.06)',
                      color: active ? '#fdba74' : 'rgba(255,255,255,0.5)',
                      outline: active ? '1px solid rgba(234,88,12,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              type="submit"
              disabled={loading || !reminderDate}
              style={{
                flex: 1, padding: '10px 0',
                background: reminderDate
                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  : 'rgba(255,255,255,0.07)',
                border: 'none', borderRadius: 9, cursor: reminderDate ? 'pointer' : 'not-allowed',
                color: reminderDate ? '#fff' : 'rgba(255,255,255,0.28)',
                fontWeight: 700, fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: reminderDate ? '0 0 18px rgba(234,88,12,0.35)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Clock size={14} />
              {loading ? 'Scheduling…' : 'Schedule Reminder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px', borderRadius: 9,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem',
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
