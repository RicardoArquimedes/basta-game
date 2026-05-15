import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  Game, Player, GameAnswer,
  GameHistory, GameHistoryPlayer, GameHistoryCategory,
} from '../types'

// ── Guardar historial al terminar una partida ────────────────────────────────

export async function saveGameHistory(gameId: string, game: Game): Promise<void> {
  // Leer jugadores frescos de Firestore (ya tienen scores actualizados por scoreRotation)
  const playersSnap = await getDocs(collection(db, 'games', gameId, 'players'))
  const players = playersSnap.docs.map(d => d.data() as Player)

  // Leer todas las respuestas
  const answersSnap = await getDocs(collection(db, 'games', gameId, 'answers'))
  const answers = answersSnap.docs.map(d => d.data() as GameAnswer)

  // Obtener categorías únicas (ordenadas por primera respuesta en cada una)
  const catOrder: string[] = []
  for (const a of [...answers].sort((a, b) => a.submittedAt - b.submittedAt)) {
    if (a.categoryId && !catOrder.includes(a.categoryId)) catOrder.push(a.categoryId)
  }

  // Buscar nombres de cada categoría en la colección categories
  const categories: GameHistoryCategory[] = []
  for (let i = 0; i < catOrder.length; i++) {
    const catId = catOrder[i]
    const catSnap = await getDoc(doc(db, 'categories', catId))
    const name = catSnap.exists() ? (catSnap.data().name as string) : catId
    categories.push({ id: catId, name, number: i + 1 })
  }

  // Calcular puntos por categoría por jugador
  const historyPlayers: GameHistoryPlayer[] = players.map(p => {
    const categoryScores: Record<string, number> = {}
    catOrder.forEach(catId => {
      categoryScores[catId] = answers
        .filter(a => a.uid === p.uid && a.categoryId === catId)
        .reduce((s, a) => s + (a.points ?? 0), 0)
    })
    return {
      uid: p.uid,
      displayName: p.displayName,
      finalScore: p.score,
      cheatCount: p.cheatCount ?? 0,
      categoryScores,
    }
  })

  await addDoc(collection(db, 'gameHistory'), {
    gameId,
    code: game.code,
    adminId: game.adminId,
    adminName: game.adminName,
    endedAt: Date.now(),
    totalCategories: categories.length,
    categories,
    players: historyPlayers,
  })
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getGameHistories(adminId: string): Promise<GameHistory[]> {
  const q = query(
    collection(db, 'gameHistory'),
    where('adminId', '==', adminId),
    orderBy('endedAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as GameHistory)
}

export async function getAllGameHistories(): Promise<GameHistory[]> {
  const q = query(collection(db, 'gameHistory'), orderBy('endedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as GameHistory)
}

export async function updateGameHistoryPlayers(
  historyId: string,
  players: GameHistoryPlayer[],
): Promise<void> {
  await updateDoc(doc(db, 'gameHistory', historyId), { players })
}

export async function deleteGameHistory(historyId: string): Promise<void> {
  await deleteDoc(doc(db, 'gameHistory', historyId))
}
