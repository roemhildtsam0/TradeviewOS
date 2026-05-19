import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { api } from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 62px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #6366f1, #4f52d9)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <KeyRound size={24} color="#fff" />
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 6 }}>
            Forgot password?
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: 'var(--green-bg)', border: '1px solid rgba(0,200,5,0.25)',
                borderRadius: 10, padding: '1.25rem', marginBottom: '1.25rem',
                color: 'var(--green)', fontSize: '0.9rem',
              }}>
                Check your inbox — if that email is registered you'll receive a reset link within a few minutes.
              </div>
              <Link to="/login" style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)', borderRadius: 10,
                    fontSize: '0.9rem', color: 'var(--text-1)', transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {error && (
                <div style={{
                  background: 'var(--red-bg)', border: '1px solid rgba(255,64,64,0.3)',
                  borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', color: 'var(--red)',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', marginTop: 4, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.84rem', color: 'var(--text-2)' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
