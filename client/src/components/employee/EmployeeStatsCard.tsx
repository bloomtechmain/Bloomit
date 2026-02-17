import { Calendar, Clock, Bell, Briefcase, TrendingUp } from 'lucide-react'

interface EmployeeStatsCardProps {
  stats: {
    ptoBalance: number
    pendingPtoRequests: number
    timeEntriesThisWeek: number
    unreadNotifications: number
  }
  onNavigate?: (view: 'timeoff' | 'timetracker' | 'notifications') => void
}

export default function EmployeeStatsCard({ stats, onNavigate }: EmployeeStatsCardProps) {
  const cards = [
    {
      icon: <Calendar size={24} />,
      label: 'PTO Balance',
      value: `${stats.ptoBalance} days`,
      color: '#10b981',
      bgColor: '#d1fae5',
      onClick: () => onNavigate?.('timeoff'),
      clickable: !!onNavigate
    },
    {
      icon: <Clock size={24} />,
      label: 'Time This Week',
      value: `${stats.timeEntriesThisWeek} hours`,
      color: '#3b82f6',
      bgColor: '#dbeafe',
      subValue: stats.timeEntriesThisWeek >= 40 ? '✓ On track' : `${40 - stats.timeEntriesThisWeek}h to go`,
      onClick: () => onNavigate?.('timetracker'),
      clickable: false // Phase 7
    },
    {
      icon: <Briefcase size={24} />,
      label: 'Pending Requests',
      value: stats.pendingPtoRequests,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      onClick: () => onNavigate?.('timeoff'),
      clickable: !!onNavigate,
      trending: stats.pendingPtoRequests > 0 ? 'up' : undefined
    },
    {
      icon: <Bell size={24} />,
      label: 'Notifications',
      value: stats.unreadNotifications,
      color: stats.unreadNotifications > 0 ? '#ef4444' : '#6b7280',
      bgColor: stats.unreadNotifications > 0 ? '#fee2e2' : '#f3f4f6',
      onClick: () => onNavigate?.('notifications'),
      clickable: false, // Phase 18
      badge: stats.unreadNotifications > 0 ? 'New' : undefined
    }
  ]

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
      gap: 16, 
      marginBottom: 24 
    }}>
      {cards.map((card, idx) => (
        <div 
          key={idx}
          className="glass-panel"
          onClick={card.clickable ? card.onClick : undefined}
          style={{ 
            padding: 20,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: card.clickable ? 'pointer' : 'default',
            position: 'relative',
            opacity: card.clickable ? 1 : 0.95
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {/* Badge */}
          {card.badge && (
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '2px 8px',
              borderRadius: 8,
              background: card.color,
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {card.badge}
            </div>
          )}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 12,
              background: card.bgColor,
              color: card.color
            }}>
              {card.icon}
            </div>
            {card.trending && (
              <div style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <TrendingUp size={14} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>Active</span>
              </div>
            )}
          </div>
          <div>
            <div style={{ 
              fontSize: 13, 
              color: '#6b7280', 
              fontWeight: 500,
              marginBottom: 4
            }}>
              {card.label}
            </div>
            <div style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: card.color,
              lineHeight: 1,
              marginBottom: card.subValue ? 6 : 0
            }}>
              {card.value}
            </div>
            {card.subValue && (
              <div style={{
                fontSize: 12,
                color: '#9ca3af',
                fontWeight: 500
              }}>
                {card.subValue}
              </div>
            )}
          </div>
          
          {/* Click indicator */}
          {card.clickable && (
            <div style={{
              marginTop: 'auto',
              paddingTop: 8,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              fontSize: 12,
              color: card.color,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              Click to view details →
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
