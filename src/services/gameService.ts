import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, onSnapshot, query, orderBy, where, writeBatch,
  increment, arrayUnion,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Game, Player, GameAnswer } from '../types'
import { ALL_LETTERS } from '../constants'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Crear / Unirse ───────────────────────────────────────────────────────────

export async function createGame(adminId: string, adminName: string, maxPlayers: number): Promise<Game> {
  const code = generateCode()
  const data = {
    code, adminId, adminName,
    status: 'lobby',
    maxPlayers,
    excludedLetters: ['Ñ'],
    availableLetters: ALL_LETTERS.filter(l => l !== 'Ñ'),
    usedLetters: [],
    turnOrder: [], turnIndex: 0, currentTurnUid: '',
    letterTimerStartAt: null, answerTimerStartAt: null, currentLetter: null,
    rotationNumber: 0,
    letterSeconds: 5,
    answerSeconds: 10,
    pauseNextTurn: false,
    currentCategory: '', currentCategoryId: '',
    categoryNumber: 1,
    createdAt: Date.now(),
  }
  const ref = await addDoc(collection(db, 'games'), data)
  return { id: ref.id, ...data } as Game
}

export async function findGameByCode(code: string): Promise<Game | null> {
  const q = query(
    collection(db, 'games'),
    where('code', '==', code.toUpperCase()),
    where('status', '==', 'lobby'),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Game
}

export async function joinGame(gameId: string, uid: string, displayName: string) {
  const gameSnap = await getDoc(doc(db, 'games', gameId))
  const game = gameSnap.data() as Game
  if (game.adminId === uid) throw new Error('El admin no puede unirse como jugador')
  const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'))
  const realPlayers = playersSnap.docs.filter(d => d.id !== game.adminId)
  if (realPlayers.length >= game.maxPlayers) throw new Error('Partida llena')
  if (playersSnap.docs.some(d => d.id === game.adminId)) {
    await deleteDoc(doc(db, 'games', gameId, 'players', game.adminId))
  }
  await setDoc(doc(db, 'games', gameId, 'players', uid), {
    uid, displayName, score: 0, status: 'active', joinedAt: Date.now(),
  })
}

export async function leaveGame(gameId: string, uid: string) {
  await deleteDoc(doc(db, 'games', gameId, 'players', uid))
}

// ── Iniciar juego ────────────────────────────────────────────────────────────

export async function startGame(
  gameId: string,
  category: string,
  categoryId: string,
  activePlayers: Player[],
  excludedLetters: string[],
) {
  const order = shuffle(activePlayers.map(p => p.uid))
  const available = ALL_LETTERS.filter(l => !excludedLetters.includes(l))
  await updateDoc(doc(db, 'games', gameId), {
    status: 'category_reveal',
    currentCategory: category,
    currentCategoryId: categoryId,
    availableLetters: available,
    usedLetters: [],
    turnOrder: order,
    turnIndex: 0,
    currentTurnUid: order[0],
    letterTimerStartAt: null,
    answerTimerStartAt: null,
    currentLetter: null,
    rotationNumber: 1,
    pauseNextTurn: false,
  })
}

export async function beginTurns(gameId: string) {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'player_turn',
    letterTimerStartAt: Date.now(),
    answerTimerStartAt: null,
    currentLetter: null,
  })
}

// ── Turno del jugador ─────────────────────────────────────────────────────────

export async function playerSelectLetter(gameId: string, letter: string, available: string[]) {
  const newAvailable = available.filter(l => l !== letter)
  await updateDoc(doc(db, 'games', gameId), {
    currentLetter: letter,
    answerTimerStartAt: Date.now(),
    availableLetters: newAvailable,
    usedLetters: arrayUnion(letter),   // atómico, sin leer el doc
  })
}

