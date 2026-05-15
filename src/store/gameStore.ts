import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Game, Player } from '../types'

interface GameState {
  game: Game | null
  players: Player[]
  activeGameId: string | null   // persiste entre recargas
  setGame: (g: Game | null) => void
  setPlayers: (p: Player[]) => void
  reset: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      game: null,
      players: [],
      activeGameId: null,
      setGame: (g) => set({ game: g, activeGameId: g?.id ?? null }),
      setPlayers: (p) => set({ players: p }),
      reset: () => set({ game: null, players: [], activeGameId: null }),
    }),
    {
      name: 'basta-game',
      // Solo persistir el gameId, no el objeto completo (Firestore lo provee al reconectar)
      partialize: (s) => ({ activeGameId: s.activeGameId }),
    },
  ),
)
