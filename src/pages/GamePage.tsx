import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import {
  subscribeGame, subscribePlayers, subscribeAnswers,
  startGame, beginTurns, playerSelectLetter, submitAnswer,
  continueNextRotation, validateAnswer, eliminatePlayer,
  endGame, updateExcludedLetters, setPauseNextTurn, resumeFromPause, updateTimers,
} from '../services/gameService'
import { getCategories } from '../services/categoryService'
import { recordGameStats } from '../services/authService'
import CategoryCard from '../components/game/CategoryCard'
import type { Category, GameAnswer } from '../types'
import { ALL_LETTERS } from '../constants'

// ── Timer component ────────────────────────────────────────────────────────────
function CountdownTimer({
  startAt, seconds, onExpire, className = '',
}: {
  startAt: number | null
  seconds: number
  onExpire?: () => void
  className?: string
}) {
  const [remaining, setRemaining] = useState(seconds)
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    setRemaining(seconds)
    if (!startAt) return
    const iv = setInterval(() => {
      const left = Math.max(0, seconds - Math.floor((Date.now() - startAt) / 1000))
      setRemaining(left)
      if (left === 0 && !firedRef.current) {
        firedRef.current = true
        clearInterval(iv)
        onExpire?.()
      }
    }, 200)
    return () => clearInterval(iv)
  }, [startAt, seconds])

  const pct = (remaining / seconds) * 100
  const urgent = remaining <= 3
  const barColor = urgent ? 'bg-red-500' : remaining <= Math.ceil(seconds / 2) ? 'bg-yellow-400' : 'bg-green-400'

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <span className={`text-4xl font-black tabular-nums ${urgent ? 'text-red-500 animate-pulse' : 'text-brand-700'}`}>
        {remaining}
      </span>
      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Letter grid ────────────────────────────────────────────────────────────────
