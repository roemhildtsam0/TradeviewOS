import { useEffect, useState } from 'react'
import { Newspaper, RefreshCw, Lock, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import NewsCard from '../components/NewsCard'
import { SkeletonNewsCard } from '../components/LoadingSkeleton'
import { api } from '../api/client'
import useStore from '../store/useStore'

const PAID_TIERS = ['intermediate', 'commercial']

const TICKERS = ['All', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'META', 'MSFT']

export default function News() {
  const { user } = useStore()
  const isPaid = PAID_TIERS.includes(user?.subscription_tier)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [tickerArticles, setTickerArticles] = useState({})
  const [sentimentFilter, setSentimentFilter] = useState('all')

  const fetchMarket = async () => {
    setLoading(true)
    try {
      const { data } = await api.marketNews()
      setArticles(data.articles || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchTicker = async (ticker) => {
    if (tickerArticles[ticker]) return
    setLoading(true)
    try {
      const { data } = await api.tickerNews(ticker)
      setTickerArticles((prev) => ({ ...prev, [ticker]: data.articles || [] }))
    } catch (e) {
      setTickerArticles((prev) => ({ ...prev, [ticker]: [] }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMarket() }, [])

  const handleFilter = (t) => {
    setFilter(t)
    if (t !== 'All') fetchTicker(t)
  }

  const baseArticles = filter === 'All' ? articles : (tickerArticles[filter] || [])
  const displayed = (isPaid && sentimentFilter !== 'all')
    ? baseArticles.filter(a => a.sentiment === sentimentFilter)
    : baseArticles

  return (
    <div className="page fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Newspaper size={20} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em' }}>
            Market News
          </h1>
        </div>
        <button
          onClick={filter === 'All' ? fetchMarket : () => { setTickerArticles((p) => ({ ...p, [filter]: undefined })); fetchTicker(filter) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.8rem' }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Sentiment upgrade banner for free users */}
      {!isPaid && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '9px 14px', marginBottom: '1rem',
          background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.25)', borderRadius: 10,
          fontSize: '0.82rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' }}>
            <Lock size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            Bullish / Bearish sentiment tags are available on Intermediate and Commercial plans.
          </div>
          <Link to="/pricing" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Zap size={11} /> Upgrade
            </button>
          </Link>
        </div>
      )}

      {/* Ticker filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {TICKERS.map((t) => (
          <button
            key={t}
            onClick={() => handleFilter(t)}
            style={{
              padding: '5px 14px', borderRadius: 20,
              border: `1px solid ${filter === t ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
              background: filter === t ? 'rgba(99,102,241,0.12)' : 'var(--surface)',
              color: filter === t ? '#818cf8' : 'var(--text-2)',
              fontWeight: filter === t ? 600 : 400,
              fontSize: '0.82rem', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sentiment filter pills — paid users only */}
      {isPaid && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', flexShrink: 0 }}>Sentiment:</span>
          {[
            { label: 'All',     value: 'all',     color: 'var(--accent)' },
            { label: 'Bullish', value: 'bullish',  color: 'var(--green)' },
            { label: 'Bearish', value: 'bearish',  color: 'var(--red)'   },
            { label: 'Neutral', value: 'neutral',  color: 'var(--text-2)'},
          ].map(s => {
            const active = sentimentFilter === s.value
            return (
              <button
                key={s.value}
                onClick={() => setSentimentFilter(s.value)}
                style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
                  fontWeight: active ? 700 : 400,
                  border: `1px solid ${active ? s.color : 'var(--border)'}`,
                  background: active ? `${s.color}22` : 'var(--surface)',
                  color: active ? s.color : 'var(--text-2)',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading
          ? [0,1,2,3,4,5,6,7].map((i) => <SkeletonNewsCard key={i} />)
          : displayed.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-2)' }}>
                No articles found.
              </div>
            )
            : displayed.map((a, i) => <NewsCard key={a.uuid || i} article={a} showSentiment={isPaid} />)
        }
      </div>
    </div>
  )
}
