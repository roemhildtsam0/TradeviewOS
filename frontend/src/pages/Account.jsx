import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, CreditCard, User, Zap } from 'lucide-react'
import { api } from '../api/client'
import useStore from '../store/useStore'

const TIER_LABELS = {
  beginner: { label: 'Beginner', color: 'var(--green)', price: '$10/mo' },
  intermediate: { label: 'Intermediate', color: 'var(--accent)', price: '$20/mo' },
  commercial: { label: 'Commercial', color: '#f59e0b', price: '$30/mo' },
}

export default function Account() {
  const { user, setUser } = useStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [portalLoading, setPortalLoading] = useState(false)
  const [refreshed, setRefreshed] = useState(false)

  const justSubscribed = searchParams.get('success') === 'true'

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    // After Stripe checkout redirect, refresh subscription status
    if (justSubscribed && !refreshed) {
      setRefreshed(true)
      api.me().then(({ data }) => setUser(data)).catch(() => {})
    }
  }, [user, justSubscribed, refreshed])

  const handleManage = async () => {
    setPortalLoading(true)
    try {
      const { data } = await api.createPortal()
      window.location.href = data.url
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not open billing portal.')
    } finally {
      setPortalLoading(false)
    }
  }

  if (!user) return null

  const tier = user.subscription_tier
  const tierInfo = TIER_LABELS[tier]

  return (
    <div className="page fade-up" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: '2rem' }}>
        Account
      </h1>

      {/* Success banner */}
      {justSubscribed && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem',
          color: 'var(--green)', fontSize: '0.88rem', fontWeight: 600,
        }}>
          <CheckCircle size={16} />
          Subscription activated! Welcome to Stockview {tierInfo?.label ?? ''}.
        </div>
      )}

      {/* Profile */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f52d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.95rem' }}>{user.username}</div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{user.email}</div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
          Subscription
        </h2>

        {tier ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={16} style={{ color: tierInfo.color }} />
                <span style={{ fontWeight: 700, color: tierInfo.color, fontSize: '1rem', textTransform: 'capitalize' }}>
                  {tierInfo.label}
                </span>
              </div>
              <span style={{ color: 'var(--text-2)', fontSize: '0.88rem', fontWeight: 600 }}>
                {tierInfo.price}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.85rem', opacity: portalLoading ? 0.7 : 1 }}
              >
                <CreditCard size={14} />
                {portalLoading ? 'Opening…' : 'Manage / Cancel'}
              </button>
              <Link to="/pricing" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ fontSize: '0.85rem' }}>
                  Change plan
                </button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              You don't have an active subscription.
            </p>
            <Link to="/pricing" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.85rem' }}>
                <Zap size={14} />
                View plans
              </button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
