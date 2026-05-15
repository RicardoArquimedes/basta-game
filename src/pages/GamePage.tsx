import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import {
  subscribeGame, subscribePlayers, subscribeAnswers,
  startGame, beginTurns, playerSelectLetter, submitAnswer,
  continueNextRotation, validateAnswer, eliminatePlayer,
  endGame, endCategory, startNewCategory, undoNewCategory, undoEndCategory, undoEndGame,
  updateExcludedLetters, setPauseNextTurn, resumeFromPause, updateTimers, addBonusPoints,
  adjustAnswerValidity, recordCheat, validateAnswerWithPoints,
} from '../services/gameService'
import { getCategories, addCategory } from '../services/categoryService'
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
  // Siempre apunta al callback más reciente, evita closures obsoletas
  const onExpireRef = useRef(onExpire)
  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

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
        onExpireRef.current?.()
      }
    }, 200)
    return () => clearInterval(iv)
  }, [startAt, seconds])

  const pct = (remaining / seconds) * 100
  const urgent = remaining <= 3
  const barColor = urgent ? 'bg-red-500' : remaining <= Math.ceil(seconds / 2) ? 'bg-yellow-400' : 'bg-green-400'

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <span className={`text-4xl font-black tabular-nums ${urgent ? 'text-red-500 animate-pulse' : ''}`} style={urgent ? {} : { color: '#FF5714' }}>
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
                ? 'border-2 active:scale-95 cursor-pointer'
                : 'cursor-not-allowed line-through'
              }`}
            style={isAvailable && !disabled
              ? { background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }
              : { background: 'var(--c-surface2)', color: 'var(--c-text3)' }}>
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
  const [caughtCheating, setCaughtCheating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cheatToast, setCheatToast] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [bonusInputs, setBonusInputs] = useState<Record<string, number>>({})
  const [showScoreTable, setShowScoreTable] = useState(false)
  const [scoreTableTab, setScoreTableTab] = useState<'scores' | 'speed' | 'cheats'>('scores')
  const [showCatReview, setShowCatReview] = useState(false)
  const [newCatExcluded, setNewCatExcluded] = useState<string[] | null>(null)  // null = usar las del juego
  const [showLetterPicker, setShowLetterPicker] = useState(false)
  const [showRandomPicker, setShowRandomPicker] = useState(false)
  const [randomPoolIds, setRandomPoolIds] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Track which turn we've already handled to avoid double-submit
  const handledTurnKey = useRef('')
  const cheatHandledRef = useRef(false)
  const prevPlayerStatusesRef = useRef<Record<string, string>>({})
  const bonusInitializedRef = useRef('')   // categoryId para el que ya se pre-seleccionó bonus

  const isAdmin = game?.adminId === profile?.uid
  const myPlayer = players.find(p => p.uid === profile?.uid)
  const isEliminated = myPlayer?.status === 'eliminated'
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

  // Reset cheat state when a new category starts so the player can participate again
  useEffect(() => {
    if (game?.currentCategoryId) {
      setCaughtCheating(false)
      cheatHandledRef.current = false
    }
  }, [game?.currentCategoryId])

  // Auto-inicializar bonus de 10 pts para el ganador de la categoría al entrar a category_done
  useEffect(() => {
    if (game?.status !== 'category_done' || !isAdmin) return
    const catId = game.currentCategoryId
    if (bonusInitializedRef.current === catId) return   // ya inicializado para esta categoría
    bonusInitializedRef.current = catId
    const catAns = allAnswers.filter(a => a.categoryId === catId)
    if (catAns.length === 0) return
    const scores = players.map(p => ({
      uid: p.uid,
      pts: catAns.filter(a => a.uid === p.uid).reduce((s, a) => s + (a.points ?? 0), 0),
    })).sort((a, b) => b.pts - a.pts)
    const winner = scores[0]
    if (winner && winner.pts > 0) {
      setBonusInputs(prev => ({ ...prev, [winner.uid]: 10 }))
    }
  }, [game?.status, game?.currentCategoryId, allAnswers.length, isAdmin, players])

  // Detectar trampa de otros jugadores y mostrar toast a los demás
  useEffect(() => {
    players.forEach(player => {
      const prev = prevPlayerStatusesRef.current[player.uid]
      if (
        prev === 'active' &&
        player.status === 'eliminated' &&
        player.uid !== profile?.uid &&
        game?.status === 'player_turn'
      ) {
        setCheatToast(player.displayName)
        const t = setTimeout(() => setCheatToast(null), 15000)
        return () => clearTimeout(t)
      }
    })
    const snapshot: Record<string, string> = {}
    players.forEach(p => { snapshot[p.uid] = p.status })
    prevPlayerStatusesRef.current = snapshot
  }, [players])

  // ── Anti-trampa: detectar si el jugador sale durante la categoría ─────────────
  useEffect(() => {
    const myPlayer = players.find(p => p.uid === profile?.uid)
    const isActivePlayer = !isAdmin && myPlayer?.status === 'active'
    // Vigilar durante toda la categoría: mientras hay turnos activos o pausados
    const isCategoryLive = game?.status === 'player_turn' || game?.status === 'turn_paused'

    if (!isActivePlayer || !isCategoryLive || caughtCheating) return

    cheatHandledRef.current = false

    async function handleCheat() {
      if (cheatHandledRef.current) return
      cheatHandledRef.current = true
      setCaughtCheating(true)
      if (gameId && profile) {
        await recordCheat(gameId, profile.uid)
        await addBonusPoints(gameId, profile.uid, -10)
      }
    }

    let blurTimer: ReturnType<typeof setTimeout>

    function onVisibilityChange() {
      if (document.hidden) handleCheat()
    }
    function onBlur() {
      blurTimer = setTimeout(() => handleCheat(), 800)
    }
    function onFocus() {
      clearTimeout(blurTimer)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    return () => {
      clearTimeout(blurTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [isAdmin, players, game?.status, caughtCheating, gameId, profile])

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

  function handleOpenRandomPicker() {
    // Pre-marcar las categorías activas no excluidas del sorteo
    const defaultIds = categories.filter(c => !c.excludeFromRandom).map(c => c.id)
    setRandomPoolIds(defaultIds)
    setShowRandomPicker(true)
  }

  function handlePickRandom() {
    const pool = categories.filter(c => randomPoolIds.includes(c.id))
    if (pool.length === 0) return
    const random = pool[Math.floor(Math.random() * pool.length)]
    setSelectedCatId(random.id)
    setShowRandomPicker(false)
  }

  async function handleAddCategoryInline() {
    if (!newCatName.trim() || !profile) return
    setAddingCat(true)
    const cat = await addCategory(newCatName.trim(), profile.uid)
    setCategories(prev => [...prev, cat])
    setSelectedCatId(cat.id)
    setNewCatName('')
    setAddingCat(false)
  }

  async function handleStartNewCategory() {
    if (!gameId || !selectedCatId || !game) return
    const cat = categories.find(c => c.id === selectedCatId)
    if (!cat) return
    const excluded = newCatExcluded ?? game.excludedLetters
    await startNewCategory(gameId, cat.name, cat.id, players, excluded, game)
    setShowCatPicker(false)
    setSelectedCatId('')
    setNewCatExcluded(null)
    setShowLetterPicker(false)
  }

  if (!game || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#FF5714', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ── Tabla de puntajes (modal flotante) ───────────────────────────────────────
  // Cálculo de stats de velocidad para las pestañas del admin
  const allTimedNow = allAnswers.filter(a => a.secondsUsed !== undefined)
  const speedStats = players.map(p => {
    const mine = allTimedNow.filter(a => a.uid === p.uid)
    if (mine.length === 0) return { ...p, avgSecs: null, correctCount: 0, total: 0 }
    const totalSecs = mine.reduce((s, a) => {
      const ok = !a.noAnswer && a.isValid !== false && (a.points ?? 0) > 0
      return s + (ok ? (a.secondsUsed ?? 0) : (a.secondsUsed ?? 0) * 2)
    }, 0)
    return {
      ...p,
      avgSecs: totalSecs / mine.length,
      correctCount: mine.filter(a => !a.noAnswer && a.isValid !== false && (a.points ?? 0) > 0).length,
      total: mine.length,
    }
  }).sort((a, b) => (a.avgSecs ?? 999) - (b.avgSecs ?? 999))

  const scoreTableModal = showScoreTable ? (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setShowScoreTable(false)}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-display font-semibold" style={{ color: '#FF5714' }}>📊 Estadísticas</h2>
          <button onClick={() => setShowScoreTable(false)}
            className="w-7 h-7 rounded-lg text-sm font-bold"
            style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>✕</button>
        </div>

        {/* Tabs — solo admin ve las 3 pestañas */}
        {isAdmin ? (
          <div className="flex px-5 gap-1 pb-3">
            {([['scores', '🏆 Pts'], ['speed', '⚡ Velocidad'], ['cheats', '🚨 Trampas']] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setScoreTableTab(tab)}
                className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors"
                style={scoreTableTab === tab
                  ? { background: '#FF5714', color: 'white' }
                  : { background: 'var(--c-surface2)', color: 'var(--c-text3)' }}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 pb-2">
            <p className="text-xs" style={{ color: 'var(--c-text3)' }}>
              Categoría {game.categoryNumber} · {game.currentCategory}
            </p>
          </div>
        )}

        <div className="px-5 pb-5 space-y-1.5 max-h-72 overflow-y-auto">
          {/* ── Pestaña puntajes (todos) ── */}
          {(!isAdmin || scoreTableTab === 'scores') && (
            [...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={i === 0
                  ? { background: 'rgba(232,170,20,0.15)', border: '2px solid #E8AA14' }
                  : { border: '1px solid var(--c-border)' }}>
                <span className="text-base w-6 text-center shrink-0">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="flex-1 font-semibold truncate" style={{ color: 'var(--c-text)' }}>
                  {p.displayName}
                  {p.status === 'eliminated' && <span className="text-xs ml-1" style={{ color: 'var(--c-text3)' }}>(elim.)</span>}
                </span>
                <span className="font-black tabular-nums shrink-0" style={{ color: '#FF5714' }}>{p.score}pts</span>
              </div>
            ))
          )}

          {/* ── Pestaña velocidad (admin) ── */}
          {isAdmin && scoreTableTab === 'speed' && (
            speedStats.length === 0
              ? <p className="text-sm text-center py-4" style={{ color: 'var(--c-text3)' }}>Aún no hay respuestas registradas</p>
              : speedStats.map((p, i) => (
                <div key={p.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={i === 0 && p.avgSecs !== null
                    ? { background: 'rgba(27,231,255,0.08)', border: '2px solid rgba(27,231,255,0.5)' }
                    : { border: '1px solid var(--c-border)' }}>
                  <span className="text-base w-6 text-center shrink-0">
                    {i === 0 && p.avgSecs !== null ? '⚡' : `${i + 1}.`}
                  </span>
                  <span className="flex-1 font-semibold truncate" style={{ color: 'var(--c-text)' }}>{p.displayName}</span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--c-text3)' }}>
                    ✅{p.correctCount}/{p.total}
                  </span>
                  <span className="font-black tabular-nums shrink-0 text-sm"
                    style={{ color: p.avgSecs !== null ? '#1BE7FF' : 'var(--c-text3)' }}>
                    {p.avgSecs !== null ? `${p.avgSecs.toFixed(1)}s` : '—'}
                  </span>
                </div>
              ))
          )}

          {/* ── Pestaña trampas (admin) ── */}
          {isAdmin && scoreTableTab === 'cheats' && (
            [...players].sort((a, b) => (b.cheatCount ?? 0) - (a.cheatCount ?? 0)).map((p, i) => (
              <div key={p.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={(p.cheatCount ?? 0) > 0 && i === 0
                  ? { background: 'rgba(255,87,20,0.08)', border: '2px solid rgba(255,87,20,0.4)' }
                  : { border: '1px solid var(--c-border)' }}>
                <span className="text-base w-6 text-center shrink-0">
                  {(p.cheatCount ?? 0) > 0 && i === 0 ? '🚨' : `${i + 1}.`}
                </span>
                <span className="flex-1 font-semibold truncate" style={{ color: 'var(--c-text)' }}>{p.displayName}</span>
                <span className="font-black tabular-nums shrink-0"
                  style={{ color: (p.cheatCount ?? 0) > 0 ? '#FF5714' : 'var(--c-text3)' }}>
                  {(p.cheatCount ?? 0) > 0 ? `${p.cheatCount}x` : '✅'}
                </span>
              </div>
            ))
          )}
        </div>

        {isAdmin && (
          <p className="text-xs text-center pb-3" style={{ color: 'var(--c-text3)' }}>
            Categoría {game.categoryNumber} · {game.currentCategory}
          </p>
        )}
      </div>
    </div>
  ) : null

  const scoreFabEl = (
    <button
      onClick={() => setShowScoreTable(true)}
      title="Ver tabla de puntajes"
      className="fixed bottom-5 right-5 z-30 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
      style={{ background: '#FF5714', color: 'white' }}
    >
      📊
    </button>
  )

  // ── Toast trampa (visible para todos menos el tramposo) ──────────────────────
  const cheatToastEl = cheatToast ? (
    <div className="fixed top-2 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <div
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl shadow-2xl text-sm font-bold"
        style={{ background: 'rgba(20,20,20,0.95)', border: '2px solid #FF5714', color: '#FF5714', maxWidth: 340 }}
      >
        <span className="text-xl">🚨</span>
        <span style={{ color: '#fff' }}>
          <span style={{ color: '#FF5714' }}>{cheatToast}</span> hizo trampa — <span style={{ color: '#FF5714', fontWeight: 900 }}>−10 pts</span>
        </span>
      </div>
    </div>
  ) : null

  // ── Overlay trampa ────────────────────────────────────────────────────────────
  if (caughtCheating) {
    async function handleCheatOk() {
      setCaughtCheating(false)
      // Si el turno sigue siendo del jugador, forzar submit vacío para avanzar el turno
      if (gameId && game && isMyTurn && !answerHandled) {
        setLetterHandled(true)
        setAnswerHandled(true)
        await submitAnswer(gameId, game, players, '', true)
      }
    }

    // Zumbido sutil + auto-dismiss a los 8 segundos
    navigator.vibrate?.([300, 100, 300, 100, 200])
    const cheatTimer = setTimeout(handleCheatOk, 8000)

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ background: '#111111' }}
        // Limpiar timer si el usuario pulsa OK antes
        ref={el => { if (!el) clearTimeout(cheatTimer) }}
      >
        <img src="/logo.svg" alt="BASTA" className="w-28 h-28 mb-6 animate-bounce" />
        <h1
          className="text-4xl font-display font-semibold text-white text-center mb-3"
          style={{ letterSpacing: '0.08em' }}
        >
          ¡No hagas trampa!
        </h1>
        <p className="text-center mb-4 max-w-xs" style={{ color: '#888' }}>
          Saliste de la ventana durante tu turno. Quedas{' '}
          <span style={{ color: '#FF5714', fontWeight: 700 }}>fuera de esta categoría</span>.
        </p>
        <div
          className="rounded-2xl px-6 py-4 text-center max-w-xs mb-6 space-y-2"
          style={{ background: 'rgba(255,87,20,0.12)', border: '1px solid rgba(255,87,20,0.3)' }}
        >
          <p className="text-2xl font-black" style={{ color: '#FF5714' }}>−10 pts</p>
          <p className="text-sm" style={{ color: '#FF5714' }}>
            Se te descontaron 10 puntos de tu marcador.
          </p>
          <p className="text-xs" style={{ color: '#888' }}>
            En la próxima categoría podrás volver a participar.
          </p>
        </div>
        <button
          onClick={() => { clearTimeout(cheatTimer); handleCheatOk() }}
          className="px-10 py-3 rounded-xl font-display font-semibold text-white text-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: '#FF5714' }}
        >
          OK, entendido
        </button>
        <p className="text-xs mt-4 animate-pulse" style={{ color: '#555' }}>
          Se cerrará automáticamente en 8 segundos…
        </p>
      </div>
    )
  }

  // ── Modal: selector de categorías para sorteo aleatorio ─────────────────────
  const randomPickerModal = showRandomPicker ? (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setShowRandomPicker(false)}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h3 className="font-display font-semibold text-lg" style={{ color: '#FF5714' }}>
            🎲 Sorteo aleatorio
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-text3)' }}>
            Marca las categorías que entran al sorteo
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 px-5 pb-2">
          <button
            onClick={() => setRandomPoolIds(categories.map(c => c.id))}
            className="text-xs font-bold px-3 py-1 rounded-lg transition-colors"
            style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
          >
            Todas
          </button>
          <button
            onClick={() => setRandomPoolIds([])}
            className="text-xs font-bold px-3 py-1 rounded-lg transition-colors"
            style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
          >
            Ninguna
          </button>
          <span className="ml-auto text-xs self-center" style={{ color: 'var(--c-text3)' }}>
            {randomPoolIds.length} seleccionadas
          </span>
        </div>

        {/* Lista de categorías */}
        <div className="max-h-64 overflow-y-auto px-5 pb-3 space-y-1">
          {categories.map(cat => {
            const checked = randomPoolIds.includes(cat.id)
            return (
              <label
                key={cat.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
                style={checked
                  ? { background: 'rgba(255,87,20,0.08)', border: '1px solid rgba(255,87,20,0.3)' }
                  : { background: 'var(--c-surface2)', border: '1px solid transparent' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setRandomPoolIds(prev =>
                      checked ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                    )
                  }
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--c-text)' }}>
                  {cat.name}
                  {cat.isCustom && <span className="ml-1 text-xs" style={{ color: '#FF5714' }}>✦</span>}
                </span>
              </label>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={() => setShowRandomPicker(false)}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors"
            style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handlePickRandom}
            disabled={randomPoolIds.length === 0}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-colors"
            style={{ background: '#FF5714' }}
          >
            🎲 Elegir al azar
          </button>
        </div>
      </div>
    </div>
  ) : null

  // ════════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'lobby') {
    const realPlayers = players.filter(p => p.uid !== game.adminId)
    return (
      <>
      {randomPickerModal}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Código */}
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--c-text3)' }}>Código de partida</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-5xl font-display font-semibold tracking-widest" style={{ color: '#FF5714' }}>
              {game.code}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(game.code)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ background: copied ? 'rgba(110,235,131,0.15)' : 'var(--c-surface2)', color: copied ? '#6EEB83' : 'var(--c-text2)' }}
              title="Copiar código"
            >
              <span className="text-lg">{copied ? '✓' : '📋'}</span>
              <span className="text-xs font-bold">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--c-text3)' }}>{realPlayers.length}/{game.maxPlayers} jugadores</p>
        </div>

        {/* Panel admin */}
        {isAdmin && (
          <div className="rounded-2xl shadow p-4 space-y-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <h3 className="font-display font-semibold flex items-center gap-2" style={{ color: '#FF5714' }}>
              <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs">⚙</span>
              Configuración de partida
            </h3>

            {/* Categoría — siempre visible */}
            <div className="space-y-2">
              <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--c-text3)' }}>Categoría</p>
              <div className="flex gap-2">
                <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                  <option value="">— Elige una categoría —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.excludeFromRandom ? ' 🚫' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleOpenRandomPicker}
                  title="Elegir categoría aleatoria"
                  className="w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: 'rgba(110,235,131,0.15)', border: '1px solid rgba(110,235,131,0.4)', color: '#6EEB83' }}
                >
                  🎲
                </button>
              </div>
              {/* Agregar categoría inline */}
              <div className="flex gap-2">
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategoryInline()}
                  placeholder="+ Nueva categoría..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                />
                <button
                  onClick={handleAddCategoryInline}
                  disabled={!newCatName.trim() || addingCat}
                  className="disabled:opacity-40 text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors"
                  style={{ background: '#FF5714' }}
                >
                  {addingCat ? '...' : 'OK'}
                </button>
              </div>
            </div>

            {/* Timers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'var(--c-surface2)' }}>
                <p className="text-xs text-gray-500 mb-2 font-body">⏱ Elegir letra</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateTimers(gameId!, Math.max(3, (game.letterSeconds ?? 5) - 1), game.answerSeconds ?? 10)}
                    className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-gray-700 transition-colors">−</button>
                  <span className="flex-1 text-center font-display font-semibold text-lg" style={{ color: '#FF5714' }}>{game.letterSeconds ?? 5}s</span>
                  <button onClick={() => updateTimers(gameId!, Math.min(30, (game.letterSeconds ?? 5) + 1), game.answerSeconds ?? 10)}
                    className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-gray-700 transition-colors">+</button>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--c-surface2)' }}>
                <p className="text-xs text-gray-500 mb-2 font-body">⏱ Responder</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateTimers(gameId!, game.letterSeconds ?? 5, Math.max(5, (game.answerSeconds ?? 10) - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-gray-700 transition-colors">−</button>
                  <span className="flex-1 text-center font-display font-semibold text-lg" style={{ color: '#FF5714' }}>{game.answerSeconds ?? 10}s</span>
                  <button onClick={() => updateTimers(gameId!, game.letterSeconds ?? 5, Math.min(60, (game.answerSeconds ?? 10) + 1))}
                    className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-gray-700 transition-colors">+</button>
                </div>
              </div>
            </div>

            {/* Letras excluidas */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Letras excluidas</p>
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
                      className="w-8 h-8 text-xs font-bold rounded-lg transition-colors"
                      style={excluded ? { background: '#EC4E20', color: 'white' } : { background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
                      {l}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">{game.availableLetters.length} letras disponibles</p>
            </div>

            {/* Botón iniciar */}
            <button
              onClick={handleStartGame}
              disabled={realPlayers.length < 1 || !selectedCatId}
              className="w-full disabled:opacity-40 text-white font-display font-semibold py-3.5 rounded-xl text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-md"
              style={{ background: '#FF5714' }}>
              {realPlayers.length < 1
                ? 'Esperando jugadores...'
                : !selectedCatId
                  ? 'Elige una categoría primero'
                  : '▶ Iniciar partida'}
            </button>
          </div>
        )}

        {/* Lista de jugadores */}
        <div className="rounded-2xl shadow p-4 space-y-2" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--c-text3)' }}>Jugadores</p>
          {realPlayers.length === 0
            ? <p className="text-gray-400 text-sm text-center py-3">Aún no hay jugadores</p>
            : realPlayers.map((p, i) => (
              <div key={p.uid} className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={p.uid === profile.uid
                  ? { border: '2px solid #FF5714', background: 'rgba(255,87,20,0.08)' }
                  : { border: '1px solid var(--c-border)' }}>
                <span className="text-xs w-4" style={{ color: 'var(--c-text3)' }}>#{i + 1}</span>
                <span className="flex-1 font-semibold truncate" style={{ color: 'var(--c-text)' }}>
                  {p.displayName}
                  {p.uid === profile.uid && <span className="text-xs ml-1" style={{ color: '#FF5714' }}>(tú)</span>}
                </span>
                {isAdmin && (
                  <button onClick={() => eliminatePlayer(gameId!, p.uid)}
                    className="text-xs text-red-400 hover:text-red-600">✕</button>
                )}
              </div>
            ))
          }
        </div>

        {!isAdmin && <p className="text-center text-gray-400 text-sm animate-pulse font-body">Esperando al admin para iniciar...</p>}
      </div>
      </>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY REVEAL
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'category_reveal') {
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <CategoryCard category={game.currentCategory} roundNumber={game.categoryNumber ?? 1} />
        <div className="text-center space-y-2">
          <p className="text-sm" style={{ color: 'var(--c-text2)' }}>
            {game.availableLetters.length} letras · {players.length} jugadores
          </p>
          <p className="text-xs" style={{ color: 'var(--c-text3)' }}>
            Orden: {game.turnOrder.map(uid => players.find(p => p.uid === uid)?.displayName).join(' → ')}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <button onClick={() => beginTurns(gameId!)}
              className="w-full text-white font-display font-semibold px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: '#FF5714' }}>
              ▶ ¡Empezar!
            </button>
            <button
              onClick={() => undoNewCategory(gameId!, game)}
              className="text-sm font-bold py-2 px-6 rounded-xl transition-colors"
              style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
            >
              ↩ {game.prevCategoryId ? 'Volver a categoría anterior' : 'Volver al lobby'}
            </button>
          </div>
        )}
        {!isAdmin && <p className="text-sm animate-pulse" style={{ color: 'var(--c-text3)' }}>El admin iniciará el juego...</p>}
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
        {scoreTableModal}{scoreFabEl}
        {cheatToastEl}
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
        <div className="rounded-2xl px-4 py-3 text-center border-2"
          style={isMyTurn && !isEliminated
            ? { background: 'rgba(255,87,20,0.1)', borderColor: '#FF5714' }
            : isMyTurn && isEliminated
              ? { background: 'rgba(136,136,136,0.08)', borderColor: 'var(--c-border)' }
              : { background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <p className="font-black text-lg" style={{ color: isMyTurn && !isEliminated ? '#FF5714' : 'var(--c-text)' }}>
            {isMyTurn && !isEliminated
              ? '🎯 ¡Es TU turno!'
              : isMyTurn && isEliminated
                ? '⏹ Tu turno — categoría terminada'
                : `⏳ Turno de ${currentPlayer?.displayName ?? '...'}`}
          </p>
        </div>

        {/* ── MI TURNO: eliminado en esta categoría ── */}
        {isMyTurn && isEliminated && (
          <div className="rounded-2xl shadow p-6 text-center space-y-3" style={{ background: 'var(--c-surface)' }}>
            <div className="text-5xl">⏹</div>
            <p className="font-black text-xl" style={{ color: 'var(--c-text)' }}>Se acabó tu turno</p>
            <p className="text-sm" style={{ color: 'var(--c-text3)' }}>
              Fuiste eliminado en esta categoría.<br />Podrás participar en la siguiente.
            </p>
          </div>
        )}

        {/* ── MI TURNO: elegir letra ── */}
        {isMyTurn && !game.currentLetter && !isEliminated && (
          <div className="rounded-2xl shadow p-4 space-y-3" style={{ background: 'var(--c-surface)' }}>
            <div className="flex items-center justify-between">
              <p className="font-bold" style={{ color: 'var(--c-text)' }}>Elige tu letra</p>
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
        {isMyTurn && game.currentLetter && !isEliminated && (
          <div className="rounded-2xl shadow p-4 space-y-3" style={{ background: 'var(--c-surface)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'var(--c-text2)' }}>Tu letra</p>
                <p className="text-5xl font-black leading-none" style={{ color: '#FF5714' }}>{game.currentLetter}</p>
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
                className="flex-1 border-2 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none disabled:opacity-50"
                style={{ background: 'var(--c-input)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                autoComplete="off" />
              <button type="submit" disabled={answerHandled || !answerText.trim()}
                className="disabled:opacity-40 text-white font-bold px-5 rounded-xl text-xl transition-colors"
                style={{ background: '#FF5714' }}>
                ✓
              </button>
            </form>
            {answerHandled && <p className="text-center text-green-600 font-bold text-sm">✓ Enviado — esperando a los demás</p>}
          </div>
        )}

        {/* ── TURNO DE OTRO: observar ── */}
        {!isMyTurn && (
          <div className="rounded-2xl shadow p-4 text-center space-y-3" style={{ background: 'var(--c-surface)' }}>
            {!game.currentLetter ? (
              <>
                <p className="text-sm" style={{ color: 'var(--c-text2)' }}>
                  <span className="font-bold" style={{ color: 'var(--c-text)' }}>{currentPlayer?.displayName}</span> está eligiendo letra...
                </p>
                <div className="text-4xl animate-bounce">🤔</div>
                <CountdownTimer startAt={game.letterTimerStartAt} seconds={game.letterSeconds ?? 5} />
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: 'var(--c-text2)' }}>
                  <span className="font-bold" style={{ color: 'var(--c-text)' }}>{currentPlayer?.displayName}</span> eligió
                </p>
                <p className="text-6xl font-black" style={{ color: '#FF5714' }}>{game.currentLetter}</p>
                <p className="text-xs" style={{ color: 'var(--c-text3)' }}>Escribiendo respuesta...</p>
                <CountdownTimer startAt={game.answerTimerStartAt} seconds={game.answerSeconds ?? 10} />
              </>
            )}
          </div>
        )}

        {/* Lista de jugadores con estado en esta rotación */}
        <div className="rounded-2xl shadow p-4 space-y-1.5" style={{ background: 'var(--c-surface)' }}>
          <p className="text-xs font-bold uppercase" style={{ color: 'var(--c-text3)' }}>Esta rotación</p>
          {game.turnOrder.map((uid, i) => {
            const p = players.find(pl => pl.uid === uid)
            if (!p) return null
            const isCurrent = uid === game.currentTurnUid
            const hasDone = i < game.turnIndex
            const ans = rotationAnswers.find(a => a.uid === uid)
            return (
              <div key={uid} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
                style={isCurrent
                  ? { background: 'rgba(255,87,20,0.08)', border: '2px solid #FF5714' }
                  : { border: '1px solid var(--c-border)' }}>
                <span>{isCurrent ? '▶' : hasDone ? (ans?.noAnswer ? '❌' : '✅') : '⏳'}</span>
                <span className="flex-1 font-semibold truncate" style={{ color: isCurrent ? '#FF5714' : 'var(--c-text)' }}>
                  {p.displayName}
                  {uid === profile?.uid && <span className="text-xs ml-1" style={{ color: '#FF5714' }}>(tú)</span>}
                </span>
                {hasDone && ans && !ans.noAnswer && (
                  <span className="text-xs font-medium italic" style={{ color: 'var(--c-text3)' }}>
                    [{ans.letter}] {ans.answer}
                  </span>
                )}
                <span className="font-bold tabular-nums shrink-0" style={{ color: '#FF5714' }}>{p.score}pts</span>
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
          <div className="rounded-2xl shadow p-4 space-y-3 border-2 border-yellow-200" style={{ background: 'var(--c-surface)' }}>
            <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">⚙️ Controles admin</p>

            {/* Timers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">⏱ Elegir letra</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateTimers(gameId!, Math.max(3, (game.letterSeconds ?? 5) - 1), game.answerSeconds ?? 10)}
                    className="w-7 h-7 rounded-lg font-bold"
                    style={{ background: 'var(--c-surface2)', color: 'var(--c-text)' }}>−</button>
                  <span className="flex-1 text-center font-black" style={{ color: '#FF5714' }}>{game.letterSeconds ?? 5}s</span>
                  <button onClick={() => updateTimers(gameId!, Math.min(30, (game.letterSeconds ?? 5) + 1), game.answerSeconds ?? 10)}
                    className="w-7 h-7 rounded-lg font-bold"
                    style={{ background: 'var(--c-surface2)', color: 'var(--c-text)' }}>+</button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">⏱ Responder</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateTimers(gameId!, game.letterSeconds ?? 5, Math.max(5, (game.answerSeconds ?? 10) - 1))}
                    className="w-7 h-7 rounded-lg font-bold"
                    style={{ background: 'var(--c-surface2)', color: 'var(--c-text)' }}>−</button>
                  <span className="flex-1 text-center font-black" style={{ color: '#FF5714' }}>{game.answerSeconds ?? 10}s</span>
                  <button onClick={() => updateTimers(gameId!, game.letterSeconds ?? 5, Math.min(60, (game.answerSeconds ?? 10) + 1))}
                    className="w-7 h-7 rounded-lg font-bold"
                    style={{ background: 'var(--c-surface2)', color: 'var(--c-text)' }}>+</button>
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
            <div className="flex gap-2">
              <button onClick={() => endCategory(gameId!, game, players)}
                className="flex-1 font-bold py-2 rounded-xl text-sm transition-colors"
                style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
                🏁 Terminar categoría
              </button>
              <button onClick={() => endGame(gameId!, game, players)}
                className="flex-1 font-bold py-2 rounded-xl text-sm transition-colors"
                style={{ background: 'var(--c-surface2)', color: 'var(--c-text3)' }}>
                🚪 Terminar partida
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
        {scoreTableModal}{scoreFabEl}
        {cheatToastEl}
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
                      <button onClick={() => validateAnswerWithPoints(gameId!, ansId, 10)}
                        className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                        style={ans.isValid === true && ans.points === 10
                          ? { background: '#22c55e', color: 'white' }
                          : { background: '#dcfce7', color: '#15803d' }}>
                        10
                      </button>
                      <button onClick={() => validateAnswerWithPoints(gameId!, ansId, 5)}
                        className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                        style={ans.isValid === true && ans.points === 5
                          ? { background: '#86efac', color: '#15803d' }
                          : { background: '#f0fdf4', color: '#16a34a' }}>
                        5
                      </button>
                      <button onClick={() => validateAnswer(gameId!, ansId, false)}
                        className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                        style={ans.isValid === false
                          ? { background: '#ef4444', color: 'white' }
                          : { background: '#fee2e2', color: '#dc2626' }}>
                        ✗
                      </button>
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
        {scoreTableModal}{scoreFabEl}
        {cheatToastEl}
        <div className="bg-gradient-to-br from-brand-600 to-charcoal rounded-2xl p-4 text-white text-center">
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
                    <button onClick={() => validateAnswerWithPoints(gameId!, ansId, 10)}
                      className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                      style={ans.isValid === true && ans.points === 10
                        ? { background: '#22c55e', color: 'white' }
                        : { background: '#dcfce7', color: '#15803d' }}>
                      10
                    </button>
                    <button onClick={() => validateAnswerWithPoints(gameId!, ansId, 5)}
                      className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                      style={ans.isValid === true && ans.points === 5
                        ? { background: '#86efac', color: '#15803d' }
                        : { background: '#f0fdf4', color: '#16a34a' }}>
                      5
                    </button>
                    <button onClick={() => validateAnswer(gameId!, ansId, false)}
                      className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                      style={ans.isValid === false
                        ? { background: '#ef4444', color: 'white' }
                        : { background: '#fee2e2', color: '#dc2626' }}>
                      ✗
                    </button>
                  </div>
                )}
                {!ans.noAnswer && <span className="text-sm font-black text-brand-700 shrink-0">+{ans.points}pts</span>}
              </div>
            )
          })}
        </div>

        {/* Marcador */}
        <div className="rounded-2xl shadow p-4 space-y-1.5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--c-text3)' }}>Marcador</p>
          {sortedPlayers.map((p, i) => (
            <div key={p.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={i === 0
                ? { background: 'rgba(232,170,20,0.15)', border: '2px solid #E8AA14' }
                : { border: '1px solid var(--c-border)' }}>
              <span className="text-base">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <span className="flex-1 font-bold truncate" style={{ color: 'var(--c-text)' }}>{p.displayName}</span>
              <span className="font-black tabular-nums" style={{ color: '#FF5714' }}>{p.score}pts</span>
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
                className="w-full text-white font-black py-4 rounded-2xl text-lg transition-all hover:scale-105 shadow-lg"
                style={{ background: '#FF5714' }}>
                ▶ Continuar ({game.availableLetters.length} letras restantes)
              </button>
            )}
            <button onClick={() => endCategory(gameId!, game, players)}
              className="w-full font-bold py-3 rounded-xl transition-colors"
              style={noLettersLeft
                ? { background: '#FF5714', color: 'white', fontSize: '1.1rem' }
                : { background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
              🏁 {noLettersLeft ? 'Terminar categoría' : 'Terminar categoría aquí'}
            </button>
            <button onClick={() => endGame(gameId!, game, players)}
              className="w-full font-bold py-2 rounded-xl transition-colors text-sm"
              style={{ background: 'var(--c-surface2)', color: 'var(--c-text3)' }}>
              🚪 Terminar partida
            </button>
          </div>
        )}

        {!isAdmin && (
          <p className="text-center text-sm animate-pulse" style={{ color: 'var(--c-text3)' }}>
            {noLettersLeft ? '¡Se acabaron las letras! Esperando al admin...' : 'Esperando al admin...'}
          </p>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORY DONE — todas las letras de esta categoría agotadas
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'category_done') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

    // Puntos ganados en esta categoría específica
    const catAnswers = allAnswers.filter(a => a.categoryId === game.currentCategoryId)
    const catScores = players.map(p => ({
      ...p,
      catPts: catAnswers.filter(a => a.uid === p.uid).reduce((s, a) => s + (a.points ?? 0), 0),
    })).sort((a, b) => b.catPts - a.catPts)
    const hasCatData = catAnswers.length > 0

    return (
      <>
      {randomPickerModal}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {scoreTableModal}{scoreFabEl}
        <div className="rounded-2xl p-5 text-center text-white" style={{ background: 'linear-gradient(135deg, #FF5714, #333)' }}>
          <p className="text-xs uppercase tracking-widest opacity-75 mb-1">Categoría {game.categoryNumber} completada</p>
          <h2 className="text-2xl font-display font-semibold">{game.currentCategory}</h2>
          <p className="text-sm opacity-75 mt-1">
            {game.usedLetters.length} letra{game.usedLetters.length !== 1 ? 's' : ''} usada{game.usedLetters.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Resultados de esta categoría */}
        {hasCatData && (
          <div className="rounded-2xl shadow p-4 space-y-1.5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--c-text3)' }}>
              🏆 Resultados — {game.currentCategory}
            </p>
            {catScores.map((p, i) => (
              <div key={p.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={i === 0 && p.catPts > 0
                  ? { background: 'rgba(232,170,20,0.15)', border: '2px solid #E8AA14' }
                  : { border: '1px solid var(--c-border)' }}>
                <span className="text-base">{i === 0 && p.catPts > 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <span className="flex-1 font-bold truncate" style={{ color: 'var(--c-text)' }}>{p.displayName}</span>
                <span className="text-sm font-bold" style={{ color: p.catPts > 0 ? '#FF5714' : 'var(--c-text3)' }}>
                  {p.catPts > 0 ? `+${p.catPts}pts` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Marcador acumulado + bonus admin */}
        <div className="rounded-2xl shadow p-4 space-y-1.5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--c-text3)' }}>Marcador acumulado</p>
          {sortedPlayers.map((p, i) => (
            <div key={p.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={i === 0
                ? { background: 'rgba(232,170,20,0.15)', border: '2px solid #E8AA14' }
                : { border: '1px solid var(--c-border)' }}>
              <span className="text-base">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span className="flex-1 font-bold truncate" style={{ color: 'var(--c-text)' }}>{p.displayName}</span>
              <span className="font-black tabular-nums" style={{ color: '#FF5714' }}>{p.score}pts</span>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={-999}
                    max={999}
                    value={bonusInputs[p.uid] ?? 10}
                    onChange={e => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val)) setBonusInputs(prev => ({ ...prev, [p.uid]: val }))
                    }}
                    className="w-14 text-center text-sm font-bold tabular-nums rounded-lg px-1 py-1 focus:outline-none"
                    style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: '#E8AA14' }}
                  />
                  <button
                    onClick={() => addBonusPoints(gameId!, p.uid, bonusInputs[p.uid] ?? 10)}
                    className="text-xs px-2 py-1 rounded-lg font-bold transition-all hover:scale-110 active:scale-95"
                    style={{ background: 'rgba(232,170,20,0.2)', color: '#E8AA14', border: '1px solid rgba(232,170,20,0.5)' }}
                  >
                    🎁 Dar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Admin: revisar y ajustar respuestas de la categoría */}
        {isAdmin && catAnswers.length > 0 && (
          <div className="rounded-2xl shadow p-4 space-y-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <button
              onClick={() => setShowCatReview(v => !v)}
              className="w-full flex items-center justify-between"
            >
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--c-text3)' }}>
                🔍 Ajustar respuestas de la categoría
              </p>
              <span className="text-xs" style={{ color: 'var(--c-text3)' }}>{showCatReview ? '▲ ocultar' : '▼ ver'}</span>
            </button>

            {showCatReview && (
              <div className="space-y-4">
                {Array.from(new Set(catAnswers.map(a => a.rotationNumber))).sort((a, b) => a - b).map(rot => (
                  <div key={rot}>
                    <p className="text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--c-text3)' }}>
                      Rotación {rot}
                    </p>
                    <div className="space-y-1.5">
                      {catAnswers.filter(a => a.rotationNumber === rot).map((ans) => {
                        const ansIdx = allAnswers.findIndex(
                          a => a.uid === ans.uid && a.rotationNumber === ans.rotationNumber && a.categoryId === ans.categoryId,
                        )
                        const ansId = ansIdx >= 0 ? answerIds[ansIdx] : null
                        return (
                          <div key={`${ans.uid}-${rot}`}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 border"
                            style={
                              ans.noAnswer
                                ? { background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }
                                : ans.isValid === false
                                  ? { background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.2)' }
                                  : { background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)' }
                            }>
                            {/* Letra */}
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                              style={{ background: ans.noAnswer ? 'rgba(239,68,68,0.15)' : 'rgba(255,87,20,0.12)', color: ans.noAnswer ? '#ef4444' : '#FF5714' }}>
                              {ans.noAnswer ? '—' : ans.letter}
                            </span>
                            {/* Jugador + respuesta */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate" style={{ color: 'var(--c-text3)' }}>{ans.playerName}</p>
                              <p className="font-bold text-sm truncate" style={{ color: 'var(--c-text)' }}>
                                {ans.noAnswer ? <em style={{ color: 'var(--c-text3)' }}>Sin respuesta</em> : ans.answer}
                              </p>
                            </div>
                            {/* Puntos asignados */}
                            {!ans.noAnswer && (
                              <span className="text-xs font-black shrink-0 tabular-nums"
                                style={{ color: ans.isValid === false ? 'var(--c-text3)' : '#FF5714' }}>
                                {ans.isValid === false ? '0pts' : `+${ans.points ?? 0}pts`}
                              </span>
                            )}
                            {/* Botones validar / invalidar */}
                            {!ans.noAnswer && ansId && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => adjustAnswerValidity(gameId!, ansId, ans, true, catAnswers)}
                                  disabled={ans.isValid === true}
                                  className="w-7 h-7 rounded-lg text-sm font-bold transition-colors disabled:opacity-30"
                                  style={ans.isValid === true
                                    ? { background: '#22c55e', color: 'white' }
                                    : { background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
                                  ✓
                                </button>
                                <button
                                  onClick={() => adjustAnswerValidity(gameId!, ansId, ans, false, catAnswers)}
                                  disabled={ans.isValid === false}
                                  className="w-7 h-7 rounded-lg text-sm font-bold transition-colors disabled:opacity-30"
                                  style={ans.isValid === false
                                    ? { background: '#ef4444', color: 'white' }
                                    : { background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
                                  ✗
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin: nueva categoría */}
        {isAdmin && (
          <div className="rounded-2xl shadow p-4 space-y-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--c-text3)' }}>⚙️ Controles admin</p>

            <div className="space-y-2">
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--c-text2)' }}>Categoría para la siguiente ronda</p>
              <div className="flex gap-2">
                <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                  <option value="">— Elige una categoría —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  onClick={handleOpenRandomPicker}
                  title="Elegir categoría aleatoria"
                  className="w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: 'rgba(110,235,131,0.15)', border: '1px solid rgba(110,235,131,0.4)', color: '#6EEB83' }}
                >
                  🎲
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategoryInline()}
                  placeholder="+ Nueva categoría..."
                  className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                />
                <button
                  onClick={handleAddCategoryInline}
                  disabled={!newCatName.trim() || addingCat}
                  className="disabled:opacity-40 text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors"
                  style={{ background: '#FF5714' }}
                >
                  {addingCat ? '...' : 'OK'}
                </button>
              </div>
            </div>

            {/* Selector de letras para esta categoría */}
            <div>
              <button
                onClick={() => setShowLetterPicker(v => !v)}
                className="w-full flex items-center justify-between text-xs font-semibold py-1.5"
                style={{ color: 'var(--c-text3)' }}
              >
                <span>🔤 Letras para esta categoría</span>
                <span>{showLetterPicker ? '▲ ocultar' : '▼ personalizar'}</span>
              </button>
              {showLetterPicker && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {ALL_LETTERS.map(l => {
                      const effectiveExcluded = newCatExcluded ?? game.excludedLetters
                      const excluded = effectiveExcluded.includes(l)
                      return (
                        <button key={l}
                          onClick={() => {
                            const base = newCatExcluded ?? game.excludedLetters
                            setNewCatExcluded(
                              excluded ? base.filter(x => x !== l) : [...base, l]
                            )
                          }}
                          className="w-8 h-8 text-xs font-bold rounded-lg transition-colors"
                          style={excluded
                            ? { background: '#EC4E20', color: 'white' }
                            : { background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
                        >
                          {l}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--c-text3)' }}>
                    {ALL_LETTERS.length - (newCatExcluded ?? game.excludedLetters).length} letras disponibles
                    {newCatExcluded && (
                      <button
                        onClick={() => setNewCatExcluded(null)}
                        className="ml-2 underline"
                        style={{ color: '#FF5714' }}
                      >restablecer</button>
                    )}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleStartNewCategory}
              disabled={!selectedCatId}
              className="w-full disabled:opacity-40 text-white font-display font-semibold py-3.5 rounded-xl text-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: '#FF5714' }}>
              🎲 Nueva categoría (todos activos)
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => undoEndCategory(gameId!)}
                className="flex-1 font-bold py-2 rounded-xl text-sm transition-colors"
                style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
                ↩ Deshacer terminar categoría
              </button>
              <button
                onClick={() => endGame(gameId!, game, players)}
                className="flex-1 font-bold py-2 rounded-xl text-sm transition-colors"
                style={{ background: 'var(--c-surface2)', color: 'var(--c-text3)' }}>
                🚪 Terminar partida
              </button>
            </div>
          </div>
        )}

        {!isAdmin && (
          <p className="text-center text-sm animate-pulse" style={{ color: 'var(--c-text3)' }}>
            Esperando al admin para la siguiente categoría...
          </p>
        )}
      </div>
      </>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ════════════════════════════════════════════════════════════════════════════
  if (game.status === 'game_over') {
    const sorted = [...players].sort((a, b) => b.score - a.score)

    // ── Estadísticas ────────────────────────────────────────────────────────────
    // Velocidad-precisión: respuestas correctas cuentan con su tiempo real,
    // respuestas incorrectas/sin respuesta cuentan como tiempo máximo (penalización).
    // Menor promedio = más rápido Y más preciso.
    const allTimedAnswers = allAnswers.filter(a => a.secondsUsed !== undefined)
    const playerStats = players.map(p => {
      const mine = allTimedAnswers.filter(a => a.uid === p.uid)
      if (mine.length === 0) return { ...p, avgSecs: null, correctCount: 0, answerCount: 0 }
      const totalSecs = mine.reduce((s, a) => {
        const isCorrect = !a.noAnswer && a.isValid !== false && (a.points ?? 0) > 0
        // Correcta: tiempo real usado. Incorrecta/sin respuesta: tiempo máximo (penalización)
        return s + (isCorrect ? (a.secondsUsed ?? 0) : (a.secondsUsed ?? 0) * 2)
      }, 0)
      const correctCount = mine.filter(a => !a.noAnswer && a.isValid !== false && (a.points ?? 0) > 0).length
      return { ...p, avgSecs: totalSecs / mine.length, correctCount, answerCount: mine.length }
    })
    const fastest = [...playerStats]
      .filter(p => p.avgSecs !== null && p.correctCount >= 1)
      .sort((a, b) => (a.avgSecs ?? 99) - (b.avgSecs ?? 99))[0]
    const mostCheater = [...players]
      .filter(p => (p.cheatCount ?? 0) > 0)
      .sort((a, b) => (b.cheatCount ?? 0) - (a.cheatCount ?? 0))[0]

    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="text-center rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #FF5714, #111111)' }}>
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-3xl font-display font-semibold">¡Juego terminado!</h1>
          <p className="opacity-75 mt-1 text-sm">{game.rotationNumber} rotaciones · {game.usedLetters.length} letras usadas</p>
        </div>
        <div className="rounded-2xl shadow p-4 space-y-2" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--c-text3)' }}>Clasificación final</p>
          {sorted.map((p, i) => (
            <div key={p.uid} className="flex items-center gap-3 rounded-xl px-3 py-3"
              style={i === 0
                ? { background: 'rgba(232,170,20,0.15)', border: '2px solid #E8AA14' }
                : { border: '1px solid var(--c-border)' }}>
              <span className="text-2xl">{i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <span className="flex-1 font-bold truncate" style={{ color: 'var(--c-text)' }}>{p.displayName}</span>
              <span className="font-black tabular-nums text-lg" style={{ color: '#FF5714' }}>{p.score}pts</span>
            </div>
          ))}
        </div>

        {/* Estadísticas de la partida */}
        {(fastest || mostCheater) && (
          <div className="rounded-2xl shadow p-4 space-y-2" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--c-text3)' }}>📊 Estadísticas</p>

            {fastest && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(27,231,255,0.08)', border: '1px solid rgba(27,231,255,0.3)' }}>
                <span className="text-2xl">⚡</span>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: 'var(--c-text3)' }}>Más rápido y preciso</p>
                  <p className="font-bold" style={{ color: 'var(--c-text)' }}>{fastest.displayName}</p>
                  <p className="text-xs" style={{ color: 'var(--c-text3)' }}>
                    {fastest.correctCount} correctas de {fastest.answerCount}
                  </p>
                </div>
                <span className="font-black tabular-nums" style={{ color: '#1BE7FF' }}>
                  {fastest.avgSecs!.toFixed(1)}s
                </span>
              </div>
            )}

            {/* Tabla completa de tiempos */}
            {playerStats.filter(p => p.answerCount > 0).length > 1 && (
              <div className="space-y-1 pt-1">
                {[...playerStats]
                  .filter(p => p.answerCount > 0)
                  .sort((a, b) => (a.avgSecs ?? 99) - (b.avgSecs ?? 99))
                  .map((p, i) => (
                    <div key={p.uid} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
                      style={{ border: '1px solid var(--c-border)' }}>
                      <span className="w-5 text-center text-xs" style={{ color: 'var(--c-text3)' }}>
                        {i === 0 ? '⚡' : `${i + 1}.`}
                      </span>
                      <span className="flex-1 truncate" style={{ color: 'var(--c-text)' }}>{p.displayName}</span>
                      <span className="tabular-nums font-semibold text-xs" style={{ color: 'var(--c-text2)' }}>
                        {p.avgSecs !== null ? `${p.avgSecs!.toFixed(1)}s` : '—'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--c-text3)' }}>
                        ✅{p.correctCount}/{p.answerCount}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {mostCheater && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mt-1"
                style={{ background: 'rgba(255,87,20,0.08)', border: '1px solid rgba(255,87,20,0.3)' }}>
                <span className="text-2xl">🚨</span>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: 'var(--c-text3)' }}>Más tramposo</p>
                  <p className="font-bold" style={{ color: 'var(--c-text)' }}>{mostCheater.displayName}</p>
                </div>
                <span className="font-black" style={{ color: '#FF5714' }}>
                  {mostCheater.cheatCount}x
                </span>
              </div>
            )}

            {!mostCheater && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(110,235,131,0.08)', border: '1px solid rgba(110,235,131,0.3)' }}>
                <span className="text-2xl">✅</span>
                <p className="font-semibold" style={{ color: 'var(--c-text)' }}>¡Nadie hizo trampa!</p>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => undoEndGame(gameId!)}
            className="w-full font-bold py-2.5 rounded-xl transition-colors text-sm"
            style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
            ↩ Deshacer terminar partida
          </button>
        )}
        <button onClick={() => navigate('/')}
          className="w-full text-white font-bold py-3 rounded-xl transition-colors"
          style={{ background: '#FF5714' }}>
          Volver al inicio
        </button>
      </div>
    )
  }

  return null
}
