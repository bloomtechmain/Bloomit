import { Megaphone, AlertCircle } from 'lucide-react'

interface Announcement {
  id: number
  title: string
  content: string
  priority: string
  category: string
  startDate: string
  createdAt: string
}

interface AnnouncementsFeedProps {
  announcements: Announcement[]
}

export default function AnnouncementsFeed({ announcements }: AnnouncementsFeedProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' }
      case 'high':
        return { bg: '#fed7aa', text: '#ea580c', border: '#fdba74' }
      case 'normal':
        return { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' }
      case 'low':
        return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' }
      default:
        return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' }
    }
  }

  const getPriorityIcon = (priority: string) => {
    if (priority.toLowerCase() === 'urgent' || priority.toLowerCase() === 'high') {
      return <AlertCircle size={18} />
    }
    return <Megaphone size={18} />
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
        <Megaphone size={24} style={{ color: 'var(--primary)' }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          Company Announcements
        </h2>
      </div>

      {announcements.length === 0 ? (
        <div style={{ 
          padding: 40, 
          textAlign: 'center', 
          color: '#9ca3af' 
        }}>
          <Megaphone size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
          <p style={{ margin: 0, fontSize: 15 }}>No announcements at this time</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {announcements.map(announcement => {
            const colors = getPriorityColor(announcement.priority)
            return (
              <div 
                key={announcement.id}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: `2px solid ${colors.border}`,
                  background: '#fff',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: 8,
                    background: colors.bg,
                    color: colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getPriorityIcon(announcement.priority)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                        {announcement.title}
                      </h3>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: colors.bg,
                        color: colors.text,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {announcement.priority}
                      </span>
                    </div>
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: 14, 
                      color: '#4b5563',
                      lineHeight: 1.5
                    }}>
                      {announcement.content}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      gap: 16, 
                      fontSize: 12, 
                      color: '#9ca3af' 
                    }}>
                      <span>📁 {announcement.category || 'General'}</span>
                      <span>📅 {new Date(announcement.createdAt).toLocaleDateString()}</span>
                    </div>
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
