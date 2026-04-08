import { useEffect, useRef } from 'react'

const SERIES = [
  { label: 'Revenue',  unit: '$K', scale: 500, offset: 120, color: '#6366f1', base: 0.62, amp: 0.13, freq: 0.00055, phase: 0.00 },
  { label: 'Payroll',  unit: '$K', scale: 180, offset: 60,  color: '#8b5cf6', base: 0.42, amp: 0.09, freq: 0.00082, phase: 1.20 },
  { label: 'Projects', unit: '',   scale: 20,  offset: 5,   color: '#06b6d4', base: 0.30, amp: 0.16, freq: 0.00044, phase: 2.40 },
  { label: 'Assets',   unit: '$M', scale: 2.5, offset: 0.8, color: '#10b981', base: 0.70, amp: 0.06, freq: 0.00068, phase: 0.80 },
]

const WINDOW_MS = 16000

const sv = (s: typeof SERIES[0], ts: number) => {
  const w1 = Math.sin(ts * s.freq + s.phase) * s.amp
  const w2 = Math.sin(ts * s.freq * 2.73 + s.phase * 1.41) * s.amp * 0.35
  const w3 = Math.sin(ts * s.freq * 0.62 + s.phase * 2.18) * s.amp * 0.50
  return Math.max(0.05, Math.min(0.93, s.base + w1 + w2 + w3))
}

const fmt = (s: typeof SERIES[0], v: number) => {
  const n = v * s.scale + s.offset
  if (s.unit === '$M') return `$${n.toFixed(1)}M`
  if (s.unit === '$K') return `$${Math.round(n)}K`
  return String(Math.round(n))
}

