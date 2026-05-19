import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react'
import { api } from '../api/client'

function fmt(n, decimals = 2) {
  return n?.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) ?? '—'
}

function PnlBadge({ value, pct }) {
  const up = value >= 0
  const color = up ? 'var(--green)' : 'var(--red)'
  const bg = up ? 'var(--green-bg)' : 'var(--red-bg)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, borderRadius: 6,
      padding: '2px 8px', fontSize: '0.82rem', fontWeight: 600, color,
    }}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? '+' : ''}{fmt(value)} ({up ? '+' : ''}{fmt(pct)}%)
    </span>
  )
}

function AddPositionModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ ticker: '', shares: '', avg_cost: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.addPosition({
        ticker: form.ticker.toUpperCase().trim(),
        shares: parseFloat(form.shares),
        avg_cost: parseFloat(form.avg_cost),
      })
      onAdded()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add position.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div className="glass-card" style={{ padding: '1.75rem', width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '1rem' }}>Add position</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[
            { label: 'Ticker', key: 'ticker', placeholder: 'AAPL', type: 'text' },
            { label: 'Shares', key: 'shares', placeholder: '10', type: 'number' },
            { label: 'Avg cost per share ($)', key: 'avg_cost', placeholder: '150.00', type: 'number' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>
                {label}
              </label>
              <input
                type={type}
                step={type === 'number' ? 'any' : undefined}
                required
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)', borderRadius: 9,
                  fontSize: '0.88rem', color: 'var(--text-1)', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          ))}

          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid rgba(255,64,64,0.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Portfolio() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const fetchPortfolio = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data: res } = await api.getPortfolio()
      setData(res)
    } catch (e) {
      console.error('Portfolio fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPortfolio()
    const interval = setInterval(() => fetchPortfolio(true), 30000)
    return () => clearInterval(interval)
  }, [fetchPortfolio])

  const handleDelete = async (ticker) => {
    setDeleting(ticker)
    try {
      await api.deletePosition(ticker)
      await fetchPortfolio(true)
    } catch (e) {
      console.error('Delete position error:', e)
    } finally {
      setDeleting(null)
    }
  }

  const summary = data?.summary
  const positions = data?.positions ?? []

  return (
    <div className="page fade-up">
      {showModal && (
        <AddPositionModal onClose={() => setShowModal(false)} onAdded={() => fetchPortfolio(true)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em', color: 'var(--text-1)' }}>
          Portfolio
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => fetchPortfolio(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '6px 14px' }}
          >
            <Plus size={14} /> Add position
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Value', value: `$${fmt(summary.total_value)}` },
            { label: 'Total Cost', value: `$${fmt(summary.total_cost)}` },
            { label: 'Total Gain/Loss', value: <PnlBadge value={summary.total_gain} pct={summary.total_gain_pct} /> },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card" style={{ padding: '1.1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-1)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Positions table */}
      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Loading…</div>
      ) : positions.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)', marginBottom: '1rem' }}>No positions yet. Add your first holding to get started.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Add position
          </button>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Ticker', 'Shares', 'Avg Cost', 'Current', 'Market Value', 'Gain / Loss', ''].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-3)', fontWeight: 500, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.ticker} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 700 }}>
                      <Link to={`/stock/${pos.ticker}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }}>
                        {pos.ticker}
                      </Link>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: 'var(--text-2)' }}>{fmt(pos.shares, 4)}</td>
                    <td style={{ padding: '0.9rem 1rem', color: 'var(--text-2)' }}>${fmt(pos.avg_cost)}</td>
                    <td style={{ padding: '0.9rem 1rem', color: 'var(--text-1)', fontWeight: 600 }}>
                      {pos.current_price > 0 ? `$${fmt(pos.current_price)}` : '—'}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: 'var(--text-1)' }}>${fmt(pos.market_value)}</td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <PnlBadge value={pos.gain} pct={pos.gain_pct} />
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <button
                        onClick={() => handleDelete(pos.ticker)}
                        disabled={deleting === pos.ticker}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-3)', padding: 4, borderRadius: 6,
                          opacity: deleting === pos.ticker ? 0.4 : 1,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
