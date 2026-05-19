import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { api } from '../api/client'
import useStore from '../store/useStore'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { user, setUser } = useStore()

  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token found.')
      return
    }
    api.verifyEmail(token)
      .then(() => {
        setStatus('success')
        // Refresh user data so email_verified updates in the UI
        if (user) {
          api.me().then(({ data }) => setUser(data)).catch(() => {})
        }
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.detail || 'Verification failed. The link may have expired.')
      })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: 'calc(100vh - 62px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div className="glass-card" style={{ padding: '2.5rem', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <Loader size={40} style={{ color: 'var(--accent)', marginBottom: 16, animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-2)' }}>Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={40} style={{ color: 'var(--green)', marginBottom: 16 }} />
            <h2 style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Email verified!</h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Your account is fully unlocked.
            </p>
            <Link to="/">
              <button className="btn-primary">Go to Markets</button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} style={{ color: 'var(--red)', marginBottom: 16 }} />
            <h2 style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Verification failed</h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{message}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {user && (
                <button
                  className="btn-primary"
                  onClick={() => api.resendVerification().then(() => alert('Sent! Check your inbox.')).catch(() => {})}
                >
                  Resend verification
                </button>
              )}
              <Link to="/">
                <button className="btn-ghost">Go home</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
