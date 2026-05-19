import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Zap, Menu, X } from 'lucide-react'
import useStore from '../store/useStore'
import SearchBar from './SearchBar'

const TIER_COLORS = {
  beginner: 'var(--green)',
  intermediate: 'var(--accent)',
  commercial: '#f59e0b',
}

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/news', label: 'News' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/community', label: 'Community' },
]

export default function Navbar() {
  const { user, logout } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  const linkStyle = (to) => ({
    color: isActive(to) ? 'var(--text-1)' : 'var(--text-2)',
    fontWeight: isActive(to) ? 600 : 400,
    fontSize: '0.88rem',
    textDecoration: 'none',
    padding: '4px 2px',
    borderBottom: isActive(to) ? '2px solid var(--green)' : '2px solid transparent',
    transition: 'color 0.2s, border-color 0.2s',
    display: 'inline-block',
  })

  const mobileLinkStyle = (to) => ({
    color: isActive(to) ? 'var(--text-1)' : 'var(--text-2)',
    fontWeight: isActive(to) ? 600 : 400,
    fontSize: '0.95rem',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: 8,
    background: isActive(to) ? 'rgba(255,255,255,0.06)' : 'transparent',
    display: 'block',
  })

  const handleMobileNav = (to) => {
    setMobileOpen(false)
    navigate(to)
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(8, 8, 16, 0.85)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 1.25rem',
        height: 62,
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontWeight: 800,
            fontSize: '1.2rem',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #fff 30%, var(--green) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Stockview
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links-desktop" style={{ gap: '1.25rem', alignItems: 'center' }}>
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={linkStyle(to)}
              onMouseEnter={(e) => { if (!isActive(to)) e.target.style.color = 'var(--text-1)' }}
              onMouseLeave={(e) => { if (!isActive(to)) e.target.style.color = 'var(--text-2)' }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Desktop Search */}
        <div className="nav-search-desktop">
          <SearchBar />
        </div>

        {/* Auth (desktop) */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {user ? (
            <>
              <Link to="/account" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                {user.subscription_tier && (
                  <Zap size={12} style={{ color: TIER_COLORS[user.subscription_tier] }} />
                )}
                <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  {user.username}
                </span>
              </Link>
              <button
                onClick={() => { logout(); navigate('/') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                  color: 'var(--text-2)', fontSize: '0.82rem', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <LogOut size={13} />
                <span className="nav-links-desktop" style={{ display: 'inline' }}>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                  Log in
                </button>
              </Link>
              <Link to="/signup" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                  Sign up
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="hamburger-btn"
          onClick={() => setMobileOpen((o) => !o)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-1)', padding: 4, flexShrink: 0,
          }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="nav-mobile-menu">
          <div style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
            <SearchBar />
          </div>
          {NAV_LINKS.map(({ to, label }) => (
            <button
              key={to}
              onClick={() => handleMobileNav(to)}
              style={{ ...mobileLinkStyle(to), width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}
            >
              {label}
            </button>
          ))}
          {user ? (
            <button
              onClick={() => { logout(); setMobileOpen(false); navigate('/') }}
              style={{
                marginTop: 8, width: '100%', padding: '10px 12px',
                background: 'var(--red-bg)', border: '1px solid rgba(255,64,64,0.25)',
                borderRadius: 8, cursor: 'pointer', color: 'var(--red)',
                fontSize: '0.88rem', fontWeight: 500, textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <LogOut size={14} /> Sign out
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => handleMobileNav('/login')} className="btn-ghost" style={{ flex: 1 }}>Log in</button>
              <button onClick={() => handleMobileNav('/signup')} className="btn-primary" style={{ flex: 1 }}>Sign up</button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
