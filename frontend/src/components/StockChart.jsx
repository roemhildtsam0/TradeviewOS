import { useMemo } from 'react'
import {
  AreaChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ComposedChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'

function formatX(value, period) {
  try {
    const d = parseISO(value)
    if (period === '1d') return format(d, 'h:mm a')
    if (period === '1y' || period === 'all') return format(d, 'MMM yy')
    return format(d, 'MMM d')
  } catch {
    return ''
  }
}

function CustomTooltip({ active, payload, label, period, color }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div className="chart-tooltip">
      <div style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
        {val != null
          ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
          : '—'}
      </div>
      <div style={{ color: 'var(--text-2)', fontSize: '0.76rem' }}>
        {formatX(label, period)}
      </div>
    </div>
  )
}

export default function StockChart({ data = [], period = '1mo', isPositive = true, height = 280, projection = null }) {
  const color = isPositive ? 'var(--green)' : 'var(--red)'
  const gradId = isPositive ? 'grad-green' : 'grad-red'
  const openPrice = data[0]?.close

  const chartData = useMemo(() => {
    if (!projection?.data?.length || !data.length) return data
    const last = data[data.length - 1]
    const bridge = { ...last, proj: last.close }
    const projPoints = projection.data.map(p => ({ time: p.time, proj: p.proj }))
    return [...data.slice(0, -1), bridge, ...projPoints]
  }, [data, projection])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0}  />
          </linearGradient>
          <linearGradient id="grad-proj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0}  />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

        <XAxis
          dataKey="time"
          tickFormatter={(v) => formatX(v, period)}
          tick={{ fill: 'var(--text-3)', fontSize: 11 }}
          tickLine={false} axisLine={false}
          interval="preserveStartEnd" minTickGap={50}
        />

        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: 'var(--text-3)', fontSize: 11 }}
          tickLine={false} axisLine={false}
          orientation="right" width={70}
          tickFormatter={(v) =>
            v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
          }
        />

        {openPrice && (
          <ReferenceLine y={openPrice} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
        )}

        <Tooltip content={<CustomTooltip period={period} color={color} />} />

        <Area
          type="monotone" dataKey="close"
          stroke={color} strokeWidth={2}
          fill={`url(#${gradId})`} dot={false}
          animationDuration={500} animationEasing="ease-out"
        />

        {projection && (
          <Area
            type="monotone" dataKey="proj"
            stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 4"
            fill="url(#grad-proj)" dot={false} animationDuration={0}
            connectNulls={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