function LetterButtons({
  available, onSelect, disabled,
}: {
  available: string[]
  onSelect: (l: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
      {ALL_LETTERS.map(l => {
        const isAvailable = available.includes(l)
        return (
          <button key={l} onClick={() => isAvailable && !disabled && onSelect(l)}
            disabled={!isAvailable || disabled}
            className={`aspect-square rounded-xl font-bold text-sm sm:text-base flex items-center justify-center transition-all
              ${isAvailable && !disabled
                ? 'bg-white border-2 border-gray-300 hover:border-brand-500 hover:bg-brand-50 active:scale-95 cursor-pointer'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
              }`}>
            {l}
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { game, players, setGame, setPlayers, reset } = useGameStore()

  const [allAnswers, setAllAnswers] = useState<GameAnswer[]>([])
  const [answerIds, setAnswerIds] = useState<string[]>([])
  const [answerText, setAnswerText] = useState('')
  const [letterHandled, setLetterHandled] = useState(false)
  const [answerHandled, setAnswerHandled] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCatId, setSelectedCatId] = useState('')
  const [showCatPicker, setShowCatPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Track which turn we've already handled to avoid double-submit
  const handledTurnKey = useRef('')

  const isAdmin = game?.adminId === profile?.uid
  const isMyTurn = !isAdmin && game?.currentTurnUid === profile?.uid
  const currentPlayer = players.find(p => p.uid === game?.currentTurnUid)
  const activePlayers = players.filter(p => p.status === 'active')
  const rotationAnswers = allAnswers.filter(a => a.rotationNumber === game?.rotationNumber)

  // ── Suscripciones ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !profile) return
    const unsubs = [
      subscribeGame(gameId, g => {
        setGame(g)
        if (g.status === 'game_over') {
          const me = players.find(p => p.uid === profile.uid)
          if (me) recordGameStats(profile.uid, me.score).catch(() => {})
        }
      }),
      subscribePlayers(gameId, setPlayers),
      subscribeAnswers(gameId, (a, ids) => { setAllAnswers(a); setAnswerIds(ids) }),
    ]
    return () => { unsubs.forEach(u => u()); reset() }
  }, [gameId, profile])

  // Reset per-turn flags when turn changes
  useEffect(() => {
    if (!game) return
    const key = `${game.currentTurnUid}_${game.rotationNumber}`
    if (key !== handledTurnKey.current) {
      handledTurnKey.current = key
      setLetterHandled(false)
      setAnswerHandled(false)
      setAnswerText('')
    }
  }, [game?.currentTurnUid, game?.rotationNumber])

  useEffect(() => {
    if (isMyTurn && game?.currentLetter) inputRef.current?.focus()
  }, [isMyTurn, game?.currentLetter])

  useEffect(() => {
    getCategories().then(cats => setCategories(cats.filter(c => c.isActive)))
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleLetterExpire = useCallback(async () => {
    if (!gameId || !game || !isMyTurn || letterHandled) return
    setLetterHandled(true)
    const random = game.availableLetters[Math.floor(Math.random() * game.availableLetters.length)]
    await playerSelectLetter(gameId, random, game.availableLetters)
  }, [gameId, game, isMyTurn, letterHandled])

  const handleAnswerExpire = useCallback(async () => {
    if (!gameId || !game || !isMyTurn || answerHandled) return
    setAnswerHandled(true)
    await submitAnswer(gameId, game, players, answerText, !answerText.trim())
  }, [gameId, game, isMyTurn, answerHandled, answerText, players])

  async function handleSelectLetter(letter: string) {
    if (!gameId || !game || !isMyTurn || game.currentLetter || letterHandled) return
    setLetterHandled(true)
    await playerSelectLetter(gameId, letter, game.availableLetters)
  }

  async function handleSubmitAnswer(e?: React.FormEvent) {
    e?.preventDefault()
    if (!gameId || !game || !isMyTurn || answerHandled || !game.currentLetter) return
    setAnswerHandled(true)
    await submitAnswer(gameId, game, players, answerText, !answerText.trim())
  }

  async function handleStartGame() {
    if (!gameId || !selectedCatId) return
    const cat = categories.find(c => c.id === selectedCatId)
    if (!cat) return
    await startGame(gameId, cat.name, cat.id, activePlayers, game!.excludedLetters)
    setShowCatPicker(false)
  }

  if (!game || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'lobby') {
    const realPlayers = players.filter(p => p.uid !== game.adminId)
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-5 text-white text-center">
          <p className="text-xs uppercase tracking-widest opacity-75 mb-1">Código de partida</p>
          <p className="text-4xl font-black tracking-widest">{game.code}</p>
          <p className="text-sm opacity-75 mt-1">{realPlayers.length}/{game.maxPlayers} jugadores</p>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <h3 className="font-bold text-brand-700">⚙️ Admin</h3>

            {/* Letras excluidas */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Letras excluidas (toca para activar/desactivar)</p>
              <div className="flex flex-wrap gap-1">
                {ALL_LETTERS.map(l => {
                  const excluded = game.excludedLetters.includes(l)
                  return (
                    <button key={l} onClick={async () => {
                      const next = excluded
                        ? game.excludedLetters.filter(x => x !== l)
                        : [...game.excludedLetters, l]
                      await updateExcludedLetters(gameId!, next)
                    }}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors
                        ${excluded ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-brand-100'}`}>
                      {l}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {game.availableLetters.length} letras disponibles para jugar
              </p>
            </div>

            {!showCatPicker ? (
              <button onClick={() => setShowCatPicker(true)} disabled={realPlayers.length < 1}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl">
                {realPlayers.length < 1 ? 'Esperando jugadores...' : '▶ Iniciar partida'}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600">Elige la categoría del juego:</p>
                <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="">— Selecciona —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setShowCatPicker(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-xl">Cancelar</button>
                  <button onClick={handleStartGame} disabled={!selectedCatId}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl">Confirmar</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase">Jugadores</p>
          {realPlayers.length === 0
            ? <p className="text-gray-400 text-sm text-center py-3">Aún no hay jugadores</p>
            : realPlayers.map((p, i) => (
              <div key={p.uid} className={`flex items-center gap-3 rounded-xl px-3 py-2 border border-gray-100
                ${p.uid === profile.uid ? 'ring-2 ring-brand-400' : ''}`}>
                <span className="text-xs text-gray-400 w-4">#{i + 1}</span>
                <span className="flex-1 font-semibold text-gray-800 truncate">
                  {p.displayName}
                  {p.uid === profile.uid && <span className="text-xs text-brand-400 ml-1">(tú)</span>}
                </span>
                {isAdmin && (
                  <button onClick={() => eliminatePlayer(gameId!, p.uid)}
                    className="text-xs text-red-400 hover:text-red-600">✕</button>
                )}
              </div>
            ))
          }
        </div>

        {!isAdmin && <p className="text-center text-gray-400 text-sm animate-pulse">Esperando al admin para iniciar...</p>}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY REVEAL
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'category_reveal') {
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <CategoryCard category={game.currentCategory} roundNumber={1} />
        <div className="text-center space-y-2">
          <p className="text-gray-500 text-sm">
            {game.availableLetters.length} letras · {activePlayers.length} jugadores
          </p>
          <p className="text-gray-400 text-xs">Orden: {game.turnOrder.map(uid => players.find(p => p.uid === uid)?.displayName).join(' → ')}</p>
        </div>
        {isAdmin && (
          <button onClick={() => beginTurns(gameId!)}
            className="bg-brand-600 hover:bg-brand-700 text-white font-black px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105 active:scale-95 shadow-lg">
            ▶ ¡Empezar!
          </button>
        )}
        {!isAdmin && <p className="text-gray-400 text-sm animate-pulse">El admin iniciará el juego...</p>}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PLAYER TURN
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'player_turn') {
    const usedCount = game.usedLetters.length
    const totalLetters = (game.availableLetters.length + game.usedLetters.length)

    return (
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {/* Header: categoría y progreso */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-75 uppercase tracking-wide">Categoría</p>
              <p className="font-black text-lg leading-tight">{game.currentCategory}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Rotación {game.rotationNumber}</p>
              <p className="font-black text-lg">{game.availableLetters.length} letras</p>
            </div>
          </div>
          {/* Barra de progreso de letras */}
          <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(usedCount / totalLetters) * 100}%` }} />
          </div>
        </div>

        {/* Turno actual */}
        <div className={`rounded-2xl px-4 py-3 text-center border-2
          ${isMyTurn ? 'bg-brand-50 border-brand-400' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`font-black text-lg ${isMyTurn ? 'text-brand-700' : 'text-gray-700'}`}>
            {isMyTurn ? '🎯 ¡Es TU turno!' : `⏳ Turno de ${currentPlayer?.displayName ?? '...'}`}
          </p>
        </div>

        {/* ── MI TURNO: elegir letra ── */}
        {isMyTurn && !game.currentLetter && (
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-700">Elige tu letra</p>
              <CountdownTimer
                startAt={game.letterTimerStartAt}
                seconds={game.letterSeconds ?? 5}
                onExpire={handleLetterExpire}
              />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
              ⚡ Si no eliges en {game.letterSeconds ?? 5}s, se asigna una letra al azar
            </p>
            <LetterButtons available={game.availableLetters} onSelect={handleSelectLetter} />
          </div>
        )}

        {/* ── MI TURNO: responder ── */}
        {isMyTurn && game.currentLetter && (
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Tu letra</p>
                <p className="text-5xl font-black text-brand-600 leading-none">{game.currentLetter}</p>
              </div>
              <CountdownTimer
                startAt={game.answerTimerStartAt}
                seconds={game.answerSeconds ?? 10}
                onExpire={handleAnswerExpire}
              />
            </div>
            <form onSubmit={handleSubmitAnswer} className="flex gap-2">
              <input ref={inputRef} value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                disabled={answerHandled}
                placeholder={`Empieza con "${game.currentLetter}"...`}
                className="flex-1 border-2 border-gray-300 focus:border-brand-500 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none disabled:opacity-50"
                autoComplete="off" />
              <button type="submit" disabled={answerHandled || !answerText.trim()}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold px-5 rounded-xl text-xl transition-colors">
                ✓
              </button>
            </form>
            {answerHandled && <p className="text-center text-green-600 font-bold text-sm">✓ Enviado — esperando a los demás</p>}
          </div>
        )}

        {/* ── TURNO DE OTRO: observar ── */}
        {!isMyTurn && (
          <div className="bg-white rounded-2xl shadow p-4 text-center space-y-3">
            {!game.currentLetter ? (
              <>
                <p className="text-gray-500 text-sm">
                  <span className="font-bold text-gray-800">{currentPlayer?.displayName}</span> está eligiendo letra...
                </p>
                <div className="text-4xl animate-bounce">🤔</div>
                <CountdownTimer startAt={game.letterTimerStartAt} seconds={game.letterSeconds ?? 5} />
              </>
            ) : (
              <>
                <p className="text-gray-500 text-sm">
                  <span className="font-bold text-gray-800">{currentPlayer?.displayName}</span> eligió
                </p>
                <p className="text-6xl font-black text-brand-600">{game.currentLetter}</p>
                <p className="text-xs text-gray-400">Escribiendo respuesta...</p>
                <CountdownTimer startAt={game.answerTimerStartAt} seconds={game.answerSeconds ?? 10} />
              </>
            )}
          </div>
        )}

        {/* Lista de jugadores con estado en esta rotación */}
        <div className="bg-white rounded-2xl shadow p-4 space-y-1.5">
          <p className="text-xs font-bold text-gray-400 uppercase">Esta rotación</p>
          {game.turnOrder.map((uid, i) => {
            const p = players.find(pl => pl.uid === uid)
            if (!p) return null
            const isCurrent = uid === game.currentTurnUid
            const hasDone = i < game.turnIndex
            const ans = rotationAnswers.find(a => a.uid === uid)
            return (
              <div key={uid} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm
                ${isCurrent ? 'bg-brand-50 border-2 border-brand-400' : 'border border-gray-100'}`}>
                <span>{isCurrent ? '▶' : hasDone ? (ans?.noAnswer ? '❌' : '✅') : '⏳'}</span>
                <span className={`flex-1 font-semibold truncate ${isCurrent ? 'text-brand-700' : 'text-gray-700'}`}>
                  {p.displayName}
                  {uid === profile?.uid && <span className="text-xs text-brand-400 ml-1">(tú)</span>}
                </span>
                {hasDone && ans && !ans.noAnswer && (
                  <span className="text-xs text-gray-400 font-medium italic">
                    [{ans.letter}] {ans.answer}
                  </span>
                )}
                <span className="font-bold text-brand-700 tabular-nums shrink-0">{p.score}pts</span>
                {isAdmin && p.status === 'active' && (
                  <button onClick={() => eliminatePlayer(gameId!, uid)}
                    className="text-xs text-red-400 hover:text-red-600 ml-1">✕</button>
                )}
              </div>
            )
          })}
        </div>

        {/* Panel admin: pausa + timers + saltar */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow p-4 space-y-3 border-2 border-yellow-200">
            <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">⚙️ Controles admin</p>

            {/* Timers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">⏱ Elegir letra</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateTimers(gameId!, Math.max(3, (game.letterSeconds ?? 5) - 1), game.answerSeconds ?? 10)}
                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">−</button>
                  <span className="flex-1 text-center font-black text-brand-700">{game.letterSeconds ?? 5}s</span>
                  <button onClick={() => updateTimers(gameId!, Math.min(30, (game.letterSeconds ?? 5) + 1), game.answerSeconds ?? 10)}
                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">+</button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">⏱ Responder</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateTimers(gameId!, game.letterSeconds ?? 5, Math.max(5, (game.answerSeconds ?? 10) - 1))}
                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">−</button>
                  <span className="flex-1 text-center font-black text-brand-700">{game.answerSeconds ?? 10}s</span>
                  <button onClick={() => updateTimers(gameId!, game.letterSeconds ?? 5, Math.min(60, (game.answerSeconds ?? 10) + 1))}
                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">+</button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Parar en siguiente turno */}
              <button onClick={() => setPauseNextTurn(gameId!, !game.pauseNextTurn)}
                className={`flex-1 font-bold py-2 rounded-xl text-sm transition-colors border-2
                  ${game.pauseNextTurn
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-red-500 border-red-300 hover:bg-red-50'}`}>
                {game.pauseNextTurn ? '🔴 Pausará al siguiente' : '⏸ Parar siguiente turno'}
              </button>
              {/* Saltar turno */}
              <button onClick={() => submitAnswer(gameId!, game, players, '', true)}
                className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 font-bold py-2 rounded-xl text-sm border border-yellow-200 transition-colors">
                ⏭ Saltar turno
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TURN PAUSED
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'turn_paused') {
    const nextPlayer = players.find(p => p.uid === game.currentTurnUid)
    const rotationAnswersSoFar = allAnswers.filter(a => a.rotationNumber === game.rotationNumber)

    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-4 text-white text-center">
          <p className="text-2xl font-black">⏸ Juego pausado</p>
          <p className="text-sm opacity-80 mt-1">El admin pausó antes del turno de <strong>{nextPlayer?.displayName}</strong></p>
        </div>

        {/* Respuestas hasta ahora en esta rotación */}
        <div className="bg-white rounded-2xl shadow p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Respuestas en esta rotación</p>
          {rotationAnswersSoFar.length === 0
            ? <p className="text-gray-400 text-sm text-center py-2">Aún no hay respuestas en esta rotación</p>
            : rotationAnswersSoFar.map((ans, i) => {
              const ansId = answerIds[allAnswers.findIndex(a => a.uid === ans.uid && a.rotationNumber === ans.rotationNumber)]
              return (
                <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 border
                  ${ans.noAnswer ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0
                    ${ans.noAnswer ? 'bg-red-200 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
                    {ans.noAnswer ? '—' : ans.letter}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{ans.playerName}</p>
                    <p className="font-bold text-gray-800 truncate">
                      {ans.noAnswer ? <em className="text-red-400">Sin respuesta</em> : ans.answer}
                    </p>
                  </div>
                  {!ans.noAnswer && isAdmin && ansId && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => validateAnswer(gameId!, ansId, true)}
                        className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors
                          ${ans.isValid === true ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-green-100'}`}>✓</button>
                      <button onClick={() => validateAnswer(gameId!, ansId, false)}
                        className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors
                          ${ans.isValid === false ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-red-100'}`}>✗</button>
                    </div>
                  )}
                  {isAdmin && (
                    <button onClick={() => eliminatePlayer(gameId!, ans.uid)}
                      className="text-xs text-red-400 hover:text-red-600 ml-1 shrink-0">✕ elim.</button>
                  )}
                </div>
              )
            })
          }
        </div>

        {/* Controles */}
        {isAdmin && (
          <div className="space-y-2">
            <button onClick={() => resumeFromPause(gameId!)}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl text-lg transition-all hover:scale-105 shadow-lg">
              ▶ Reanudar — turno de {nextPlayer?.displayName}
            </button>
            <button onClick={() => endGame(gameId!, game, players)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 rounded-xl text-sm transition-colors">
              🏁 Terminar juego aquí
            </button>
          </div>
        )}
        {!isAdmin && (
          <p className="text-center text-gray-400 text-sm animate-pulse">El admin está revisando...</p>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ROTATION END — admin puede pausar o continuar
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'rotation_end') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
    const noLettersLeft = game.availableLetters.length === 0

    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-gradient-to-br from-indigo-500 to-brand-700 rounded-2xl p-4 text-white text-center">
          <p className="text-xs uppercase tracking-widest opacity-80">Rotación {game.rotationNumber} completada</p>
          <h2 className="text-xl font-black mt-1">
            {noLettersLeft ? '🏁 ¡Letras agotadas!' : `Quedan ${game.availableLetters.length} letras`}
          </h2>
        </div>

        {/* Respuestas de la rotación */}
        <div className="bg-white rounded-2xl shadow p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Respuestas de esta rotación</p>
          {game.turnOrder.map(uid => {
            const ans = rotationAnswers.find(a => a.uid === uid)
            const ansIdx = allAnswers.findIndex(a => a.uid === uid && a.rotationNumber === game.rotationNumber)
            const ansId = ansIdx >= 0 ? answerIds[ansIdx] : null
            if (!ans) return null
            return (
              <div key={uid} className={`flex items-center gap-2 rounded-xl px-3 py-2 border
                ${ans.noAnswer ? 'border-red-200 bg-red-50' :
                  ans.isValid === false ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-base shrink-0
                  ${ans.noAnswer ? 'bg-red-200 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
                  {ans.noAnswer ? '—' : ans.letter}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{ans.playerName}</p>
                  <p className="font-bold text-gray-800 truncate">
                    {ans.noAnswer ? <em className="text-red-400">Sin respuesta</em> : ans.answer}
                  </p>
                </div>
                {!ans.noAnswer && isAdmin && ansId && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => validateAnswer(gameId!, ansId, true)}
                      className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors
                        ${ans.isValid === true ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-green-100'}`}>✓</button>
                    <button onClick={() => validateAnswer(gameId!, ansId, false)}
                      className={`w-7 h-7 rounded-lg text-sm font-bold transition-colors
                        ${ans.isValid === false ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-red-100'}`}>✗</button>
                  </div>
                )}
                {!ans.noAnswer && <span className="text-sm font-black text-brand-700 shrink-0">+{ans.points}pts</span>}
              </div>
            )
          })}
        </div>

        {/* Marcador */}
        <div className="bg-white rounded-2xl shadow p-4 space-y-1.5">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Marcador</p>
          {sortedPlayers.map((p, i) => (
            <div key={p.uid} className={`flex items-center gap-2 rounded-xl px-3 py-2
              ${i === 0 ? 'bg-yellow-50 border-2 border-yellow-300' : 'border border-gray-100'}`}>
              <span className="text-base">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <span className="flex-1 font-bold truncate">{p.displayName}</span>
              <span className="font-black text-brand-700 tabular-nums">{p.score}pts</span>
              {isAdmin && p.status === 'active' && (
                <button onClick={() => eliminatePlayer(gameId!, p.uid)}
                  className="text-xs text-red-400 hover:text-red-600 ml-1">✕</button>
              )}
            </div>
          ))}
        </div>

        {/* Controles admin */}
        {isAdmin && (
          <div className="space-y-2">
            {!noLettersLeft && (
              <button onClick={() => continueNextRotation(gameId!, game, players)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl text-lg transition-all hover:scale-105 shadow-lg">
                ▶ Continuar ({game.availableLetters.length} letras restantes)
              </button>
            )}
            <button onClick={() => endGame(gameId!, game, players)}
              className={`w-full font-bold py-3 rounded-xl transition-colors
                ${noLettersLeft
                  ? 'bg-brand-600 hover:bg-brand-700 text-white text-lg'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm'}`}>
              🏁 {noLettersLeft ? '¡Ver resultados finales!' : 'Terminar juego aquí'}
            </button>
          </div>
        )}

        {!isAdmin && (
          <p className="text-center text-gray-400 text-sm animate-pulse">
            {noLettersLeft ? '¡Se acabaron las letras! Esperando resultados...' : 'Esperando al admin...'}
          </p>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'game_over') {
    const sorted = [...players].sort((a, b) => b.score - a.score)
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="text-center bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-3xl font-black">¡Juego terminado!</h1>
          <p className="opacity-75 mt-1 text-sm">{game.rotationNumber} rotaciones · {game.usedLetters.length} letras usadas</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase mb-3">Clasificación final</p>
          {sorted.map((p, i) => (
            <div key={p.uid} className={`flex items-center gap-3 rounded-xl px-3 py-3
              ${i === 0 ? 'bg-yellow-50 border-2 border-yellow-300' : 'border border-gray-100'}`}>
              <span className="text-2xl">{i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <span className="flex-1 font-bold text-gray-800 truncate">{p.displayName}</span>
              <span className="font-black text-brand-700 tabular-nums text-lg">{p.score}pts</span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-colors">
          Volver al inicio
        </button>
      </div>
    )
  }

  return null
}
