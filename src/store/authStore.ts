import { create } from 'zustand'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../types'

interface AuthState {
  firebaseUser: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  setFirebaseUser: (u: User | null) => void
  setProfile: (p: UserProfile | null) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
}

export const useAuthStore = create<AuthState>(set => ({
  firebaseUser: null,
  profile: null,
  loading: true,
  error: null,
  setFirebaseUser: u => set({ firebaseUser: u }),
  setProfile: p => set({ profile: p }),
  setLoading: v => set({ loading: v }),
  setError: e => set({ error: e }),
}))
