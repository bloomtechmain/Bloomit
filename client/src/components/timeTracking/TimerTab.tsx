import { useState, useEffect, useRef, useId } from 'react'
import { Play, Square, Coffee } from 'lucide-react'
import { timeEntriesApi } from '../../services/timeEntriesApi'
import { contractsApi } from '../../services/projectsApi'
import type { ActiveTimer } from '../../types/timeEntries'
import type { Project, Contract } from '../../types/projects'

// ── Modern Sand Timer SVG — 60fps smooth, curved glass body ──────────────────
function SandTimer({ elapsedSeconds }: { elapsedSeconds: number }) {
  const uid  = useId().replace(/:/g, '')
  const CYCLE = 14   // seconds per flip
  const W = 160, H = 160, cx = W / 2

  // ── 60fps smooth phase via requestAnimationFrame ──────────────────────────
  const [phase, setPhase] = useState(0)
  const [flips, setFlips] = useState(0)

  useEffect(() => {
    // Derive the absolute timer start from the parent's elapsed count (syncs every 1s)
    const startMs = Date.now() - elapsedSeconds * 1000
    let raf = 0
    const tick = () => {
      const total = (Date.now() - startMs) / 1000
      setPhase((total % CYCLE) / CYCLE)
      setFlips(Math.floor(total / CYCLE))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [elapsedSeconds])

  // ── Geometry ──────────────────────────────────────────────────────────────
  const capThick = 12
  const capX = 4, capW = W - 8
  const topCapY = 4
  const botCapY = H - topCapY - capThick     // 144
  const glassTop = topCapY + capThick        // 16
  const glassBot = botCapY                   // 144
  const neckY = H / 2                       // 80
  const chamberH = neckY - glassTop         // 64
  const gL = 16, gR = 144                  // glass body outer left/right
  const nL = cx - 6, nR = cx + 6          // neck left/right = 74, 86

  // ── Curved hourglass paths using cubic bezier (convex sides) ─────────────
  // Control points push sides outward to give a proper curved hourglass shape
  const topPath  = `M ${gL} ${glassTop} C 4 42, 66 70, ${nL} ${neckY} L ${nR} ${neckY} C 94 70, 156 42, ${gR} ${glassTop} Z`
  const botPath  = `M ${nL} ${neckY} C 66 90, 4 118, ${gL} ${glassBot} L ${gR} ${glassBot} C 156 118, 94 90, ${nR} ${neckY} Z`
  const fullPath = `M ${gL} ${glassTop} C 4 42, 66 70, ${nL} ${neckY} C 66 90, 4 118, ${gL} ${glassBot} L ${gR} ${glassBot} C 156 118, 94 90, ${nR} ${neckY} C 94 70, 156 42, ${gR} ${glassTop} Z`

  // Sand fill rects (wider than glass so clip paths trim them cleanly)
  const sRx = gL - 4, sRw = (gR - gL) + 8
  const topSandH = (1 - phase) * chamberH   // drains from top
  const botSandH = phase * chamberH          // builds in bottom

  return (
    <div style={{
      display: 'inline-block',
      filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.45)) drop-shadow(0 8px 22px rgba(0,0,0,0.65))',
    }}>
      {/* Flip wrapper — rotates 180° each CYCLE, spring ease */}
      <div style={{
        display: 'inline-block',
        transform: `rotate(${flips * 180}deg)`,
        transition: 'transform 1.1s cubic-bezier(0.68,-0.55,0.265,1.55)',
      }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            {/* Chamber clip paths (curved) */}
            <clipPath id={`${uid}tc`}><path d={topPath} /></clipPath>
            <clipPath id={`${uid}bc`}><path d={botPath} /></clipPath>

            {/* Rich amber sand */}
            <linearGradient id={`${uid}sg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fefce8" />
              <stop offset="20%"  stopColor="#fde047" />
              <stop offset="60%"  stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Deep navy glass body */}
            <linearGradient id={`${uid}gg`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#030912" stopOpacity="0.97" />
              <stop offset="30%"  stopColor="#071425" stopOpacity="0.91" />
              <stop offset="70%"  stopColor="#071425" stopOpacity="0.91" />
              <stop offset="100%" stopColor="#030912" stopOpacity="0.97" />
            </linearGradient>

            {/* Left edge blue reflection (glass caustic) */}
            <linearGradient id={`${uid}hl`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#7dd3fc" stopOpacity="0.32" />
              <stop offset="16%"  stopColor="#bae6fd" stopOpacity="0.10" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>

            {/* Right edge subtle reflection */}
            <linearGradient id={`${uid}hr`} x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%"   stopColor="#93c5fd" stopOpacity="0.16" />
              <stop offset="15%"  stopColor="transparent" stopOpacity="0" />
            </linearGradient>

            {/* Silver metallic cap */}
            <linearGradient id={`${uid}cg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#f1f5f9" />
              <stop offset="28%"  stopColor="#94a3b8" />
              <stop offset="75%"  stopColor="#3d5368" />
              <stop offset="100%" stopColor="#1a2535" />
            </linearGradient>

            {/* Cap specular top shine */}
            <linearGradient id={`${uid}cs`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="white" stopOpacity="0.60" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Sand top-surface shimmer line */}
            <linearGradient id={`${uid}ss`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="white" stopOpacity="0" />
              <stop offset="40%"  stopColor="white" stopOpacity="0.55" />
              <stop offset="60%"  stopColor="white" stopOpacity="0.55" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Neck amber radial glow */}
            <radialGradient id={`${uid}ng`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ── Glass body ── */}
          <path d={fullPath} fill={`url(#${uid}gg)`} />

          {/* ── Top sand — drains from neckY upward ── */}
          <rect x={sRx} y={neckY - topSandH} width={sRw} height={topSandH + 1}
            fill={`url(#${uid}sg)`} clipPath={`url(#${uid}tc)`} />
          {/* Sand surface shimmer */}
          {topSandH > 4 && (
            <rect x={sRx} y={neckY - topSandH} width={sRw} height={3}
              fill={`url(#${uid}ss)`} clipPath={`url(#${uid}tc)`} />
          )}

          {/* ── Bottom sand — fills from glassBot upward ── */}
          <rect x={sRx} y={glassBot - botSandH} width={sRw} height={botSandH + 1}
            fill={`url(#${uid}sg)`} clipPath={`url(#${uid}bc)`} />
          {/* Sand surface shimmer */}
          {botSandH > 4 && (
            <rect x={sRx} y={glassBot - botSandH} width={sRw} height={3}
              fill={`url(#${uid}ss)`} clipPath={`url(#${uid}bc)`} />
          )}

          {/* ── Sand stream particles (SVG-native, no CSS dependency) ── */}
          {phase > 0.01 && phase < 0.99 && [0,1,2,3,4,5,6].map(i => (
            <circle key={i} r={i < 4 ? 2.1 : 1.3} fill="#fef9c3">
              <animate attributeName="cy"
                values={`${neckY - 2};${neckY + 26}`}
                dur={`${0.58 + i * 0.035}s`} begin={`${i * 0.083}s`} repeatCount="indefinite" />
              <animate attributeName="cx"
                values={`${cx + (i % 3 - 1)};${cx + (i % 3 - 1) * 2.5}`}
                dur={`${0.58 + i * 0.035}s`} begin={`${i * 0.083}s`} repeatCount="indefinite" />
              <animate attributeName="opacity"
                values="0.95;0"
                dur={`${0.58 + i * 0.035}s`} begin={`${i * 0.083}s`} repeatCount="indefinite" />
              <animate attributeName="r"
                values={`${i < 4 ? 2.1 : 1.3};0.4`}
                dur={`${0.58 + i * 0.035}s`} begin={`${i * 0.083}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* ── Neck glow — pulses while sand flows ── */}
          {phase > 0.01 && phase < 0.99 && (
            <ellipse cx={cx} cy={neckY} rx={14} ry={6} fill={`url(#${uid}ng)`}>
              <animate attributeName="opacity" values="0.45;0.9;0.45" dur="1.8s" repeatCount="indefinite" />
            </ellipse>
          )}

          {/* ── Glass outline ── */}
          <path d={fullPath} fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="1.5" />

          {/* ── Left and right glass caustic reflections ── */}
          <path d={fullPath} fill={`url(#${uid}hl)`} />
          <path d={fullPath} fill={`url(#${uid}hr)`} />

          {/* ── Bottom cap ── */}
          <rect x={capX} y={botCapY} width={capW} height={capThick} rx={6} fill={`url(#${uid}cg)`} />
          <rect x={capX+5} y={botCapY+2} width={capW-10} height={capThick*0.38} rx={3} fill={`url(#${uid}cs)`} />

          {/* ── Top cap ── */}
          <rect x={capX} y={topCapY} width={capW} height={capThick} rx={6} fill={`url(#${uid}cg)`} />
          <rect x={capX+5} y={topCapY+2} width={capW-10} height={capThick*0.38} rx={3} fill={`url(#${uid}cs)`} />
          {/* Cap underline shadow */}
          <rect x={capX} y={topCapY+capThick-2} width={capW} height={2} rx={1} fill="rgba(0,0,0,0.38)" />
        </svg>
      </div>
    </div>
  )
}

// ── Idle analog clock ─────────────────────────────────────────────────────────
function AnalogClock({ totalSeconds, size = 260, accent = '#3b82f6' }: {
  totalSeconds: number; size?: number; accent?: string
}) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 10
  const TWO_PI = Math.PI * 2
  const secs  = totalSeconds % 60
  const mins  = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600) % 12
  const hand  = (a: number, l: number) => ({ x2: cx + Math.cos(a)*l, y2: cy + Math.sin(a)*l })
  const secH  = hand((secs/60)*TWO_PI - Math.PI/2, r*0.82)
  const minH  = hand(((mins+secs/60)/60)*TWO_PI - Math.PI/2, r*0.68)
  const hourH = hand(((hours+mins/60)/12)*TWO_PI - Math.PI/2, r*0.48)
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i/60)*TWO_PI - Math.PI/2, isH = i%5===0
    return { x1: cx+Math.cos(a)*(isH?r-10:r-6), y1: cy+Math.sin(a)*(isH?r-10:r-6), x2: cx+Math.cos(a)*r, y2: cy+Math.sin(a)*r, isH }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id="acglow">
          <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="rgba(15,30,53,0.85)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      {ticks.map((t,i)=>(
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isH?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.18)'}
          strokeWidth={t.isH?2.5:1} strokeLinecap="round"/>
      ))}
      {[{l:'12',a:-Math.PI/2},{l:'3',a:0},{l:'6',a:Math.PI/2},{l:'9',a:Math.PI}].map(({l,a})=>(
        <text key={l} x={cx+Math.cos(a)*(r-22)} y={cy+Math.sin(a)*(r-22)}
          textAnchor="middle" dominantBaseline="central" fontSize={size*0.072}
          fontWeight="700" fill="rgba(255,255,255,0.65)" fontFamily="inherit">{l}</text>
      ))}
      <line x1={cx} y1={cy} x2={hourH.x2} y2={hourH.y2} stroke="rgba(255,255,255,0.85)" strokeWidth={size*0.03} strokeLinecap="round"/>
      <line x1={cx} y1={cy} x2={minH.x2}  y2={minH.y2}  stroke="rgba(255,255,255,0.75)" strokeWidth={size*0.022} strokeLinecap="round"/>
      <line x1={cx} y1={cy} x2={secH.x2}  y2={secH.y2}  stroke={accent} strokeWidth={size*0.012} strokeLinecap="round" filter="url(#acglow)"/>
      <circle cx={cx} cy={cy} r={size*0.03} fill={accent} filter="url(#acglow)"/>
      <circle cx={cx} cy={cy} r={size*0.014} fill="#fff"/>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
