import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export default function SystemClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const secs    = time.getSeconds()
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const [hhmm, ampm] = timeStr.split(' ')
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="glass-card" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>

      {/* Subtle background accent */}
      <div style={{ position: 'absolute', bottom: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={14} color="#60a5fa" />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.4px' }}>
            Local Time
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.7)', animation: 'clock-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>LIVE</span>
        </div>
      </div>

      {/* Time display */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 52, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-3px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {hhmm}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingBottom: 4, gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', lineHeight: 1 }}>
            {ampm}
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            :{String(secs).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Date */}
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 14, opacity: 0.85 }}>
        {dateStr}
      </div>

      {/* Seconds progress bar */}
      <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(secs / 59) * 100}%`,
          background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
          borderRadius: 4,
          transition: secs > 0 ? 'width 0.95s linear' : 'none',
          boxShadow: '0 0 6px rgba(59,130,246,0.5)',
        }} />
      </div>

    </div>
  )
}
