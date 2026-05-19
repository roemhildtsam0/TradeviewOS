import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { api } from '../api/client'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounced = useDebounce(query, 250)
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.search(q)
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { search(debounced) }, [debounced, search])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (ticker) => {
    setQuery('')
    setResults([])
    setOpen(false)
    navigate(`/stock/${ticker}`)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: 340 }}>
      {/* Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '7px 12px',
        transition: 'border-color 0.2s',
      }}>
        <Search size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search stocks..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          style={{ flex: 1, fontSize: '0.85rem', background: 'transparent', color: 'var(--text-1)', border: 'none', outline: 'none' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={13} style={{ color: 'var(--text-3)' }} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim() && (results.length > 0 || loading || !loading) && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: '#12121e',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          zIndex: 999,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}>
          {loading && (
            <div style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: '0.82rem' }}>Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: '0.82rem' }}>Nothing found.</div>
          )}
          {results.map((stock) => (
            <button
              key={stock.ticker}
              onMouseDown={() => handleSelect(stock.ticker)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                color: 'var(--text-1)',
                minWidth: 48,
              }}>
                {stock.ticker}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stock.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
