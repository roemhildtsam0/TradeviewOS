import { TrendingUp, TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function IndexCard({ data }) {
  const navigate = useNavigate()
  const isUp = (data?.change_pct ?? 0) >= 0

  return (
    <div
      className="glass flex-1 p-4 cursor-pointer"
      style={{ minWidth: 180, borderRadius: 14 }}
      onClick={() => data?.ticker && navigate(`/stock/${data.ticker}`)}
    >
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: 'var(--text-2)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {data?.short ?? data?.ticker}
        </span>
        {isUp
          ? <TrendingUp size={14} style={{ color: 'var(--green)' }} />
          : <TrendingDown size={14} style={{ color: 'var(--red)' }} />
        }
      </div>

      <div style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
        {data?.price != null ? data.price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) : '—'}
      </div>

      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          className={isUp ? 'badge-green' : 'badge-red'}
        >
          {isUp ? '+' : ''}{data?.change_pct?.toFixed(2)}%
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>
          {isUp ? '+' : ''}{data?.change?.toFixed(2)}
        </span>
      </div>

      <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-3)' }}>
        {data?.name}
      </div>
    </div>
  )
}