type TimerTabProps = {
  userId: number
  projects: Project[]
  activeTimer: ActiveTimer | null
  onRefresh: () => void
  onTimerUpdate: () => void
  showNotification: (message: string, type: 'success' | 'error') => void
}

export default function TimerTab({
  userId,
  projects,
  activeTimer,
  onRefresh,
  onTimerUpdate,
  showNotification,
}: TimerTabProps) {
  const [selectedProject,  setSelectedProject]  = useState<number | ''>('')
  const [selectedContract, setSelectedContract] = useState<number | ''>('')
  const [description,      setDescription]      = useState('')
  const [contracts,        setContracts]         = useState<Contract[]>([])
  const [loading,          setLoading]           = useState(false)
  const [elapsedTime,      setElapsedTime]       = useState(0)
  const [wallSeconds,      setWallSeconds]       = useState(0)

  // LOCAL timer state — shows sand timer immediately on click, before API round-trip
  const [localRunning,    setLocalRunning]    = useState(false)
  const localStartMsRef = useRef<number>(0)

  const isRunning = localRunning || !!activeTimer

  // ── Wall clock (idle) ───────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setWallSeconds(n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Elapsed counter ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) { setElapsedTime(0); return }

    // Prefer server start time once available; fall back to local click time
    const startMs = activeTimer
      ? new Date(activeTimer.started_at).getTime()
      : localStartMsRef.current

    const update = () => setElapsedTime(Math.floor((Date.now() - startMs) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, activeTimer])

  // ── When activeTimer arrives from API, stop local running flag ──────────
  useEffect(() => {
    if (activeTimer) setLocalRunning(false)
  }, [activeTimer])

  // ── Contract fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedProject) {
      contractsApi
        .getAll(Number(selectedProject))
        .then(res => setContracts(res.data.contracts || []))
        .catch(err => console.error('Error fetching contracts:', err))
    } else {
      setContracts([])
      setSelectedContract('')
    }
  }, [selectedProject])

  // ── Helpers ─────────────────────────────────────────────────────────────
  const fmtElapsed = (s: number) => {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const fmtWall = (s: number) => {
    const h24 = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
    const ampm = h24>=12?'PM':'AM', h12 = h24%12||12
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')} ${ampm}`
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!selectedProject) { showNotification('Please select a project', 'error'); return }
    // Show sand timer immediately (local state)
    localStartMsRef.current = Date.now()
    setLocalRunning(true)
    setLoading(true)
    try {
      await timeEntriesApi.timer.start({
        employee_id:  userId,
        project_id:   Number(selectedProject),
        contract_id:  selectedContract ? Number(selectedContract) : null,
        description:  description || undefined,
      })
      showNotification('Timer started', 'success')
      onTimerUpdate()
      onRefresh()
    } catch (error: any) {
      setLocalRunning(false)   // revert on error
      showNotification(error.response?.data?.error || 'Failed to start timer', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    setLoading(true)
    try {
      await timeEntriesApi.timer.pause(userId)
      showNotification('Break started', 'success')
      onTimerUpdate()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to pause timer', 'error')
    } finally { setLoading(false) }
  }

  const handleResume = async () => {
    setLoading(true)
    try {
      await timeEntriesApi.timer.resume(userId)
      showNotification('Break ended', 'success')
      onTimerUpdate()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to resume timer', 'error')
    } finally { setLoading(false) }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await timeEntriesApi.timer.stop({ employee_id: userId, description: description || undefined })
      showNotification('Timer stopped and submitted for approval', 'success')
      setLocalRunning(false)
      setSelectedProject('')
      setSelectedContract('')
      setDescription('')
      onTimerUpdate()
      onRefresh()
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to stop timer', 'error')
    } finally { setLoading(false) }
  }

  // ── Styles ───────────────────────────────────────────────────────────────
  const clockPanel: React.CSSProperties = {
    background: 'linear-gradient(160deg, #080f1e 0%, #0d1e38 55%, #0f2347 100%)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 'var(--card-radius)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '1.25rem 1.5rem', gap: '1rem',
  }

  const formPanel: React.CSSProperties = {
    background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--card-radius)',
    padding: '1.25rem', display: 'flex', flexDirection: 'column',
    gap: '1rem',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 8,
    color: '#f0f6ff', padding: '10px 13px', fontSize: '0.875rem',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: 700,
    color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 6,
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', alignItems: 'stretch' }}>

      {/* LEFT: Clock / Sand timer */}
      <div style={clockPanel}>
        {isRunning ? (
          <>
            {/* Analog clock + Sand timer side by side */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <AnalogClock totalSeconds={wallSeconds} size={160} />
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500, letterSpacing: '0.04em' }}>Current Time</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <SandTimer elapsedSeconds={elapsedTime} />
                <div style={{ fontSize: '0.72rem', color: 'rgba(251,191,36,0.55)', fontWeight: 500, letterSpacing: '0.04em' }}>Elapsed</div>
              </div>
            </div>

            {/* Digital stopwatch */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2.2rem', fontWeight: 800, color: '#fde68a',
                fontFamily: 'monospace', letterSpacing: '-1px', lineHeight: 1,
                textShadow: '0 0 20px rgba(251,191,36,0.6)',
              }}>
                {fmtElapsed(elapsedTime)}
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span
                  className={activeTimer?.is_on_break ? 'timer-pulse-break' : 'timer-pulse-active'}
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: activeTimer?.is_on_break ? '#f59e0b' : '#10b981',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: activeTimer?.is_on_break ? '#fcd34d' : '#6ee7b7', fontWeight: 600 }}>
                  {localRunning && !activeTimer ? 'Starting…' : activeTimer?.is_on_break ? 'On Break' : 'Working'}
                </span>
              </div>
            </div>

            {/* Session info card */}
            {activeTimer && (
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', width: '100%', maxWidth: 340 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Session</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Project</span>
                    <span style={{ color: '#f0f6ff', fontWeight: 600 }}>{activeTimer.project_name}</span>
                  </div>
                  {activeTimer.contract_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>Contract</span>
                      <span style={{ color: '#f0f6ff', fontWeight: 600 }}>{activeTimer.contract_name}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Break Time</span>
                    <span style={{ color: '#fcd34d', fontWeight: 600 }}>{activeTimer.total_break_time_minutes} min</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <AnalogClock totalSeconds={wallSeconds} size={200} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f0f6ff', fontFamily: 'monospace', letterSpacing: '-0.5px', lineHeight: 1 }}>
                {fmtWall(wallSeconds)}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                Select a project to start tracking
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Controls */}
      <div style={formPanel}>
        {isRunning ? (
          <>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className={activeTimer?.is_on_break ? 'timer-pulse-break' : 'timer-pulse-active'}
                  style={{ width: 10, height: 10, borderRadius: '50%', background: activeTimer?.is_on_break ? '#f59e0b' : '#10b981', display: 'inline-block' }}
                />
                <span style={{ color: '#f0f6ff', fontWeight: 700, fontSize: '1rem' }}>
                  {localRunning && !activeTimer ? 'Starting…' : activeTimer?.is_on_break ? 'On Break' : 'Active'}
                </span>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Elapsed</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace', letterSpacing: '-0.5px', textShadow: '0 0 12px rgba(251,191,36,0.5)' }}>
                {fmtElapsed(elapsedTime)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
              {activeTimer && !activeTimer.is_on_break && (
                <button onClick={handlePause} disabled={loading}
                  style={{ padding: '0.9rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem' }}>
                  <Coffee size={18} /> Start Break
                </button>
              )}
              {activeTimer?.is_on_break && (
                <button onClick={handleResume} disabled={loading}
                  style={{ padding: '0.9rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem' }}>
                  <Play size={18} /> Resume Work
                </button>
              )}
              <button onClick={handleStop} disabled={loading || !activeTimer}
                style={{ padding: '0.9rem', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 8, cursor: activeTimer ? 'pointer' : 'not-allowed', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(239,68,68,0.3)', opacity: activeTimer ? 1 : 0.5 }}>
                <Square size={18} /> Stop &amp; Submit
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f6ff', marginBottom: 4 }}>Start New Timer</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Select a project to begin tracking</div>
            </div>

            <div>
              <label style={labelStyle}>Project <span style={{ color: '#f87171' }}>*</span></label>
              <select value={selectedProject}
                onChange={e => setSelectedProject(e.target.value ? Number(e.target.value) : '')}
                style={inputStyle} className="timer-panel-input">
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Contract <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(Optional)</span></label>
              <select value={selectedContract}
                onChange={e => setSelectedContract(e.target.value ? Number(e.target.value) : '')}
                disabled={!selectedProject}
                style={{ ...inputStyle, opacity: selectedProject ? 1 : 0.45 }} className="timer-panel-input">
                <option value="">No Contract</option>
                {contracts.map(c => <option key={c.contract_id} value={c.contract_id}>{c.contract_name}</option>)}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Description <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(Optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="What are you working on?"
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} className="timer-panel-input" />
            </div>

            <button onClick={handleStart} disabled={loading || !selectedProject}
              style={{
                marginTop: 'auto', padding: '0.9rem',
                background: selectedProject ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : 'rgba(255,255,255,0.1)',
                color: selectedProject ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none', borderRadius: 8,
                cursor: selectedProject ? 'pointer' : 'not-allowed',
                fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, fontSize: '0.95rem',
                boxShadow: selectedProject ? '0 4px 16px rgba(37,99,235,0.35)' : 'none',
                transition: 'all 0.2s',
              }}>
              <Play size={18} />
              {loading ? 'Starting…' : 'Start Timer'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
