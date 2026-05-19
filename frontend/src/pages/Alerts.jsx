import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Trash2, X, CheckCircle, Clock } from 'lucide-react'
import { api } from '../api/client'

function AddAlertModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ ticker: '', target_price: '', condition: 'above' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.createAlert({
        ticker: form.ticker.toUpperCase().trim(),
        target_price: parseFloat(form.target_price),
        condition: form.condition,
      })
      onAdded()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create alert.')
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
      <div className="glass-card" style={{ padding: '1.75rem', width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '1rem' }}>New price alert</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>Ticker</label>
            <input
              type="text"
              required
              placeholder="AAPL"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              style={{
                width: '100%', padding: '9px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: 9,
                fontSize: '0.88rem', color: 'var(--text-1)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>Condition</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['above', 'below'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, condition: c })}
                  style={{
                    flex: 1, padding: '8px',
                    borderRadius: 8, border: '1px solid',
                    borderColor: form.condition === c ? (c === 'above' ? 'var(--green)' : 'var(--red)') : 'var(--border)',
                    background: form.condition === c ? (c === 'above' ? 'var(--green-bg)' : 'var(--red-bg)') : 'rgba(255,255,255,0.04)',
                    color: form.condition === c ? (c === 'above' ? 'var(--green)' : 'var(--red)') : 'var(--text-2)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 }}>
              Target price ($)
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="150.00"
              value={form.target_price}
              onChange={(e) => setForm({ ...form, target_price: e.target.value })}
              style={{
                width: '100%', padding: '9px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: 9,
                fontSize: '0.88rem', color: 'var(--text-1)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

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
              {loading ? 'Creating…' : 'Create alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [tab, setTab] = useState('active') // 'active' | 'triggered'

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.getAlerts()
      setAlerts(data)
    } catch (e) {
      console.error('Alerts fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await api.deleteAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const active = alerts.filter((a) => !a.triggered)
  const triggered = alerts.filter((a) => a.triggered)
  const displayed = tab === 'active' ? active : triggered

  return (
    <div className="page fade-up">
      {showModal && (
        <AddAlertModal
          onClose={() => setShowModal(false)}
          onAdded={() => fetchAlerts()}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={20} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em', color: 'var(--text-1)' }}>
            Price Alerts
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '6px 14px' }}
        >
          <Plus size={14} /> New alert
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: 'var(--surface)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ key: 'active', label: `Active (${active.length})` }, { key: 'triggered', label: `Triggered (${triggered.length})` }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === key ? 'var(--accent)' : 'transparent',
            color: tab === key ? '#fff' : 'var(--text-2)',
            fontWeight: tab === key ? 600 : 400, fontSize: '0.85rem', transition: 'all 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)', marginBottom: '1rem' }}>
            {tab === 'active' ? 'No active alerts. Create one to get notified when a stock hits your target.' : 'No triggered alerts yet.'}
          </p>
          {tab === 'active' && (
            <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New alert
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {displayed.map((alert) => (
            <div key={alert.id} className="glass-card" style={{
              padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {alert.triggered
                  ? <CheckCircle size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  : <Clock size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                }
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)' }}>{alert.ticker}</span>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: alert.condition === 'above' ? 'var(--green-bg)' : 'var(--red-bg)',
                      color: alert.condition === 'above' ? 'var(--green)' : 'var(--red)',
                    }}>
                      {alert.condition} ${alert.target_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 3 }}>
                    {alert.triggered && alert.triggered_at
                      ? `Triggered ${new Date(alert.triggered_at).toLocaleString()}`
                      : `Created ${new Date(alert.created_at).toLocaleDateString()}`
                    }
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(alert.id)}
                disabled={deleting === alert.id}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-3)', padding: 4, borderRadius: 6,
                  opacity: deleting === alert.id ? 0.4 : 1,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
