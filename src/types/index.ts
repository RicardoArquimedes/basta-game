export type GameStatus =
  | 'lobby'
  | 'category_reveal'
  | 'player_turn'
  | 'turn_paused'    // admin pausó entre turnos
  | 'rotation_end'   // fin de rotación
  | 'game_over'

export type PlayerStatus = 'active' | 'eliminated'

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  isAdmin: boolean
  isGuest: boolean
  gamesPlayed: number
  totalScore: number
  createdAt: number
}

export interface Player {
  uid: string
  displayName: string
  score: number
  status: PlayerStatus
  joinedAt: number
}

export interface Category {
  id: string
  name: string
  isCustom: boolean
  addedBy: string
  isActive: boolean
  createdAt: number
}

export interface GameAnswer {
  uid: string
  playerName: string
  letter: string
  answer: string
  rotationNumber: number
  isValid: boolean | null
  noAnswer: boolean
  points: number
  submittedAt: number
}

export interface Game {
  id: string
  code: string
  adminId: string
  adminName: string
  status: GameStatus
  maxPlayers: number
  excludedLetters: string[]
  // Letras
  availableLetters: string[]   // letras que quedan por usar
  usedLetters: string[]        // letras ya usadas
  // Turno actual
  turnOrder: string[]
  turnIndex: number
  currentTurnUid: string
  letterTimerStartAt: number | null   // 5s para elegir letra
  answerTimerStartAt: number | null   // 10s para responder
  currentLetter: string | null
  // Rotación
  rotationNumber: number
  // Timers configurables (en segundos)
  letterSeconds: number
  answerSeconds: number
  // Pausa
  pauseNextTurn: boolean
  // Categoría
  currentCategory: string
  currentCategoryId: string
  createdAt: number
}
