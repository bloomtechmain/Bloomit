import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'

interface Deadline {
  id: string
  title: string
  description: string
  dueDate: string
  type: 'urgent' | 'warning' | 'info'
  completed?: boolean
}

interface UpcomingDeadlinesProps {
  pendingPtoRequests: number
  pendingTimeEntries: number
}

export default function UpcomingDeadlines({ 
  pendingPtoRequests, 
  pendingTimeEntries 
}: UpcomingDeadlinesProps) {
  // Generate deadlines based on current date
  const today = new Date()
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
  
  const deadlines: Deadline[] = []

  // Timesheet submission reminder (if Friday is approaching)
  if (today.getDay() >= 3) { // Wednesday or later
    deadlines.push({
      id: 'timesheet',
      title: 'Submit Weekly Timesheet',
      description: `${pendingTimeEntries} time entries pending approval`,
      dueDate: endOfWeek.toLocaleDateString(),
      type: pendingTimeEntries > 5 ? 'warning' : 'info'
    })
  }

  // PTO approval pending
  if (pendingPtoRequests > 0) {
    deadlines.push({
      id: 'pto',
      title: 'PTO Request Pending',
      description: `${pendingPtoRequests} request${pendingPtoRequests > 1 ? 's' : ''} awaiting manager approval`,
      dueDate: 'Pending',
      type: 'warning'
    })
  }

  // Payslip signature reminder (example - would need actual data)
  const isEarlyMonth = today.getDate() <= 10
  if (isEarlyMonth) {
    deadlines.push({
      id: 'payslip',
      title: 'Review & Sign Payslip',
      description: 'Previous month payslip requires your signature',
      dueDate: `${today.toLocaleString('default', { month: 'short' })} 10`,
      type: 'urgent'
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle size={20} />
      case 'warning':
        return <Clock size={20} />
      default:
        return <CheckCircle size={20} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' }
      case 'warning':
        return { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' }
      default:
        return { bg: '#dbeafe', text: '#2563eb', border: '#3b82f6' }
    }
  }

  return (
    <div className="glass-panel" style={{ padding: 24, borderRadius: 12 }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12, 
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '2px solid #e5e7eb'
      }}>
        <Clock size={24} style={{ color: 'var(--primary)' }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          Upcoming Deadlines
        </h2>
      </div>

      {deadlines.length === 0 ? (
        <div style={{ 
          padding: 40, 
          textAlign: 'center', 
          color: '#9ca3af' 
        }}>
          <CheckCircle size={48} style={{ opacity: 0.3, margin: '0 auto 16px', color: '#10b981' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>All caught up!</p>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>No pending deadlines at this time</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {deadlines.map(deadline => {
            const colors = getTypeColor(deadline.type)
            return (
              <div 
                key={deadline.id}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: `2px solid ${colors.border}`,
                  background: colors.bg,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{
                  minWidth: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#fff',
                  color: colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getTypeIcon(deadline.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: 15, 
                    fontWeight: 600, 
                    color: colors.text,
                    marginBottom: 4
                  }}>
                    {deadline.title}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: '#374151',
                    marginBottom: 8
                  }}>
                    {deadline.description}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: colors.text,
                    fontWeight: 600
                  }}>
                    📅 Due: {deadline.dueDate}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
