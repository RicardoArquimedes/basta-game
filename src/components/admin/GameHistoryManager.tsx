import { useState } from 'react'
import {
  updateGameHistoryPlayers,
  deleteGameHistory,
} from '../../services/gameHistoryService'
import type { GameHistory, GameHistoryPlayer } from '../../types'

interface Props {
  histories: GameHistory[]
  onRefresh: () => void
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function GameHistoryManager({ histories, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)          // historyId en edición
  const [editPlayers, setEditPlayers] = useState<GameHistoryPlayer[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function startEdit(h: GameHistory) {
    setEditing(h.id)
    setEditPlayers(h.players.map(p => ({ ...p, categoryScores: { ...p.categoryScores } })))
  }

  function cancelEdit() { setEditing(null); setEditPlayers([]) }

  function setPlayerScore(uid: string, score: number) {
    setEditPlayers(prev => prev.map(p => p.uid === uid ? { ...p, finalScore: score } : p))
  }

  function setCatScore(uid: string, catId: string, score: number) {
    setEditPlayers(prev => prev.map(p =>
      p.uid === uid
        ? { ...p, categoryScores: { ...p.categoryScores, [catId]: score } }
        : p,
    ))
  }

  async function handleSave(historyId: string) {
    setSaving(true)
    try {
      await updateGameHistoryPlayers(historyId, editPlayers)
      setEditing(null)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(historyId: string) {
    await deleteGameHistory(historyId)
    setConfirmDelete(null)
    if (expanded === historyId) setExpanded(null)
    onRefresh()
  }

  if (histories.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'var(--c-text3)' }}>
        Aún no hay partidas finalizadas guardadas
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {histories.map(h => {
        const isExpanded = expanded === h.id
        const isEditing = editing === h.id
        const sorted = [...h.players].sort((a, b) => b.finalScore - a.finalScore)
        const editSorted = [...editPlayers].sort((a, b) => b.finalScore - a.finalScore)
        const winner = sorted[0]

        return (
          <div key={h.id} className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--c-border)' }}>

            {/* Header de la partida */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ background: 'var(--c-surface2)' }}
              onClick={() => setExpanded(isExpanded ? null : h.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-semibold text-base tracking-widest" style={{ color: '#FF5714' }}>
                    {h.code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(255,87,20,0.12)', color: '#FF5714' }}>
                    {h.totalCategories} cat.
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--c-surface)', color: 'var(--c-text3)' }}>
                    {h.players.length} jugadores
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-text3)' }}>
                  {formatDate(h.endedAt)}
                  {winner && <span className="ml-2">🏆 {winner.displayName} ({winner.finalScore}pts)</span>}
                </p>
              </div>
              <span className="text-xs shrink-0" style={{ color: 'var(--c-text3)' }}>
                {isExpanded ? '▲' : '▼'}
              </span>
            </button>

            {/* Detalle expandido */}
            {isExpanded && (
              <div className="p-4 space-y-4" style={{ background: 'var(--c-surface)' }}>

                {/* Tabla de jugadores */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--c-text3)' }}>
                      Jugadores
                    </p>
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(h)}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                        style={{ background: 'rgba(255,87,20,0.12)', color: '#FF5714' }}
                      >
                        ✏️ Editar puntos
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {(isEditing ? editSorted : sorted).map((p, i) => (
                      <div key={p.uid} className="rounded-xl px-3 py-2 space-y-2"
                        style={i === 0
                          ? { background: 'rgba(232,170,20,0.10)', border: '1px solid rgba(232,170,20,0.35)' }
                          : { border: '1px solid var(--c-border)' }}>

                        {/* Nombre + puntaje total */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm w-6 text-center shrink-0">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                          </span>
                          <span className="flex-1 font-semibold truncate text-sm" style={{ color: 'var(--c-text)' }}>
                            {p.displayName}
                            {p.cheatCount > 0 && (
                              <span className="ml-1 text-xs" style={{ color: '#FF5714' }}>🚨×{p.cheatCount}</span>
                            )}
                          </span>
                          {isEditing ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs" style={{ color: 'var(--c-text3)' }}>Total:</span>
                              <input
                                type="number"
                                value={editPlayers.find(ep => ep.uid === p.uid)?.finalScore ?? p.finalScore}
                                onChange={e => setPlayerScore(p.uid, parseInt(e.target.value) || 0)}
                                className="w-16 text-center text-sm font-bold rounded-lg px-1 py-1 focus:outline-none"
                                style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: '#FF5714' }}
                              />
                              <span className="text-xs" style={{ color: 'var(--c-text3)' }}>pts</span>
                            </div>
                          ) : (
                            <span className="font-black tabular-nums shrink-0" style={{ color: '#FF5714' }}>
                              {p.finalScore}pts
                            </span>
                          )}
                        </div>

                        {/* Desglose por categoría */}
                        {h.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-8">
                            {h.categories.map(cat => {
                              const catScore = isEditing
                                ? (editPlayers.find(ep => ep.uid === p.uid)?.categoryScores[cat.id] ?? 0)
                                : (p.categoryScores[cat.id] ?? 0)
                              return (
                                <div key={cat.id} className="flex items-center gap-1 rounded-lg px-2 py-1"
                                  style={{ background: 'var(--c-surface2)' }}>
                                  <span className="text-xs" style={{ color: 'var(--c-text3)' }}>
                                    {cat.number}. {cat.name}:
                                  </span>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={catScore}
                                      onChange={e => setCatScore(p.uid, cat.id, parseInt(e.target.value) || 0)}
                                      className="w-12 text-center text-xs font-bold rounded px-1 py-0.5 focus:outline-none"
                                      style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: '#E8AA14' }}
                                    />
                                  ) : (
                                    <span className="text-xs font-bold" style={{ color: '#E8AA14' }}>{catScore}pts</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botones edición */}
                {isEditing && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(h.id)}
                      disabled={saving}
                      className="flex-1 text-white font-bold py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{ background: '#FF5714' }}
                    >
                      {saving ? 'Guardando...' : '✓ Guardar cambios'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                      style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Eliminar historial */}
                {!isEditing && (
                  confirmDelete === h.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs flex-1" style={{ color: 'var(--c-text3)' }}>
                        ¿Eliminar esta partida del historial?
                      </span>
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-xs text-white font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: '#ef4444' }}
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(h.id)}
                      className="w-full text-xs font-bold py-2 rounded-xl transition-colors"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      🗑 Eliminar del historial
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
