import { ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function timeAgo(published) {
  if (!published) return ''
  try {
    const date = typeof published === 'number'
      ? new Date(published * 1000)
      : new Date(published)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return ''
  }
}

const SENTIMENT_STYLE = {
  bullish: { label: '▲ Bullish', color: 'var(--green)', bg: 'rgba(0,200,5,0.1)', border: 'rgba(0,200,5,0.25)' },
  bearish: { label: '▼ Bearish', color: 'var(--red)',   bg: 'rgba(255,64,64,0.1)', border: 'rgba(255,64,64,0.25)' },
  neutral: { label: '◆ Neutral', color: 'var(--text-3)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' },
}

export default function NewsCard({ article, showSentiment = false }) {
  const { title, publisher, link, published_at, related_tickers, thumbnail, sentiment } = article

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="glass fade-up"
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '1rem',
        borderRadius: 14,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail */}
      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Headline */}
        <p style={{
          fontWeight: 600,
          fontSize: '0.9rem',
          color: 'var(--text-1)',
          lineHeight: 1.45,
          marginBottom: 6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {title}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 500 }}>
            {publisher}
          </span>
          <span style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>·</span>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>
            {timeAgo(published_at)}
          </span>

          {related_tickers?.slice(0, 3).map((t) => (
            <span key={t} style={{
              fontSize: '0.68rem',
              background: 'rgba(99,102,241,0.15)',
              color: '#818cf8',
              padding: '1px 6px',
              borderRadius: 5,
              fontWeight: 600,
            }}>
              {t}
            </span>
          ))}

          {showSentiment && sentiment && (() => {
            const s = SENTIMENT_STYLE[sentiment] || SENTIMENT_STYLE.neutral
            return (
              <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                color: s.color, background: s.bg,
                border: `1px solid ${s.border}`,
                padding: '1px 7px', borderRadius: 5,
              }}>
                {s.label}
              </span>
            )
          })()}

          <ExternalLink size={11} style={{ color: 'var(--text-3)', marginLeft: 'auto' }} />
        </div>
      </div>
    </a>
  )
}
