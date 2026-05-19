import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────
      user: null,
      token: null,

      setAuth: (user, token) => {
        localStorage.setItem('sv_token', token)
        localStorage.setItem('sv_user', JSON.stringify(user))
        set({ user, token })
      },

      setUser: (user) => {
        localStorage.setItem('sv_user', JSON.stringify(user))
        set({ user })
      },

      logout: () => {
        localStorage.removeItem('sv_token')
        localStorage.removeItem('sv_user')
        set({ user: null, token: null, watchlist: [] })
      },

      // ── Watchlist ──────────────────────────────────────────────────────
      watchlist: [], // array of ticker strings

      setWatchlist: (tickers) => set({ watchlist: tickers }),

      addToWatchlist: (ticker) =>
        set((s) => ({
          watchlist: s.watchlist.includes(ticker)
            ? s.watchlist
            : [...s.watchlist, ticker],
        })),

      removeFromWatchlist: (ticker) =>
        set((s) => ({ watchlist: s.watchlist.filter((t) => t !== ticker) })),

      isWatched: (ticker) => get().watchlist.includes(ticker),
    }),
    {
      name: 'stockview-store',
      partialize: (s) => ({ user: s.user, token: s.token, watchlist: s.watchlist }),
    }
  )
)

export default useStore
