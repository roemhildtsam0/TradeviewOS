import { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, Minimize2 } from 'lucide-react'
import StockChart from './StockChart'

// Recharts plot-area insets (pixels) — must match StockChart's margin + axis sizes
const PI = { l: 0, r: 78, t: 8, b: 30 }

const PERIODS = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1mo' },
  { label: '1Y', value: '1y' },
  { label: 'ALL', value: 'all' },
]

const TOOLS = [
  { id: 'hline', label: '── H-Line' },
  { id: 'trend', label: '↗ Trend'  },
  { id: 'bosup', label: 'BOS ↑'   },
  { id: 'bosdn', label: 'BOS ↓'   },
  { id: 'eraser', label: '✕ Erase' },
]

function uid() { return Math.random().toString(36).slice(2) }

function yDomain(data) {
  if (!data.length) return [0, 1]
  const closes = data.map(d => d.close)
  const lo = Math.min(...closes), hi = Math.max(...closes)
  const pad = (hi - lo) * 0.05 || 1
  return [lo - pad, hi + pad]
}

function plotRect(canvas) {
  return {
    l: PI.l, t: PI.t,
    r: canvas.width  - PI.r,
    b: canvas.height - PI.b,
    w: canvas.width  - PI.l - PI.r,
    h: canvas.height - PI.t - PI.b,
  }
}

function canvasXY(e, canvas) {
  const br = canvas.getBoundingClientRect()
  return {
    cx: (e.clientX - br.left) * (canvas.width  / br.width),
    cy: (e.clientY - br.top)  * (canvas.height / br.height),
  }
}

function toNorm(cx, cy, canvas, domain) {
  const r = plotRect(canvas)
  const [lo, hi] = domain
  const xn = Math.max(0, Math.min(1, (cx - r.l) / r.w))
  const price = lo + (hi - lo) * (1 - (cy - r.t) / r.h)
  const yn = Math.max(0, Math.min(1, (price - lo) / (hi - lo)))
  return { xn, yn, price }
}

