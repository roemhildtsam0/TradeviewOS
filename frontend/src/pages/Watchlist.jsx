import { useEffect, useState, useCallback } from 'react'
import { Bookmark, Trash2, RefreshCw, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StockCard from '../components/StockCard'
import { SkeletonStockCard } from '../components/LoadingSkeleton'
import { api } from '../api/client'
import useStore from '../store/useStore'

export default function Watchlist() {
  const { watchlist, setWatchlist, removeFromWatchlist, user } = useStore()
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)
  const navigate = useNavigate()

  // Sync watchlist from server on mount
  const syncWatchlist = useCallback(async () => {
    try {
      const { data } = await api.getWatchlist()
      const tickers = data.map((item) => item.ticker)
      setWatchlist(tickers)
    } catch (e) {
      console.error(e)
    }
  }, [setWatchlist])

  const fetchQuotes = useCallback(async (tickers) => {
    if (!tickers.length) { setLoading(false); return }
    setLoading(true)
    const results = {}
    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const { data } = await api.quote(ticker)
          results[ticker] = data
        } catch {
          results[ticker] = { ticker, name: ticker, price: null, change_pct: 0 }
        }
      })
    )
    setQuotes(results)
    setLoading(false)
  }, [])

  useEffect(() => {
    syncWatchlist().then(() => {
      fetchQuotes(watchlist)
    })
  }, [])

  useEffect(() => {
    if (!loading) fetchQuotes(watchlist)
  }, [watchlist])

  const handleRemove = async (ticker) => {
    setRemoving(ticker)
    try {
      await api.removeWatch(ticker)
      removeFromWatchlist(ticker)
      setQuotes((prev) => {
        const updated = { ...prev }
        delete updated[ticker]
        return updated
      })
    } catch (e) {
      console.error(e)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="page fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bookmark size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em', color: 'var(--text-1)' }}>
              Watchlist
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginTop: 2 }}>
              {user?.username}'s tracked stocks
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchQuotes(watchlist)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.8rem' }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {watchlist.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <TrendingUp size={28} style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>No stocks yet</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Search for stocks and add them to your watchlist.
          </p>
          <button className="btn-primary" onClick={() => navigate('/')}>Browse Markets</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading
            ? [0,1,2,3,4].map((i) => <SkeletonStockCard key={i} />)
            : watchlist.map((ticker) => (
              <div
                key={ticker}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <div style={{ flex: 1 }}>
                  <StockCard data={quotes[ticker] || { ticker, name: '...', price: null, change_pct: 0 }} compact />
                </div>
                <button
                  onClick={() => handleRemove(ticker)}
                  disabled={removing === ticker}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                    color: 'var(--text-3)', transition: 'all 0.2s',
                    opacity: removing === ticker ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(255,64,64,0.3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
