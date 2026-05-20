import axios from 'axios'

const client = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  timeout: 20000,
})

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sv_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sv_token')
      localStorage.removeItem('sv_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const api = {
  // Auth
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => client.post('/auth/reset-password', { token, new_password }),
  verifyEmail: (token) => client.get(`/auth/verify-email?token=${token}`),
  resendVerification: () => client.post('/auth/resend-verification'),

  // Stocks
  quote: (ticker) => client.get(`/stocks/quote/${ticker}`),
  history: (ticker, period = '1mo') => client.get(`/stocks/history/${ticker}?period=${period}`),
  indices: () => client.get('/stocks/indices'),
  movers: () => client.get('/stocks/movers'),
  trending: () => client.get('/stocks/trending'),
  search: (q) => client.get(`/stocks/search?q=${encodeURIComponent(q)}`),
  projection: (ticker, period = '1mo') => client.get(`/stocks/projection/${ticker}?period=${period}`),

  // News
  marketNews: () => client.get('/news/market'),
  tickerNews: (ticker) => client.get(`/news/${ticker}`),

  // Watchlist
  getWatchlist: () => client.get('/watchlist'),
  addWatch: (ticker) => client.post(`/watchlist/${ticker}`),
  removeWatch: (ticker) => client.delete(`/watchlist/${ticker}`),

  // Subscription
  subStatus: () => client.get('/subscription/status'),
  createCheckout: (plan) => client.post('/subscription/create-checkout', { plan }),
  createPortal: () => client.post('/subscription/portal'),

  // Social
  uploadImage: (formData) => client.post('/social/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getPosts: (params) => client.get('/social/posts', { params }),
  createPost: (data) => client.post('/social/posts', data),
  deletePost: (id) => client.delete(`/social/posts/${id}`),
  likePost: (id) => client.post(`/social/posts/${id}/like`),
  getPredictions: (params) => client.get('/social/predictions', { params }),
  createPrediction: (data) => client.post('/social/predictions', data),
  getLeaderboard: () => client.get('/social/leaderboard'),
  getUserStats: (username) => client.get(`/social/users/${username}/stats`),

  // Portfolio
  getPortfolio: () => client.get('/portfolio'),
  addPosition: (data) => client.post('/portfolio', data),
  updatePosition: (ticker, data) => client.put(`/portfolio/${ticker}`, data),
  deletePosition: (ticker) => client.delete(`/portfolio/${ticker}`),

  // Price alerts
  getAlerts: () => client.get('/alerts'),
  createAlert: (data) => client.post('/alerts', data),
  deleteAlert: (id) => client.delete(`/alerts/${id}`),
}

export default client
