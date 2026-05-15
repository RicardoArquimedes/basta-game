export type GameStatus =
  | 'lobby'
  | 'category_reveal'
  | 'player_turn'
  | 'turn_paused'      // admin pausó entre turnos
  | 'rotation_end'     // fin de rotación
  | 'category_done'    // todas las letras usadas en esta categoría
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
  cheatCount?: number   // veces que fue atrapado haciendo trampa
}

export interface Category {
  id: string
  name: string
  isCustom: boolean
  addedBy: string
  isActive: boolean
  excludeFromRandom: boolean
  createdAt: number
}

export interface GameAnswer {
  uid: string
  playerName: string
  letter: string
  answer: string
  rotationNumber: number
  categoryId: string
  isValid: boolean | null
  noAnswer: boolean
  points: number
  submittedAt: number
  secondsUsed?: number  // segundos que tardó en responder (0 = instantáneo, answerSeconds = agotó el tiempo)
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
  categoryNumber: number
  prevCategory?: string
  prevCategoryId?: string
  createdAt: number
}
