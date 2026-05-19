import { useNavigate } from 'react-router-dom'
import { useRef, useEffect, useState } from 'react'

function formatPrice(p) {
  if (p == null) return '—'
  return p.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function formatMarketCap(v) {
  if (!v) return ''
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v}`
}

export default function StockCard({ data, compact = false }) {
  const navigate = useNavigate()
  const prevPrice = useRef(data?.price)
  const [flashClass, setFlashClass] = useState('')

  useEffect(() => {
    if (data?.price == null) return
    if (prevPrice.current !== data.price) {
      const dir = data.price > prevPrice.current ? 'price-flash-up' : 'price-flash-down'
      setFlashClass(dir)
      prevPrice.current = data.price
      const t = setTimeout(() => setFlashClass(''), 700)
      return () => clearTimeout(t)
    }
  }, [data?.price])

  const isUp = (data?.change_pct ?? 0) >= 0

  return (
    <div
      className={`glass fade-up ${flashClass}`}
      style={{ padding: compact ? '12px 14px' : '16px', borderRadius: 14, cursor: 'pointer', minWidth: compact ? 0 : 200 }}
      onClick={() => data?.ticker && navigate(`/stock/${data.ticker}`)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {/* Left: ticker + name */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: compact ? '0.9rem' : '1rem', color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            {data?.ticker}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
            {data?.name}
          </div>
        </div>

        {/* Right: price + change */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: compact ? '0.95rem' : '1.05rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            {formatPrice(data?.price)}
          </div>
          <span className={isUp ? 'badge-green' : 'badge-red'} style={{ fontSize: '0.73rem' }}>
            {isUp ? '+' : ''}{data?.change_pct?.toFixed(2)}%
          </span>
        </div>
      </div>

      {!compact && data?.market_cap > 0 && (
        <div style={{ marginTop: 10, fontSize: '0.73rem', color: 'var(--text-3)' }}>
          Mkt Cap {formatMarketCap(data.market_cap)}
        </div>
      )}
    </div>
  )
}
