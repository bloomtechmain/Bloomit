import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export default function SystemClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="glass-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Clock size={16} color="var(--primary)" />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Local Time
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
        {formatTime(time)}
      </div>
      <div style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>
        {formatDate(time)}
      </div>
    </div>
  )
}