export async function submitAnswer(
  gameId: string,
  game: Game,
  players: Player[],
  answer: string,
  noAnswer: boolean,
) {
  const { currentTurnUid, turnOrder, turnIndex, rotationNumber, availableLetters, turnOrder: order } = game
  const playerName = players.find(p => p.uid === currentTurnUid)?.displayName ?? ''

  // Guardar respuesta
  const answerKey = `${currentTurnUid}_r${rotationNumber}`
  await setDoc(doc(db, 'games', gameId, 'answers', answerKey), {
    uid: currentTurnUid,
    playerName,
    letter: game.currentLetter ?? '',
    answer: answer.trim(),
    rotationNumber,
    isValid: null,
    noAnswer,
    points: 0,
    submittedAt: Date.now(),
  })

  // Siguiente jugador activo en la rotación
  const activePlayers = players.filter(p => p.status === 'active')
  const activeUids = activePlayers.map(p => p.uid)

  let nextIndex = turnIndex + 1
  while (nextIndex < order.length && !activeUids.includes(order[nextIndex])) {
    nextIndex++
  }

  // ¿Terminó la rotación?
  if (nextIndex >= order.length) {
    await updateDoc(doc(db, 'games', gameId), {
      status: 'rotation_end',
      currentLetter: null,
      letterTimerStartAt: null,
      answerTimerStartAt: null,
      pauseNextTurn: false,
    })
    return
  }

  // ¿El admin pidió pausar antes del siguiente turno?
  const shouldPause = game.pauseNextTurn === true

  if (shouldPause) {
    await updateDoc(doc(db, 'games', gameId), {
      status: 'turn_paused',
      turnIndex: nextIndex,
      currentTurnUid: order[nextIndex],
      currentLetter: null,
      letterTimerStartAt: null,
      answerTimerStartAt: null,
      pauseNextTurn: false,
    })
    return
  }

  // Siguiente turno normal
  await updateDoc(doc(db, 'games', gameId), {
    turnIndex: nextIndex,
    currentTurnUid: order[nextIndex],
    currentLetter: null,
    letterTimerStartAt: Date.now(),
    answerTimerStartAt: null,
  })
}

// ── Entre rotaciones ──────────────────────────────────────────────────────────

export async function continueNextRotation(gameId: string, game: Game, players: Player[]) {
  const activePlayers = players.filter(p => p.status === 'active')

  // Calcular puntajes de la rotación que terminó
  await scoreRotation(gameId, game.rotationNumber, activePlayers)

  if (game.availableLetters.length === 0) {
    await updateDoc(doc(db, 'games', gameId), { status: 'category_done' })
    return
  }

  const activeUids = activePlayers.map(p => p.uid)
  const firstActive = game.turnOrder.find(uid => activeUids.includes(uid)) ?? activeUids[0]

  await updateDoc(doc(db, 'games', gameId), {
    status: 'player_turn',
    rotationNumber: game.rotationNumber + 1,
    turnIndex: 0,
    currentTurnUid: firstActive,
    currentLetter: null,
    letterTimerStartAt: Date.now(),
    answerTimerStartAt: null,
  })
}

async function scoreRotation(gameId: string, rotationNumber: number, activePlayers: Player[]) {
  const snap = await getDocs(collection(db, 'games', gameId, 'answers'))
  const rotationAnswers = snap.docs
    .map(d => d.data() as GameAnswer)
    .filter(a => a.rotationNumber === rotationNumber && !a.noAnswer && a.answer)

  const countMap: Record<string, number> = {}
  rotationAnswers.forEach(a => {
    const key = a.answer.toLowerCase().trim()
    countMap[key] = (countMap[key] ?? 0) + 1
  })

  const batch = writeBatch(db)
  for (const ans of rotationAnswers) {
    if (ans.isValid === false) continue
    const isUnique = countMap[ans.answer.toLowerCase().trim()] === 1
    const pts = isUnique ? 10 : 5
    const ansKey = `${ans.uid}_r${rotationNumber}`
    batch.update(doc(db, 'games', gameId, 'answers', ansKey), { points: pts })
    // increment() es atómico: evita sobreescribir con datos locales desactualizados
    batch.update(doc(db, 'games', gameId, 'players', ans.uid), {
      score: increment(pts),
    })
  }
  await batch.commit()
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function setPauseNextTurn(gameId: string, pause: boolean) {
  await updateDoc(doc(db, 'games', gameId), { pauseNextTurn: pause })
}

export async function resumeFromPause(gameId: string) {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'player_turn',
    letterTimerStartAt: Date.now(),
    answerTimerStartAt: null,
    currentLetter: null,
  })
}