export default function ERPBackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let W = 0, H = 0

    const init = () => {
      const parent = canvas.parentElement
      W = parent ? parent.offsetWidth  : 800
      H = parent ? parent.offsetHeight : 420
      const dpr = window.devicePixelRatio || 1
      canvas.width  = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const rgb = (hex: string) =>
      `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      const rad = Math.min(r, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + rad, y)
      ctx.lineTo(x + w - rad, y)
      ctx.arcTo(x + w, y, x + w, y + rad, rad)
      ctx.lineTo(x + w, y + h - rad)
      ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad)
      ctx.lineTo(x + rad, y + h)
      ctx.arcTo(x, y + h, x, y + h - rad, rad)
      ctx.lineTo(x, y + rad)
      ctx.arcTo(x, y, x + rad, y, rad)
      ctx.closePath()
    }

    const draw = (ts: number) => {
      ctx.clearRect(0, 0, W, H)

      // ── Background ────────────────────────────────────────
      ctx.fillStyle = '#f8faff'
      ctx.fillRect(0, 0, W, H)

      const pad    = 16
      const legH   = 32
      const volH   = 36
      const valW   = 56   // right margin for live value labels
      const chartX = pad
      const chartY = pad + legH
      const chartW = W - pad * 2 - valW
      const chartH = H - pad * 2 - legH - volH - 12

      // ── Background card ────────────────────────────────────
      ctx.shadowColor = 'rgba(99,102,241,0.08)'
      ctx.shadowBlur  = 20
      ctx.shadowOffsetY = 4
      rr(pad - 6, pad + legH - 8, W - pad * 2 + 12, chartH + volH + 28, 12)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

      // ── Legend ────────────────────────────────────────────
      let lx = pad
      const lfs = Math.max(9, Math.round(W * 0.021))
      SERIES.forEach(s => {
        const cv = sv(s, ts)
        const label = s.label
        const value = fmt(s, cv)

        ctx.font = `600 ${lfs}px Inter,system-ui,sans-serif`
        const labelW = ctx.measureText(label).width
        ctx.font = `700 ${lfs}px Inter,system-ui,sans-serif`
        const valueW = ctx.measureText(value).width

        // Dot
        ctx.beginPath()
        ctx.arc(lx + 5, pad + legH / 2, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = s.color
        ctx.fill()

        // Label
        ctx.font = `600 ${lfs}px Inter,system-ui,sans-serif`
        ctx.fillStyle = '#475569'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, lx + 14, pad + legH / 2)

        // Live value
        ctx.font = `700 ${lfs}px Inter,system-ui,sans-serif`
        ctx.fillStyle = s.color
        ctx.fillText(value, lx + 14 + labelW + 5, pad + legH / 2)

        lx += 14 + labelW + 5 + valueW + 20
      })

      // "LIVE" badge
      rr(W - pad - 36, pad + 6, 36, legH - 12, 6)
      ctx.fillStyle = 'rgba(16,185,129,0.12)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(W - pad - 28, pad + legH / 2, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#10b981'
      ctx.fill()
      ctx.font = `700 9px Inter,system-ui,sans-serif`
      ctx.fillStyle = '#059669'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('LIVE', W - pad - 22, pad + legH / 2)

      // ── Grid lines ────────────────────────────────────────
      const gridLevels = [0.2, 0.4, 0.6, 0.8]
      gridLevels.forEach(f => {
        const gy = chartY + chartH * (1 - f)
        ctx.beginPath()
        ctx.moveTo(chartX, gy)
        ctx.lineTo(chartX + chartW, gy)
        ctx.strokeStyle = 'rgba(99,102,241,0.07)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 5])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.font = `500 8.5px Inter,system-ui,sans-serif`
        ctx.fillStyle = '#c0c8dc'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${Math.round(f * 100)}`, chartX - 5, gy)
      })

      // Chart clip region
      ctx.save()
      rr(chartX, chartY, chartW, chartH, 6)
      ctx.clip()

      // ── Draw each series ──────────────────────────────────
      const STEPS = 100

      SERIES.forEach(s => {
        const c = rgb(s.color)
        const pts: [number, number][] = []

        for (let i = 0; i <= STEPS; i++) {
          const t  = ts - WINDOW_MS + (i / STEPS) * WINDOW_MS
          const v  = sv(s, t)
          const px = chartX + (i / STEPS) * chartW
          const py = chartY + chartH * (1 - v)
          pts.push([px, py])
        }

        // Area fill
        ctx.beginPath()
        ctx.moveTo(pts[0][0], chartY + chartH)
        pts.forEach(([px, py]) => ctx.lineTo(px, py))
        ctx.lineTo(pts[STEPS][0], chartY + chartH)
        ctx.closePath()
        const ag = ctx.createLinearGradient(0, chartY, 0, chartY + chartH)
        ag.addColorStop(0, `rgba(${c},0.18)`)
        ag.addColorStop(1, `rgba(${c},0.01)`)
        ctx.fillStyle = ag
        ctx.fill()

        // Line
        ctx.beginPath()
        ctx.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1]
          const [x1, y1] = pts[i]
          const mx = (x0 + x1) / 2
          ctx.bezierCurveTo(mx, y0, mx, y1, x1, y1)
        }
        ctx.strokeStyle = s.color
        ctx.lineWidth = 2
        ctx.lineJoin = 'round'
        ctx.stroke()
      })

      ctx.restore() // end clip

      // ── Live dots + value labels at right edge ─────────────
      SERIES.forEach(s => {
        const cv   = sv(s, ts)
        const dotY = chartY + chartH * (1 - cv)
        const c    = rgb(s.color)

        // Glow ring
        ctx.beginPath()
        ctx.arc(chartX + chartW, dotY, 7, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${c},0.18)`
        ctx.fill()

        // White ring
        ctx.beginPath()
        ctx.arc(chartX + chartW, dotY, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()

        // Colored dot
        ctx.beginPath()
        ctx.arc(chartX + chartW, dotY, 3, 0, Math.PI * 2)
        ctx.fillStyle = s.color
        ctx.fill()

        // Value label
        ctx.font = `700 9.5px Inter,system-ui,sans-serif`
        ctx.fillStyle = s.color
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(fmt(s, cv), chartX + chartW + 8, dotY)
      })

      // ── Volume bars ───────────────────────────────────────
      const volY  = chartY + chartH + 8
      const bGap  = 6
      const bW    = (chartW - bGap * (SERIES.length - 1)) / SERIES.length

      SERIES.forEach((s, i) => {
        const cv = sv(s, ts)
        const bh = Math.max(3, volH * cv * 0.88)
        const bx = chartX + i * (bW + bGap)
        const by = volY + volH - bh
        const c  = rgb(s.color)

        // Track
        rr(bx, volY, bW, volH, 4)
        ctx.fillStyle = `rgba(${c},0.07)`
        ctx.fill()

        // Bar
        const bg = ctx.createLinearGradient(bx, by, bx, volY + volH)
        bg.addColorStop(0, `rgba(${c},0.70)`)
        bg.addColorStop(1, `rgba(${c},0.25)`)
        rr(bx, by, bW, bh, 4)
        ctx.fillStyle = bg
        ctx.fill()

        // Label
        ctx.font = `600 9px Inter,system-ui,sans-serif`
        ctx.fillStyle = '#94a3b8'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(s.label, bx + bW / 2, volY + volH + 4)
      })

      animId = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(() => init())
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    init()
    animId = requestAnimationFrame(draw)

    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  )
}
