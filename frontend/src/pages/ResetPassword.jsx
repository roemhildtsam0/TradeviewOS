import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { api } from '../api/client'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: 'calc(100vh - 62px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-2)' }}>Invalid reset link. <Link to="/forgot-password" style={{ color: 'var(--accent)' }}>Request a new one</Link>.</p>
      </div>
    )
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
            <ShieldCheck size={24} color="#fff" />
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 6 }}>
            Set new password
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>Choose a strong password for your account.</p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          {done ? (
            <div style={{
              textAlign: 'center',
              background: 'var(--green-bg)', border: '1px solid rgba(0,200,5,0.25)',
              borderRadius: 10, padding: '1.25rem',
              color: 'var(--green)', fontSize: '0.9rem',
            }}>
              Password updated! Redirecting to login…
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(['New password', 'Confirm password']).map((label, i) => {
                const val = i === 0 ? password : confirm
                const setter = i === 0 ? setPassword : setConfirm
                return (
                  <div key={label}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>
                      {label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={val}
                        onChange={(e) => setter(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%', padding: '10px 40px 10px 14px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)', borderRadius: 10,
                          fontSize: '0.9rem', color: 'var(--text-1)', transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                      />
                      {i === 0 && (
                        <button type="button" onClick={() => setShowPw(!showPw)} style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0,
                        }}>
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

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
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
