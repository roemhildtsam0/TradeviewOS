import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Activity, RefreshCw, Zap, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import IndexCard from '../components/IndexCard'
import StockCard from '../components/StockCard'
import { SkeletonCard, SkeletonStockCard } from '../components/LoadingSkeleton'
import { api } from '../api/client'
import useStore from '../store/useStore'

function MarketBadge({ open }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: open ? 'var(--green-bg)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${open ? 'rgba(0,200,5,0.25)' : 'var(--border)'}`,
      borderRadius: 8, padding: '3px 10px',
      fontSize: '0.75rem', fontWeight: 600,
      color: open ? 'var(--green)' : 'var(--text-2)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: open ? 'var(--green)' : 'var(--text-3)' }} />
      {open ? 'Market Open' : 'Market Closed'}
    </div>
  )
}

export default function Home() {
  const { user } = useStore()
  const navigate = useNavigate()
  const isCommercial = user?.subscription_tier === 'commercial'
  const isPaid = ['intermediate', 'commercial'].includes(user?.subscription_tier)

  const [indices, setIndices] = useState(null)
  const [movers, setMovers] = useState(null)
  const [trending, setTrending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [picks, setPicks] = useState(null)
  const [picksLoading, setPicksLoading] = useState(false)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [indRes, movRes, trendRes] = await Promise.all([
        api.indices(),
        api.movers(),
        api.trending(),
      ])
      setIndices(indRes.data)
      setMovers(movRes.data)
      setTrending(trendRes.data)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Home fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPicks = useCallback(async () => {
    setPicksLoading(true)
    try {
      const { data } = await api.aiPicks()
      setPicks(data.picks || [])
    } catch {
      setPicks([])
    } finally {
      setPicksLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(() => fetchAll(true), 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchAll])

  useEffect(() => {
    if (isCommercial) fetchPicks()
  }, [isCommercial, fetchPicks])

  return (
    <div className="page fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 6 }}>
            Markets
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {indices && <MarketBadge open={indices.market_open} />}
            {lastUpdated && (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchAll(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.8rem' }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Indices */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {loading
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} height={110} />)
            : indices?.indices?.length
              ? indices.indices.map((idx) => <IndexCard key={idx.ticker} data={idx} />)
              : <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Nothing found.</p>
          }
        </div>
      </section>

      {/* Biggest Movers */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <TrendingUp size={16} style={{ color: 'var(--green)' }} />
          <h2 className="section-title" style={{ marginBottom: 0 }}>Top Gainers</h2>
        </div>
        <div className="scroll-x">
          {loading
            ? [0,1,2,3,4,5].map((i) => <SkeletonStockCard key={i} />)
            : movers?.gainers?.length
              ? movers.gainers.map((s) => (
                  <div key={s.ticker} style={{ minWidth: 200 }}><StockCard data={s} /></div>
                ))
              : <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Nothing found.</p>
          }
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <TrendingDown size={16} style={{ color: 'var(--red)' }} />
          <h2 className="section-title" style={{ marginBottom: 0 }}>Top Losers</h2>
        </div>
        <div className="scroll-x">
          {loading
            ? [0,1,2,3,4,5].map((i) => <SkeletonStockCard key={i} />)
            : movers?.losers?.length
              ? movers.losers.map((s) => (
                  <div key={s.ticker} style={{ minWidth: 200 }}><StockCard data={s} /></div>
                ))
              : <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Nothing found.</p>
          }
        </div>
      </section>

      {/* Most Traded */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <Activity size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="section-title" style={{ marginBottom: 0 }}>Most Active</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {loading
            ? [0,1,2,3,4,5,6,7,8,9,10,11].map((i) => <SkeletonStockCard key={i} />)
            : trending?.trending?.length
              ? trending.trending.map((s) => <StockCard key={s.ticker} data={s} compact />)
              : <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Nothing found.</p>
          }
        </div>
      </section>

      {/* AI High Conviction Picks */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: '#f59e0b' }} />
            <h2 className="section-title" style={{ marginBottom: 0 }}>AI High Conviction Picks</h2>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
              Commercial
            </span>
          </div>
          {isCommercial && (
            <button
              onClick={fetchPicks}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.78rem' }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          )}
        </div>

        {!isCommercial ? (
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)', fontSize: '0.88rem' }}>
              <Lock size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>AI-powered high-confidence stock picks updated hourly — available on the <strong style={{ color: 'var(--text-1)' }}>Commercial</strong> plan.</span>
            </div>
            <Link to="/pricing" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <button className="btn-primary" style={{ padding: '7px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={12} /> Upgrade
              </button>
            </Link>
          </div>
        ) : picksLoading ? (
          <div className="scroll-x">
            {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ minWidth: 200, height: 110, borderRadius: 14 }} />)}
          </div>
        ) : !picks || picks.length === 0 ? (
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
            No high-conviction picks right now — check back later as the model updates hourly.
          </div>
        ) : (
          <div className="scroll-x">
            {picks.map(pick => (
              <div
                key={pick.ticker}
                onClick={() => navigate(`/stock/${pick.ticker}`)}
                className="glass-card"
                style={{ minWidth: 200, padding: '1rem', cursor: 'pointer', transition: 'border-color 0.2s', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>{pick.ticker}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                    color: pick.trend === 'bullish' ? 'var(--green)' : 'var(--red)',
                    background: pick.trend === 'bullish' ? 'rgba(0,200,5,0.1)' : 'rgba(255,64,64,0.1)',
                    border: `1px solid ${pick.trend === 'bullish' ? 'rgba(0,200,5,0.25)' : 'rgba(255,64,64,0.25)'}`,
                  }}>
                    {pick.trend === 'bullish' ? '↑ Bullish' : '↓ Bearish'}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pick.name}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Current</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)' }}>${pick.current_price.toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>30d target</div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: pick.target_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {pick.target_pct >= 0 ? '+' : ''}{pick.target_pct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