function fromNorm(xn, yn, r) {
  return { x: r.l + xn * r.w, y: r.t + r.h * (1 - yn) }
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const t = (dx || dy) ? Math.max(0, Math.min(1,
    ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

function paint(canvas, drawings, pending, domain) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const r = plotRect(canvas)
  const [lo, hi] = domain

  function drawHline(d, ghost) {
    const y = r.t + r.h * (1 - d.yn)
    const price = lo + (hi - lo) * d.yn
    ctx.save()
    ctx.strokeStyle = ghost ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)'
    ctx.lineWidth = ghost ? 1 : 1.5
    ctx.setLineDash([6, 5])
    ctx.beginPath(); ctx.moveTo(r.l, y); ctx.lineTo(r.r, y); ctx.stroke()
    ctx.setLineDash([])
    if (!ghost) {
      const lbl = '$' + price.toFixed(2)
      ctx.font = 'bold 11px system-ui,sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText(lbl, r.r - ctx.measureText(lbl).width - 5, y - 4)
    }
    ctx.restore()
  }

  function drawTrend(d, ghost) {
    const p1 = fromNorm(d.x1n, d.y1n, r)
    const p2 = fromNorm(d.x2n ?? d.x1n, d.y2n ?? d.y1n, r)
    ctx.save()
    ctx.strokeStyle = ghost ? 'rgba(129,140,248,0.45)' : '#818cf8'
    ctx.lineWidth = ghost ? 1 : 1.5
    ctx.setLineDash(ghost ? [4, 3] : [])
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
    ctx.restore()
  }

  function drawBos(d, ghost) {
    const y  = r.t + r.h * (1 - d.yn)
    const x1 = r.l + d.x1n * r.w
    const x2 = r.l + (d.x2n ?? d.x1n) * r.w
    const bull = d.type === 'bosup'
    const col  = bull ? '#00c805' : '#ff4040'
    ctx.save()
    ctx.strokeStyle = col; ctx.lineWidth = ghost ? 1 : 2
    ctx.setLineDash(ghost ? [4, 3] : [])
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
    ctx.setLineDash([])
    const mx = (x1 + x2) / 2
    ctx.fillStyle = col; ctx.beginPath()
    if (bull) { ctx.moveTo(mx, y - 7); ctx.lineTo(mx - 5, y); ctx.lineTo(mx + 5, y) }
    else       { ctx.moveTo(mx, y + 7); ctx.lineTo(mx - 5, y); ctx.lineTo(mx + 5, y) }
    ctx.fill()
    ctx.font = 'bold 11px system-ui,sans-serif'; ctx.fillStyle = col
    const lbl = bull ? 'BOS ↑' : 'BOS ↓'
    ctx.fillText(lbl, mx - ctx.measureText(lbl).width / 2, bull ? y - 11 : y + 21)
    ctx.restore()
  }

  for (const d of drawings) {
    if (d.type === 'hline')                    drawHline(d, false)
    else if (d.type === 'trend')               drawTrend(d, false)
    else if (d.type === 'bosup' || d.type === 'bosdn') drawBos(d, false)
  }
  if (pending) {
    if (pending.type === 'hline')                         drawHline(pending, true)
    else if (pending.type === 'trend')                    drawTrend(pending, true)
    else if (pending.type === 'bosup' || pending.type === 'bosdn') drawBos(pending, true)
  }
}

export default function DrawableChart({ data = [], period, onPeriodChange, isPositive, ticker, loading, projection = null }) {
  const [fs, setFs]           = useState(false)
  const [tool, setTool]       = useState(null)
  const [drawings, setDrawings] = useState([])
  const [pending, setPending]   = useState(null)

  const canvasRef = useRef(null)
  const ctnrRef   = useRef(null)
  // Refs to avoid stale closures in event handlers
  const dataRef     = useRef(data)
  const drawingsRef = useRef(drawings)
  const pendingRef  = useRef(pending)
  const toolRef     = useRef(tool)

  useEffect(() => { dataRef.current     = data },     [data])
  useEffect(() => { drawingsRef.current = drawings }, [drawings])
  useEffect(() => { pendingRef.current  = pending },  [pending])
  useEffect(() => { toolRef.current     = tool },     [tool])

  const H = fs ? Math.max(420, window.innerHeight - 180) : 280
  const storageKey = `sv_draw_${ticker}_${period}`

  useEffect(() => {
    try { setDrawings(JSON.parse(localStorage.getItem(storageKey) || '[]')) }
    catch { setDrawings([]) }
    setPending(null)
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(drawings))
  }, [drawings, storageKey])

  // Resize canvas + repaint whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current
    const ctnr   = ctnrRef.current
    if (!canvas || !ctnr) return
    canvas.width  = ctnr.offsetWidth
    canvas.height = H
    paint(canvas, drawings, pending, yDomain(data))
  })

  // Also repaint on container resize
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const canvas = canvasRef.current
      const ctnr   = ctnrRef.current
      if (!canvas || !ctnr) return
      canvas.width  = ctnr.offsetWidth
      canvas.height = H
      paint(canvas, drawingsRef.current, pendingRef.current, yDomain(dataRef.current))
    })
    if (ctnrRef.current) obs.observe(ctnrRef.current)
    return () => obs.disconnect()
  }, [H])

  function getPlotBounds(canvas) { return plotRect(canvas) }

  function findNear(cx, cy, canvas) {
    const r   = plotRect(canvas)
    const dom = yDomain(dataRef.current)
    const D   = 10
    const ds  = drawingsRef.current
    for (let i = ds.length - 1; i >= 0; i--) {
      const d = ds[i]
      if (d.type === 'hline') {
        if (Math.abs(cy - (r.t + r.h * (1 - d.yn))) < D) return i
      } else if (d.type === 'trend') {
        const p1 = fromNorm(d.x1n, d.y1n, r)
        const p2 = fromNorm(d.x2n, d.y2n, r)
        if (segDist(cx, cy, p1.x, p1.y, p2.x, p2.y) < D) return i
      } else if (d.type === 'bosup' || d.type === 'bosdn') {
        const y  = r.t + r.h * (1 - d.yn)
        const x1 = r.l + d.x1n * r.w, x2 = r.l + d.x2n * r.w
        if (Math.abs(cy - y) < D && cx >= Math.min(x1, x2) - D && cx <= Math.max(x1, x2) + D) return i
      }
    }
    return -1
  }

  function onMouseDown(e) {
    const canvas = canvasRef.current
    if (!canvas || !toolRef.current) return
    const { cx, cy } = canvasXY(e, canvas)
    const r = plotRect(canvas)
    if (cx < r.l || cx > r.r || cy < r.t || cy > r.b) return

    const dom = yDomain(dataRef.current)
    const t = toolRef.current

    if (t === 'eraser') {
      const idx = findNear(cx, cy, canvas)
      if (idx >= 0) setDrawings(prev => prev.filter((_, i) => i !== idx))
      return
    }

    const { xn, yn } = toNorm(cx, cy, canvas, dom)

    if (t === 'hline') {
      setDrawings(prev => [...prev, { id: uid(), type: 'hline', yn }])
      setPending(null)
      return
    }
    if (t === 'trend') {
      setPending({ type: 'trend', x1n: xn, y1n: yn, x2n: xn, y2n: yn })
      return
    }
    if (t === 'bosup' || t === 'bosdn') {
      const p = pendingRef.current
      if (!p) {
        setPending({ type: t, x1n: xn, yn, x2n: xn })
      } else {
        setDrawings(prev => [...prev, { id: uid(), ...p, x2n: xn }])
        setPending(null)
      }
    }
  }

  function onMouseMove(e) {
    const canvas = canvasRef.current
    if (!canvas) return
    const { cx, cy } = canvasXY(e, canvas)
    const dom = yDomain(dataRef.current)
    const t = toolRef.current
    const p = pendingRef.current

    if (t === 'hline') {
      const { yn } = toNorm(cx, cy, canvas, dom)
      const ghost = { type: 'hline', yn }
      pendingRef.current = ghost
      setPending(ghost)
      return
    }

    if (!p) return
    const { xn, yn } = toNorm(cx, cy, canvas, dom)
    if (p.type === 'trend') {
      const next = { ...p, x2n: xn, y2n: yn }
      pendingRef.current = next
      setPending(next)
    } else if (p.type === 'bosup' || p.type === 'bosdn') {
      const next = { ...p, x2n: xn }
      pendingRef.current = next
      setPending(next)
    }
  }

  function onMouseUp(e) {
    const canvas = canvasRef.current
    const p = pendingRef.current
    if (!canvas || !p || p.type !== 'trend') return
    const { cx, cy } = canvasXY(e, canvas)
    const dom = yDomain(dataRef.current)
    const { xn, yn } = toNorm(cx, cy, canvas, dom)
    if (Math.abs(xn - p.x1n) > 0.01) {
      setDrawings(prev => [...prev, { id: uid(), ...p, x2n: xn, y2n: yn }])
    }
    setPending(null)
  }

  function onMouseLeave() {
    const t = toolRef.current
    const p = pendingRef.current
    if (t === 'hline' && p?.type === 'hline') {
      setPending(null)
    }
  }

  function Toolbar({ style }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', ...style }}>
        {/* Period pills */}
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => onPeriodChange?.(p.value)} style={{
            padding: '4px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
            background: period === p.value ? (isPositive ? 'var(--green-bg)' : 'var(--red-bg)') : 'var(--surface)',
            color:      period === p.value ? (isPositive ? 'var(--green)'    : 'var(--red)')    : 'var(--text-2)',
          }}>
            {p.label}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />

        {/* Drawing tools */}
        {TOOLS.map(t => (
          <button key={t.id} title={t.label} onClick={() => setTool(tool === t.id ? null : t.id)} style={{
            padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
            fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.15s',
            border:      `1px solid ${tool === t.id ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
            background:  tool === t.id ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
            color:       tool === t.id ? '#818cf8' : 'var(--text-2)',
          }}>
            {t.label}
          </button>
        ))}

        {drawings.length > 0 && (
          <button onClick={() => { setDrawings([]); setPending(null) }} style={{
            padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
            fontSize: '0.74rem',
            border: '1px solid rgba(255,64,64,0.3)',
            background: 'rgba(255,64,64,0.08)',
            color: 'var(--red)',
          }}>
            Clear
          </button>
        )}

        <button onClick={() => { setFs(f => !f); setPending(null) }} title={fs ? 'Exit fullscreen' : 'Fullscreen'} style={{
          marginLeft: 'auto', padding: '5px 8px', borderRadius: 7, cursor: 'pointer',
          border: '1px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-2)', display: 'flex', alignItems: 'center',
        }}>
          {fs ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    )
  }

  const chartEl = (
    <div ref={ctnrRef} style={{ position: 'relative' }}>
      {loading
        ? <div className="skeleton" style={{ height: H, borderRadius: 10 }} />
        : <StockChart data={data} period={period} isPositive={isPositive} height={H} projection={projection} />
      }
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: H,
          cursor: tool ? 'crosshair' : 'default',
          pointerEvents: tool ? 'all' : 'none',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />
    </div>
  )

  if (fs) return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg-primary)', padding: '1.25rem 1.5rem',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em', color: 'var(--text-1)', flexShrink: 0 }}>
          {ticker}
        </span>
        <Toolbar style={{ flex: 1 }} />
      </div>
      {chartEl}
    </div>,
    document.body
  )

  return (
    <div>
      <Toolbar style={{ marginBottom: 10 }} />
      {chartEl}
    </div>
  )
}
