import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Plus, Minus, TrendingUp, TrendingDown, Zap, Lock } from 'lucide-react'
import DrawableChart from '../components/DrawableChart'
import NewsCard from '../components/NewsCard'
import { SkeletonText } from '../components/LoadingSkeleton'
import { api } from '../api/client'
import useStore from '../store/useStore'

const PAID_TIERS = ['intermediate', 'commercial']


function StatBox({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function formatLarge(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

export default function StockDetail() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const { user, isWatched, addToWatchlist, removeFromWatchlist } = useStore()

  const [quote, setQuote] = useState(null)
  const [history, setHistory] = useState([])
  const [news, setNews]   = useState([])
  const [period, setPeriod] = useState('1mo')
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [watchLoading, setWatchLoading] = useState(false)
  const [error, setError] = useState('')
  const [projection, setProjection] = useState(null)

  const isPaid = PAID_TIERS.includes(user?.subscription_tier)

  const watched = isWatched(ticker?.toUpperCase())

  const fetchQuote = useCallback(async () => {
    try {
      const { data } = await api.quote(ticker)
      setQuote(data)
    } catch {
      setError('Stock not found')
    }
  }, [ticker])

  const fetchHistory = useCallback(async (p) => {
    setChartLoading(true)
    try {
      const { data } = await api.history(ticker, p)
      setHistory(data.data || [])
    } catch (e) {
      setHistory([])
    } finally {
      setChartLoading(false)
    }
  }, [ticker])

  const fetchProjection = useCallback(async (p) => {
    if (p === 'all') { setProjection(null); return }
    try {
      const { data } = await api.projection(ticker, p)
      setProjection(data)
    } catch {
      setProjection(null)
    }
  }, [ticker])

  const fetchNews = useCallback(async () => {
    try {
      const { data } = await api.tickerNews(ticker)
      setNews(data.articles || [])
    } catch {
      setNews([])
    }
  }, [ticker])

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([fetchQuote(), fetchHistory(period), fetchNews()])
      .finally(() => setLoading(false))
  }, [ticker])

  useEffect(() => {
    fetchHistory(period)
    fetchProjection(period)
  }, [period])

  // Refresh quote every 30s
  useEffect(() => {
    const t = setInterval(fetchQuote, 30000)
    return () => clearInterval(t)
  }, [fetchQuote])

  const handleWatch = async () => {
    if (!user) { navigate('/login'); return }
    setWatchLoading(true)
    try {
      if (watched) {
        await api.removeWatch(ticker)
        removeFromWatchlist(ticker.toUpperCase())
      } else {
        await api.addWatch(ticker)
        addToWatchlist(ticker.toUpperCase())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setWatchLoading(false)
    }
  }

  if (error) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: 'var(--text-2)', fontSize: '1rem' }}>{error}</p>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginTop: '1.5rem' }}>
          Go back
        </button>
      </div>
    )
  }

  const isUp = (quote?.change_pct ?? 0) >= 0

  return (
    <div className="page fade-up">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '1.5rem', padding: 0 }}
      >
        <ArrowLeft size={15} />
        Back
      </button>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SkeletonText width={80} height={14} />
              <SkeletonText width={200} height={24} />
              <SkeletonText width={120} height={40} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                {quote?.ticker}
              </div>
              <h1 style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-1)', marginBottom: 8, letterSpacing: '-0.02em' }}>
                {quote?.name}
              </h1>
              <div style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--text-1)', lineHeight: 1 }}>
                {quote?.price?.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <span className={isUp ? 'badge-green' : 'badge-red'} style={{ fontSize: '0.82rem', padding: '3px 10px' }}>
                  {isUp ? '+' : ''}{quote?.change_pct?.toFixed(2)}%
                </span>
                <span style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontSize: '0.9rem', fontWeight: 600 }}>
                  {isUp ? '+' : ''}{quote?.change?.toFixed(2)} today
                </span>
              </div>
            </>
          )}
        </div>

        {/* Watchlist button */}
        <button
          onClick={handleWatch}
          disabled={watchLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px',
            borderRadius: 10,
            border: `1px solid ${watched ? 'rgba(255,64,64,0.35)' : 'rgba(99,102,241,0.4)'}`,
            background: watched ? 'rgba(255,64,64,0.08)' : 'rgba(99,102,241,0.1)',
            color: watched ? 'var(--red)' : 'var(--accent)',
            fontWeight: 600, fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: watchLoading ? 0.7 : 1,
          }}
        >
          {watched ? <Minus size={14} /> : <Plus size={14} />}
          {watched ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </button>
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <DrawableChart
          data={history}
          period={period}
          onPeriodChange={setPeriod}
          isPositive={isUp}
          ticker={ticker?.toUpperCase()}
          loading={chartLoading}
          projection={projection}
        />

        {/* Projection card — paid users */}
        {isPaid && projection && period !== 'all' && (
          <div style={{
            marginTop: '1rem',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10,
            fontSize: '0.82rem',
          }}>
            <span style={{ color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
              AI Projection
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: projection.trend === 'bullish' ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              {projection.trend === 'bullish' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {projection.trend === 'bullish' ? 'Bullish' : 'Bearish'}
            </div>
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
              Target:{' '}
              <span style={{ color: projection.target_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                ${projection.target_price.toFixed(2)} ({projection.target_pct >= 0 ? '+' : ''}{projection.target_pct.toFixed(2)}%)
              </span>
            </span>
            <span style={{ color: 'var(--text-3)' }}>
              Confidence: <span style={{ color: 'var(--text-2)', fontWeight: 600, textTransform: 'capitalize' }}>{projection.confidence}</span>
            </span>
          </div>
        )}

        {/* Upgrade prompt — free users */}
        {!isPaid && period !== 'all' && (
          <div style={{
            marginTop: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'rgba(99,102,241,0.06)',
            border: '1px dashed rgba(99,102,241,0.25)',
            borderRadius: 10,
            fontSize: '0.82rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' }}>
              <Lock size={13} style={{ color: 'var(--accent)' }} />
              Price projection is available on Intermediate and Commercial plans.
            </div>
            <Link to="/pricing" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '5px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={12} /> Upgrade
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* AI Confidence Card */}
      {!loading && period !== 'all' && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)' }}>AI Confidence Analysis</span>
            {isPaid && projection && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700,
                padding: '2px 10px', borderRadius: 20,
                ...(projection.confidence === 'high'
                  ? { color: 'var(--green)', background: 'rgba(0,200,5,0.1)', border: '1px solid rgba(0,200,5,0.25)' }
                  : projection.confidence === 'medium'
                    ? { color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }
                    : { color: 'var(--text-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }),
              }}>
                {projection.confidence?.charAt(0).toUpperCase() + projection.confidence?.slice(1)} Confidence
              </span>
            )}
          </div>

          {isPaid ? (
            projection ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', color: projection.trend === 'bullish' ? 'var(--green)' : 'var(--red)' }}>
                  {projection.trend === 'bullish' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {projection.trend === 'bullish' ? 'Bullish Outlook' : 'Bearish Outlook'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                  30-day target:{' '}
                  <strong style={{ color: projection.target_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    ${projection.target_price.toFixed(2)} ({projection.target_pct >= 0 ? '+' : ''}{projection.target_pct.toFixed(2)}%)
                  </strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  {projection.trend === 'bullish'
                    ? `Consistent upward momentum with ${projection.confidence} confidence in continued gains.`
                    : `Sustained selling pressure with ${projection.confidence} confidence in further decline.`}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Analysis unavailable for this ticker.</p>
            )
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-2)' }}>
                <Lock size={13} style={{ color: 'var(--accent)' }} />
                AI confidence score and price target available on Intermediate and Commercial plans.
              </div>
              <Link to="/pricing" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <button className="btn-primary" style={{ padding: '5px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Zap size={11} /> Upgrade
                </button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
          Key Statistics
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1.25rem' }}>
          <StatBox label="Market Cap" value={formatLarge(quote?.market_cap)} />
          <StatBox label="Volume" value={quote?.volume ? quote.volume.toLocaleString() : '—'} />
          <StatBox label="P/E Ratio" value={quote?.pe_ratio ? quote.pe_ratio.toFixed(2) : '—'} />
          <StatBox label="52W High" value={quote?.high_52w ? `$${quote.high_52w.toFixed(2)}` : '—'} />
          <StatBox label="52W Low" value={quote?.low_52w ? `$${quote.low_52w.toFixed(2)}` : '—'} />
          <StatBox label="Day High" value={quote?.day_high ? `$${quote.day_high.toFixed(2)}` : '—'} />
          <StatBox label="Day Low" value={quote?.day_low ? `$${quote.day_low.toFixed(2)}` : '—'} />
          <StatBox label="Change" value={quote?.change != null ? `${quote.change >= 0 ? '+' : ''}$${quote.change.toFixed(2)}` : '—'} />
        </div>
      </div>

      {/* News */}
      {news.length > 0 && (
        <div>
          <h2 className="section-title" style={{ marginBottom: '1rem' }}>Recent News</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {news.map((a, i) => <NewsCard key={a.uuid || i} article={a} showSentiment={isPaid} />)}
          </div>
        </div>
      )}
    </div>
  )
}
