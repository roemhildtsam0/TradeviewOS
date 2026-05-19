import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import StockDetail from './pages/StockDetail'
import News from './pages/News'
import Watchlist from './pages/Watchlist'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Pricing from './pages/Pricing'
import Account from './pages/Account'
import Community from './pages/Community'
import Portfolio from './pages/Portfolio'
import Alerts from './pages/Alerts'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main>
        <ErrorBoundary>
          <Routes>
            <Route path="/"                  element={<Home />} />
            <Route path="/stock/:ticker"     element={<StockDetail />} />
            <Route path="/news"              element={<News />} />
            <Route path="/pricing"           element={<Pricing />} />
            <Route path="/community"         element={<Community />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/signup"            element={<Signup />} />
            <Route path="/forgot-password"   element={<ForgotPassword />} />
            <Route path="/reset-password"    element={<ResetPassword />} />
            <Route path="/verify-email"      element={<VerifyEmail />} />
            <Route path="/terms"             element={<Terms />} />
            <Route path="/privacy"           element={<Privacy />} />
            <Route path="/watchlist"         element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
            <Route path="/portfolio"         element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
            <Route path="/alerts"            element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/account"           element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="*"                  element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
