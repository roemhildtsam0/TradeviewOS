import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Zap } from 'lucide-react'
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns'

const TIER_COLORS = {
  intermediate: 'var(--accent)',
  commercial: '#f59e0b',
}

function timeAgo(d) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }) } catch { return '' }
}

function timeUntil(d) {
  try {
    const diff = new Date(d) - Date.now()
    if (diff <= 0) return 'Resolving…'
    return `in ${formatDistanceToNowStrict(new Date(d))}`
  } catch { return '' }
}

export default function PredictionCard({ pred }) {
  const isUp   = pred.direction === 'up'
  const tierColor = TIER_COLORS[pred.author?.subscription_tier]

  const priceDiff = pred.resolved_price != null
    ? pred.resolved_price - pred.entry_price
    : null
  const pricePct = priceDiff != null && pred.entry_price
    ? (priceDiff / pred.entry_price * 100)
    : null

  return (
    <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #4f52d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700, color: '#fff',
        }}>
          {pred.author?.username?.[0]?.toUpperCase() ?? '?'}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-1)' }}>
              {pred.author?.username}
            </span>
            {tierColor && <Zap size={11} style={{ color: tierColor }} />}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{timeAgo(pred.created_at)}</div>
        </div>

        {/* Status badge */}
        {pred.resolved ? (
          pred.correct ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--green)', fontWeight: 700, fontSize: '0.78rem' }}>
              <CheckCircle size={14} /> Correct
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--red)', fontWeight: 700, fontSize: '0.78rem' }}>
              <XCircle size={14} /> Wrong
            </div>
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: '0.78rem' }}>
            <Clock size={13} /> {timeUntil(pred.resolves_at)}
          </div>
        )}
      </div>

      {/* Prediction body */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link
          to={`/stock/${pred.ticker}`}
          style={{
            fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em',
            color: 'var(--text-1)', textDecoration: 'none',
          }}
        >
          {pred.ticker}
        </Link>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontWeight: 700, fontSize: '0.88rem',
          color: isUp ? 'var(--green)' : 'var(--red)',
          background: isUp ? 'rgba(0,200,5,0.1)' : 'rgba(255,64,64,0.1)',
          border: `1px solid ${isUp ? 'rgba(0,200,5,0.25)' : 'rgba(255,64,64,0.25)'}`,
          borderRadius: 8, padding: '3px 10px',
        }}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isUp ? 'GOING UP' : 'GOING DOWN'}
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
          in <strong style={{ color: 'var(--text-1)' }}>{pred.timeframe_days}</strong> day{pred.timeframe_days !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Price row */}
      <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: '0.8rem', color: 'var(--text-3)' }}>
        <span>Entry: <strong style={{ color: 'var(--text-2)' }}>${pred.entry_price.toFixed(2)}</strong></span>
        {pred.resolved_price != null && (
          <span>
            Settled:{' '}
            <strong style={{ color: priceDiff >= 0 ? 'var(--green)' : 'var(--red)' }}>
              ${pred.resolved_price.toFixed(2)}{' '}
              ({pricePct >= 0 ? '+' : ''}{pricePct?.toFixed(2)}%)
            </strong>
          </span>
        )}
      </div>

      {/* Note */}
      {pred.note && (
        <p style={{
          marginTop: 12, fontSize: '0.85rem', color: 'var(--text-2)',
          lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          borderTop: '1px solid var(--border)', paddingTop: 10,
        }}>
          {pred.note}
        </p>
      )}

      {/* Screenshot */}
      {pred.image_url && (
        <div style={{ marginTop: pred.note ? 10 : 12 }}>
          <a href={pred.image_url} target="_blank" rel="noopener noreferrer">
            <img
              src={pred.image_url}
              alt="prediction chart"
              style={{
                maxWidth: '100%', maxHeight: 360,
                borderRadius: 10, objectFit: 'contain',
                border: '1px solid var(--border)',
                display: 'block',
              }}
            />
          </a>
        </div>
      )}
    </div>
  )
}
