import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { getCategories, seedCategories } from '../services/categoryService'
import { getActiveGames, deleteGame, deleteAllGames } from '../services/gameService'
import { getAllGameHistories } from '../services/gameHistoryService'
import CategoryManager from '../components/admin/CategoryManager'
import GameHistoryManager from '../components/admin/GameHistoryManager'
import type { Category, Game, GameHistory } from '../types'

const STATUS_LABEL: Record<string, string> = {
  lobby: '🟡 Lobby',
  category_reveal: '🟠 Revelando categoría',
  player_turn: '🟢 En juego',
  turn_paused: '⏸ Pausado',
  rotation_end: '🔵 Fin de rotación',
  category_done: '✅ Categoría terminada',
}

export default function AdminPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [activeGames, setActiveGames] = useState<Game[]>([])
  const [histories, setHistories] = useState<GameHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGames, setLoadingGames] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [confirmDeleteGame, setConfirmDeleteGame] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!profile) { navigate('/auth'); return }
    load()
    loadGames()
    loadHistory()
  }, [profile])

  async function load() {
    setLoading(true)
    await seedCategories()
    const cats = await getCategories()
    setCategories(cats)
    setLoading(false)
  }

  async function loadGames() {
    setLoadingGames(true)
    const games = await getActiveGames()
    setActiveGames(games)
    setLoadingGames(false)
  }

  async function loadHistory() {
    setLoadingHistory(true)
    const hs = await getAllGameHistories()
    setHistories(hs)
    setLoadingHistory(false)
  }

  async function handleDeleteGame(gameId: string) {
    setDeleting(true)
    await deleteGame(gameId)
    setConfirmDeleteGame(null)
    setDeleting(false)
    loadGames()
  }

  async function handleDeleteAll() {
    setDeleting(true)
    await deleteAllGames(activeGames)
    setConfirmDeleteAll(false)
    setDeleting(false)
    loadGames()
  }

  if (!profile) return null

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">

      {/* Header */}
      <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #FF5714, #111)' }}>
        <h1 className="text-2xl font-display font-semibold">Panel de Administración</h1>
        <p className="text-sm mt-1 opacity-75">Gestiona categorías y partidas activas</p>
      </div>

      {/* Dashboard partidas activas */}
      <div className="rounded-2xl shadow p-4 space-y-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold" style={{ color: '#FF5714' }}>🎮 Partidas activas</h2>
          <div className="flex gap-2">
            <button
              onClick={loadGames}
              className="text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
              style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
            >
              ↺ Actualizar
            </button>
            {activeGames.length > 1 && !confirmDeleteAll && (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                🗑 Eliminar todas
              </button>
            )}
          </div>
        </div>

        {/* Confirmación eliminar todas */}
        {confirmDeleteAll && (
          <div className="rounded-xl p-3 space-y-2"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="text-sm font-bold text-center" style={{ color: '#ef4444' }}>
              ¿Eliminar las {activeGames.length} partidas activas?
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--c-text3)' }}>
              Esta acción no se puede deshacer. Los jugadores serán desconectados.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="flex-1 text-white font-bold py-2 rounded-xl text-sm disabled:opacity-50 transition-colors"
                style={{ background: '#ef4444' }}
              >
                {deleting ? 'Eliminando...' : `Sí, eliminar todas (${activeGames.length})`}
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loadingGames ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-4 border-t-transparent rounded-full"
              style={{ borderColor: '#FF5714', borderTopColor: 'transparent' }} />
          </div>
        ) : activeGames.length === 0 ? (
          <p className="text-sm text-center py-3" style={{ color: 'var(--c-text3)' }}>
            No hay partidas activas en este momento
          </p>
        ) : (
          <div className="space-y-2">
            {activeGames.map(game => (
              <div
                key={game.id}
                className="rounded-xl p-3 space-y-1.5"
                style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-display font-semibold tracking-widest" style={{ color: '#FF5714' }}>
                      {game.code}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(255,87,20,0.12)', color: '#FF5714' }}>
                      {STATUS_LABEL[game.status] ?? game.status}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => navigate(`/game/${game.id}`)}
                      className="text-xs text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: '#FF5714' }}
                    >
                      Ir →
                    </button>
                    {confirmDeleteGame !== game.id && (
                      <button
                        onClick={() => { setConfirmDeleteGame(game.id); setConfirmDeleteAll(false) }}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                        title="Eliminar partida"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {game.currentCategory && (
                  <p className="text-xs" style={{ color: 'var(--c-text2)' }}>
                    📂 {game.currentCategory} · Categoría {game.categoryNumber}
                  </p>
                )}
                <p className="text-xs" style={{ color: 'var(--c-text3)' }}>
                  Admin: {game.adminName} · Máx {game.maxPlayers} jugadores
                </p>

                {/* Confirmación eliminar esta partida */}
                {confirmDeleteGame === game.id && (
                  <div className="flex items-center gap-2 pt-1"
                    style={{ borderTop: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="text-xs flex-1" style={{ color: '#ef4444' }}>
                      ¿Eliminar partida {game.code}?
                    </span>
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      disabled={deleting}
                      className="text-xs text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                      style={{ background: '#ef4444' }}
                    >
                      {deleting ? '...' : 'Sí'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteGame(null)}
                      disabled={deleting}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'var(--c-surface)', color: 'var(--c-text2)' }}
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gestión de categorías */}
      <div className="rounded-2xl shadow p-4 space-y-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <h2 className="font-display font-semibold" style={{ color: '#FF5714' }}>📂 Categorías</h2>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-4 border-t-transparent rounded-full"
              style={{ borderColor: '#FF5714', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <CategoryManager categories={categories} adminUid={profile.uid} onRefresh={load} />
        )}
      </div>

      {/* Histórico de partidas */}
      <div className="rounded-2xl shadow p-4 space-y-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold" style={{ color: '#FF5714' }}>📋 Histórico de partidas</h2>
          <button
            onClick={loadHistory}
            className="text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
            style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
          >
            ↺ Actualizar
          </button>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-4 border-t-transparent rounded-full"
              style={{ borderColor: '#FF5714', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <GameHistoryManager histories={histories} onRefresh={loadHistory} />
        )}
      </div>

      {/* Leyenda */}
      <div className="rounded-2xl p-4 space-y-1.5 text-xs" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text3)' }}>
        <p className="font-semibold text-sm mb-2" style={{ color: 'var(--c-text2)' }}>Leyenda</p>
        <p>✦ = Categoría personalizada</p>
        <p>🎲 verde = incluida en sorteo aleatorio</p>
        <p>Activa/Inactiva = visible u oculta en el selector</p>
      </div>
    </div>
  )
}
