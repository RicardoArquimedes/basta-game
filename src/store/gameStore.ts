import { create } from 'zustand'
import type { Game, Player } from '../types'

interface GameState {
  game: Game | null
  players: Player[]
  setGame: (g: Game | null) => void
  setPlayers: (p: Player[]) => void
  reset: () => void
}

export const useGameStore = create<GameState>(set => ({
  game: null,
  players: [],
  setGame: g => set({ game: g }),
  setPlayers: p => set({ players: p }),
  reset: () => set({ game: null, players: [] }),
}))
