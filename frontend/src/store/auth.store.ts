import { create } from 'zustand'

interface AuthState {
  token: string | null
  isGuest: boolean
  setGuestToken: (token: string) => void
  setToken: (token: string) => void
  logout: () => void
}

function readToken(): { token: string | null; isGuest: boolean } {
  const guest = sessionStorage.getItem('access_token')
  if (guest) return { token: guest, isGuest: true }
  const real = localStorage.getItem('access_token')
  if (real) return { token: real, isGuest: false }
  return { token: null, isGuest: false }
}

const initial = readToken()

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  isGuest: initial.isGuest,

  // Guest token: stored in sessionStorage (clears when tab closes)
  setGuestToken: (token) => {
    sessionStorage.setItem('access_token', token)
    set({ token, isGuest: true })
  },

  // Real user token: stored in localStorage (persists)
  setToken: (token) => {
    localStorage.setItem('access_token', token)
    set({ token, isGuest: false })
  },

  logout: () => {
    sessionStorage.removeItem('access_token')
    localStorage.removeItem('access_token')
    set({ token: null, isGuest: false })
  },
}))