export async function updateTimers(gameId: string, letterSeconds: number, answerSeconds: number) {
  await updateDoc(doc(db, 'games', gameId), { letterSeconds, answerSeconds })
}

export async function validateAnswer(gameId: string, answerId: string, isValid: boolean) {
  await updateDoc(doc(db, 'games', gameId, 'answers', answerId), { isValid })
}

export async function eliminatePlayer(gameId: string, uid: string) {
  await updateDoc(doc(db, 'games', gameId, 'players', uid), { status: 'eliminated' })
}

export async function addBonusPoints(gameId: string, uid: string, pts: number) {
  await updateDoc(doc(db, 'games', gameId, 'players', uid), { score: increment(pts) })
}

export async function endCategory(gameId: string, game: Game, players: Player[]) {
  await scoreRotation(gameId, game.rotationNumber, players.filter(p => p.status === 'active'))
  await updateDoc(doc(db, 'games', gameId), { status: 'category_done' })
}

export async function startNewCategory(
  gameId: string,
  category: string,
  categoryId: string,
  allPlayers: Player[],
  excludedLetters: string[],
  currentCategoryNumber: number,
) {
  const gameSnap = await getDoc(doc(db, 'games', gameId))
  const currentRotation = gameSnap.data()?.rotationNumber ?? 0

  const order = shuffle(allPlayers.map(p => p.uid))
  const available = ALL_LETTERS.filter(l => !excludedLetters.includes(l))

  const batch = writeBatch(db)
  for (const player of allPlayers) {
    batch.update(doc(db, 'games', gameId, 'players', player.uid), { status: 'active' })
  }
  batch.update(doc(db, 'games', gameId), {
    status: 'category_reveal',
    currentCategory: category,
    currentCategoryId: categoryId,
    categoryNumber: currentCategoryNumber + 1,
    availableLetters: available,
    usedLetters: [],
    turnOrder: order,
    turnIndex: 0,
    currentTurnUid: order[0],
    letterTimerStartAt: null,
    answerTimerStartAt: null,
    currentLetter: null,
    rotationNumber: currentRotation + 1,
    pauseNextTurn: false,
  })
  await batch.commit()
}

export async function undoEndCategory(gameId: string) {
  await updateDoc(doc(db, 'games', gameId), { status: 'rotation_end' })
}

export async function undoEndGame(gameId: string) {
  await updateDoc(doc(db, 'games', gameId), { status: 'category_done' })
}

export async function endGame(gameId: string, game: Game, players: Player[]) {
  await scoreRotation(gameId, game.rotationNumber, players.filter(p => p.status === 'active'))
  await updateDoc(doc(db, 'games', gameId), { status: 'game_over' })
}

export async function updateExcludedLetters(gameId: string, excluded: string[]) {
  await updateDoc(doc(db, 'games', gameId), {
    excludedLetters: excluded,
    availableLetters: ALL_LETTERS.filter(l => !excluded.includes(l)),
  })
}

// ── Suscripciones ─────────────────────────────────────────────────────────────

export function subscribeGame(gameId: string, cb: (g: Game) => void) {
  return onSnapshot(doc(db, 'games', gameId), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as Game)
  })
}

export function subscribePlayers(gameId: string, cb: (p: Player[]) => void) {
  return onSnapshot(
    query(collection(db, 'games', gameId, 'players'), orderBy('joinedAt', 'asc')),
    snap => cb(snap.docs.map(d => d.data() as Player)),
  )
}

export function subscribeAnswers(gameId: string, cb: (a: GameAnswer[], ids: string[]) => void) {
  return onSnapshot(
    collection(db, 'games', gameId, 'answers'),
    snap => cb(snap.docs.map(d => d.data() as GameAnswer), snap.docs.map(d => d.id)),
  )
}
