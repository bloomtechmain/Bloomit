import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'

interface InternationalClockProps {
  timezone: string
}

export default function InternationalClock({ timezone }: InternationalClockProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimeParts = (date: Date, tz: string) => {
    try {
      const full = date.toLocaleTimeString('en-US', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true
      })
      const [hhmm, ampm] = full.split(' ')
      const secs = Number(
        date.toLocaleTimeString('en-US', { timeZone: tz, second: '2-digit', hour12: false }).slice(-2)
      )
      return { hhmm, ampm, secs }
    } catch {
      return { hhmm: '--:--', ampm: 'AM', secs: 0 }
    }
  }

  const formatDate = (date: Date, tz: string) => {
    try {
      return date.toLocaleDateString('en-US', {
        timeZone: tz, weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
      })
    } catch {
      return ''
    }
  }

  const getTimezoneName = (tz: string) => tz.split('/').at(-1)?.replace(/_/g, ' ') ?? tz

  const { hhmm, ampm, secs } = formatTimeParts(time, timezone)
  const dateStr = formatDate(time, timezone)

  return (
    <div className="glass-card" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>

      {/* Subtle background accent */}
      <div style={{ position: 'absolute', bottom: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={14} color="#a78bfa" />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.4px' }}>
            {getTimezoneName(timezone)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px rgba(139,92,246,0.7)', animation: 'clock-pulse 2s ease-in-out infinite' }} />
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
          background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
          borderRadius: 4,
          transition: secs > 0 ? 'width 0.95s linear' : 'none',
          boxShadow: '0 0 6px rgba(139,92,246,0.5)',
        }} />
      </div>

    </div>
  )
}
