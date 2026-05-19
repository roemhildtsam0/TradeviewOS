import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react'
import IndexCard from '../components/IndexCard'
import StockCard from '../components/StockCard'
import { SkeletonCard, SkeletonStockCard } from '../components/LoadingSkeleton'
import { api } from '../api/client'

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
  const [indices, setIndices] = useState(null)
  const [movers, setMovers] = useState(null)
  const [trending, setTrending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

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

  useEffect(() => {
    fetchAll()
    const interval = setInterval(() => fetchAll(true), 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchAll])

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
      <section>
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
    </div>
  )
}
