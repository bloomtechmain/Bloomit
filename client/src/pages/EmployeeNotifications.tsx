import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, Calendar, DollarSign, Clock, AlertCircle, Info } from 'lucide-react'

interface Notification {
  id: number
  notification_type: string
  title: string
  message: string
  link: string | null
  priority: string
  is_read: boolean
  created_at: string
}

interface EmployeeNotificationsProps {
  employeeId: number
  accessToken: string
}

export default function EmployeeNotifications({ employeeId, accessToken }: EmployeeNotificationsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/employee-portal/notifications/${employeeId}?unreadOnly=${filter === 'unread'}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [employeeId, filter])

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/employee-portal/notifications/${employeeId}/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        )
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/employee-portal/notifications/${employeeId}/read-all`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  // Archive notification
  const archiveNotification = async (notificationId: number) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/employee-portal/notifications/${employeeId}/${notificationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (err) {
      console.error('Error archiving notification:', err)
    }
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      'PTO_REQUEST': Calendar,
      'PTO_APPROVED': Calendar,
      'PTO_DENIED': Calendar,
      'PAYSLIP_READY': DollarSign,
      'TIME_ENTRY_REMINDER': Clock,
      'ANNOUNCEMENT': Info,
      'SYSTEM': AlertCircle
    }
    const Icon = iconMap[type] || Bell
    return <Icon size={20} />
  }

  // Get notification color
  const getNotificationColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'urgent': '#ef4444',
      'high': '#f59e0b',
      'normal': '#3b82f6',
      'low': '#6b7280'
    }
    return colorMap[priority] || '#6b7280'
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Filter notifications by type
  const filteredNotifications = typeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.notification_type === typeFilter)

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading && notifications.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p>Loading notifications...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: 24, margin: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2>Error Loading Notifications</h2>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button onClick={fetchNotifications} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            marginTop: 0,
            marginBottom: 0,
            fontSize: isMobile ? 24 : 32 
          }}>
            <Bell size={isMobile ? 28 : 36} />
            Notifications
            {unreadCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                width: isMobile ? 28 : 32,
                height: isMobile ? 28 : 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? 12 : 14,
                fontWeight: 600
              }}>
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary"
              style={{ fontSize: 14, padding: '8px 16px' }}
            >
              <Check size={16} style={{ marginRight: 6 }} />
              Mark all read
            </button>
          )}
        </div>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Stay updated with your latest notifications
        </p>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ 
        padding: isMobile ? 12 : 16, 
        marginBottom: 24,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 12,
        alignItems: isMobile ? 'stretch' : 'center'
      }}>
        {/* Read/Unread Filter */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.2)',
              background: filter === 'all' ? 'var(--accent)' : 'transparent',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.2)',
              background: filter === 'unread' ? 'var(--accent)' : 'transparent',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 14,
            flex: isMobile ? 1 : 'initial'
          }}
        >
          <option value="all">All Types</option>
          <option value="PTO_REQUEST">PTO Requests</option>
          <option value="PAYSLIP_READY">Payslip</option>
          <option value="TIME_ENTRY_REMINDER">Time Entry</option>
          <option value="ANNOUNCEMENT">Announcements</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="glass-panel" style={{ padding: 60, textAlign: 'center' }}>
          <Bell size={64} style={{ color: '#6b7280', margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', color: '#6b7280' }}>No notifications</h3>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>
            {filter === 'unread' ? "You're all caught up!" : "You don't have any notifications yet"}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className="glass-panel"
              style={{
                padding: 16,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                opacity: notification.is_read ? 0.7 : 1,
                borderLeft: `4px solid ${getNotificationColor(notification.priority)}`
              }}
            >
              {/* Icon */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: getNotificationColor(notification.priority) + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getNotificationColor(notification.priority),
                flexShrink: 0
              }}>
                {getNotificationIcon(notification.notification_type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    {notification.title}
                  </h4>
                  {!notification.is_read && (
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      flexShrink: 0,
                      marginLeft: 8,
                      marginTop: 6
                    }} />
                  )}
                </div>
                <p style={{ margin: '4px 0 8px', fontSize: 14, color: '#9ca3af' }}>
                  {notification.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#6b7280' }}>
                  <span>{formatRelativeTime(notification.created_at)}</span>
                  {notification.priority === 'urgent' && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: '#ef444420',
                      color: '#ef4444',
                      fontWeight: 600
                    }}>
                      URGENT
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      border: 'none',
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => archiveNotification(notification.id)}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Archive"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
