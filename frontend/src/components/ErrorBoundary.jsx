import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: 'calc(100vh - 62px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}>
        <div className="glass-card" style={{ padding: '2.5rem', maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <AlertTriangle size={40} style={{ color: 'var(--red)', marginBottom: 16 }} />
          <h2 style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
          >
            Go home
          </button>
          {this.state.error && (
            <details style={{ marginTop: '1rem', textAlign: 'left' }}>
              <summary style={{ fontSize: '0.78rem', color: 'var(--text-3)', cursor: 'pointer' }}>
                Error details
              </summary>
              <pre style={{
                marginTop: 8, fontSize: '0.72rem', color: 'var(--text-3)',
                background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                padding: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap',
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
