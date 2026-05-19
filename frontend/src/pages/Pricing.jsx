import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap } from 'lucide-react'
import { api } from '../api/client'
import useStore from '../store/useStore'

const PLANS = [
  {
    key: 'beginner',
    name: 'Beginner',
    price: 0,
    free: true,
    description: 'Everything you need to get started — always free.',
    features: [
      'Real-time stock quotes',
      'Watchlist up to 25 stocks',
      'Basic price charts with drawing tools',
      'Market & ticker news feed',
      'Top movers & trending stocks',
    ],
  },
  {
    key: 'intermediate',
    name: 'Intermediate',
    price: 20,
    popular: true,
    description: 'For active traders who want an edge.',
    features: [
      'Everything in Beginner',
      'AI price projections on every chart',
      'Bullish / Bearish sentiment on news',
      'Unlimited watchlist',
      'Priority data refresh',
    ],
  },
  {
    key: 'commercial',
    name: 'Commercial',
    price: 30,
    description: 'Full power for professional traders.',
    features: [
      'Everything in Intermediate',
      'REST API access',
      'Bulk stock screener',
      'Multi-portfolio management',
      'Fastest data refresh (15s)',
      'Premium support',
    ],
  },
]

const TIER_ORDER = ['beginner', 'intermediate', 'commercial']

export default function Pricing() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  const currentTier = user?.subscription_tier
  const currentIdx = TIER_ORDER.indexOf(currentTier)

  const handleSubscribe = async (planKey) => {
    if (!user) { navigate('/login'); return }
    setLoading(planKey)
    try {
      const { data } = await api.createCheckout(planKey)
      window.location.href = data.url
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not start checkout. Is Stripe configured?')
    } finally {
      setLoading(null)
    }
  }

  const handleManage = async () => {
    setLoading('portal')
    try {
      const { data } = await api.createPortal()
      window.location.href = data.url
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not open billing portal.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="page fade-up" style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.05em', color: 'var(--text-1)', marginBottom: '0.75rem' }}>
          Choose your plan
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '1rem' }}>
          Unlock the tools you need to trade smarter.
        </p>
        {currentTier && (
          <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '6px 14px', fontSize: '0.82rem', color: 'var(--accent)' }}>
            <Zap size={13} />
            You're on the <strong style={{ textTransform: 'capitalize', marginLeft: 3 }}>{currentTier}</strong> plan
            <button
              onClick={handleManage}
              disabled={loading === 'portal'}
              style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '0.82rem', padding: 0, textDecoration: 'underline' }}
            >
              {loading === 'portal' ? 'Opening…' : 'Manage'}
            </button>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.key
          const planIdx = TIER_ORDER.indexOf(plan.key)
          const isUpgrade = currentIdx !== -1 && planIdx > currentIdx
          const isDowngrade = currentIdx !== -1 && planIdx < currentIdx

          // free tier: no Stripe needed
          const isFreeDefault = plan.free && !currentTier
          const effectiveCurrent = isCurrent || isFreeDefault

          let btnLabel = plan.free ? 'Sign up free' : 'Get started'
          if (!user && plan.free) btnLabel = 'Sign up free'
          else if (!user) btnLabel = 'Sign up to subscribe'
          else if (effectiveCurrent) btnLabel = 'Current plan'
          else if (isUpgrade) btnLabel = 'Upgrade'
          else if (isDowngrade) btnLabel = 'Downgrade'
          else if (currentTier) btnLabel = 'Switch plan'

          return (
            <div
              key={plan.key}
              style={{
                position: 'relative',
                background: plan.popular
                  ? 'linear-gradient(160deg, rgba(99,102,241,0.15) 0%, rgba(8,8,16,0.8) 100%)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${effectiveCurrent ? 'rgba(99,102,241,0.6)' : plan.popular ? 'rgba(99,102,241,0.35)' : 'var(--border)'}`,
                borderRadius: 16,
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #6366f1, #4f52d9)',
                  borderRadius: 20, padding: '3px 14px',
                  fontSize: '0.72rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </div>
              )}

              {effectiveCurrent && (
                <div style={{
                  position: 'absolute', top: -12, right: 20,
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 20, padding: '3px 12px',
                  fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)',
                }}>
                  ACTIVE
                </div>
              )}

              {/* Plan name + price */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', marginBottom: 4 }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: '2.2rem', letterSpacing: '-0.05em', color: 'var(--text-1)' }}>
                    {plan.free ? 'Free' : `$${plan.price}`}
                  </span>
                  {!plan.free && <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>/month</span>}
                </div>
                <p style={{ color: 'var(--text-2)', fontSize: '0.82rem', marginTop: 6 }}>
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.84rem', color: 'var(--text-2)' }}>
                    <Check size={14} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => {
                  if (effectiveCurrent) return
                  if (plan.free) { navigate(user ? '/' : '/signup'); return }
                  handleSubscribe(plan.key)
                }}
                disabled={loading === plan.key || effectiveCurrent}
                className={plan.popular || effectiveCurrent ? 'btn-primary' : 'btn-ghost'}
                style={{
                  width: '100%',
                  opacity: effectiveCurrent ? 0.6 : loading === plan.key ? 0.7 : 1,
                  cursor: effectiveCurrent ? 'default' : 'pointer',
                }}
              >
                {loading === plan.key ? 'Redirecting…' : btnLabel}
              </button>
            </div>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '2rem' }}>
        Cancel or change plans anytime via the billing portal. Payments processed securely by Stripe.
      </p>
    </div>
  )
}
