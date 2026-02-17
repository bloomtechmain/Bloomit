import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'

interface InternationalClockProps {
  timezone: string
}

export default function InternationalClock({ timezone }: InternationalClockProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date, tz: string) => {
    try {
      return date.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('Invalid timezone:', tz, error)
      return 'Invalid timezone'
    }
  }

  const formatDate = (date: Date, tz: string) => {
    try {
      return date.toLocaleDateString('en-US', {
        timeZone: tz,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return ''
    }
  }

  const getTimezoneName = (tz: string) => {
    // Extract readable name from timezone string
    const parts = tz.split('/')
    return parts[parts.length - 1].replace(/_/g, ' ')
  }

  return (
    <div className="glass-card" style={{ padding: '16px 20px', borderTop: '2px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Globe size={16} color="var(--accent)" />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {getTimezoneName(timezone)}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.5px', marginBottom: 4 }}>
        {formatTime(time, timezone)}
      </div>
      <div style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>
        {formatDate(time, timezone)}
      </div>
    </div>
  )
}
