import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, TrendingUp, Check } from 'lucide-react'
import { api } from '../api/client'
import useStore from '../store/useStore'

function PasswordRule({ met, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: met ? 'var(--green)' : 'var(--text-3)' }}>
      <Check size={11} style={{ opacity: met ? 1 : 0.3 }} />
      {text}
    </div>
  )
}

export default function Signup() {
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useStore()
  const navigate = useNavigate()

  const pw = form.password
  const rules = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
  }
  const pwValid = Object.values(rules).every(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!pwValid) { setError('Password does not meet requirements'); return }
    setLoading(true)
    try {
      const { data } = await api.register(form)
      setAuth(data.user, data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: '0.9rem',
    color: 'var(--text-1)',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 62px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #6366f1, #4f52d9)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <TrendingUp size={24} color="#fff" />
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 6 }}>
            Create account
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>
            Start tracking the market today
          </p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Username</label>
              <input
                type="text" required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="johndoe"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {form.password && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <PasswordRule met={rules.length} text="At least 8 characters" />
                  <PasswordRule met={rules.upper} text="One uppercase letter" />
                  <PasswordRule met={rules.lower} text="One lowercase letter" />
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(255,64,64,0.3)', borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
              By signing up you agree to our{' '}
              <Link to="/terms" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</Link>.
            </p>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.84rem', color: 'var(--text-2)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
