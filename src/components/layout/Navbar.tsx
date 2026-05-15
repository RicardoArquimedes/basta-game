import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { useThemeStore } from '../../store/themeStore'
import LinkAccountForm from '../auth/LinkAccountForm'

export default function Navbar() {
  const { profile, loading } = useAuthStore()
  const { game, players, activeGameId, reset } = useGameStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [showLink, setShowLink] = useState(false)
  const [showMyScore, setShowMyScore] = useState(false)
  const [scoreTab, setScoreTab] = useState<'mine' | 'table'>('mine')
  const [confirmLeave, setConfirmLeave] = useState(false)

  const isOnGamePage = location.pathname.startsWith('/game/')
  const isAdmin = profile?.isAdmin ?? false
  const isPlayer = !!profile && !isAdmin

  // Datos del jugador en la partida activa
  const myPlayer = players.find(p => p.uid === profile?.uid)

  async function handleSignOut() {
    reset()
    await signOut()
    navigate('/auth')
  }

  function handleLeaveGame() {
    // Navegar a home SIN borrar activeGameId → sirve como "deshacer" (Volver a partida)
    setConfirmLeave(false)
    navigate('/')
  }

  function handleNewGame() {
    // Limpiar juego activo y entrar al flujo de nueva partida en home
    reset()
    navigate('/')
  }

  return (
    <>
      <nav
        className="text-white px-3 py-2 flex items-center justify-between shadow-lg"
        style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)' }}
      >
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
          <img src="/logo.svg" alt="BASTA" className="h-9 w-9" />
          <span className="text-2xl font-display font-semibold tracking-wide hidden sm:block" style={{ color: 'var(--c-text)' }}>
            ¡BASTA!
          </span>
        </button>

        <div className="flex items-center gap-1.5">

          {/* ── Botones de partida para jugadores ─────────────────────── */}
          {!loading && isPlayer && (
            <>
              {/* En la pantalla del juego */}
              {isOnGamePage && (
                <>
                  {/* Ver mi puntaje */}
                  {myPlayer && (
                    <button
                      onClick={() => setShowMyScore(true)}
                      title="Ver mi puntaje"
                      className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(232,170,20,0.15)', color: '#E8AA14', border: '1px solid rgba(232,170,20,0.4)' }}
                    >
                      <span>⭐</span>
                      <span className="hidden sm:inline">{myPlayer.score}pts</span>
                    </button>
                  )}

                  {/* Salir de partida / Confirmar */}
                  {!confirmLeave ? (
                    <button
                      onClick={() => setConfirmLeave(true)}
                      title="Salir de partida"
                      className="text-xs font-bold px-2 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
                    >
                      <span className="sm:hidden">🚪</span>
                      <span className="hidden sm:inline">🚪 Salir de partida</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs hidden sm:block" style={{ color: 'var(--c-text3)' }}>¿Seguro?</span>
                      <button
                        onClick={handleLeaveGame}
                        className="text-xs font-bold px-2 py-1.5 rounded-lg text-white"
                        style={{ background: '#FF5714' }}
                      >
                        ✓ Sí
                      </button>
                      <button
                        onClick={() => setConfirmLeave(false)}
                        className="text-xs font-bold px-2 py-1.5 rounded-lg"
                        style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Fuera del juego: Volver (deshacer) + Nueva partida */}
              {!isOnGamePage && (
                <>
                  {/* Deshacer salir: volver a partida activa */}
                  {activeGameId && (
                    <button
                      onClick={() => navigate(`/game/${activeGameId}`)}
                      className="text-xs font-bold px-2 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(255,87,20,0.12)', color: '#FF5714', border: '1px solid rgba(255,87,20,0.4)' }}
                    >
                      <span className="sm:hidden">↩</span>
                      <span className="hidden sm:inline">↩ Volver a partida</span>
                    </button>
                  )}
                  {/* Entrar a nueva partida */}
                  <button
                    onClick={handleNewGame}
                    className="text-xs font-bold px-2 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
                  >
                    <span className="sm:hidden">🎮</span>
                    <span className="hidden sm:inline">🎮 Nueva partida</span>
                  </button>
                </>
              )}
            </>
          )}

          {/* Botón panel admin (solo admins, fuera de /admin) */}
          {!loading && isAdmin && location.pathname !== '/admin' && (
            <button
              onClick={() => navigate('/admin')}
              title="Panel de administración"
              className="text-xs font-bold px-2 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(255,87,20,0.12)', color: '#FF5714', border: '1px solid rgba(255,87,20,0.4)' }}
            >
              <span className="sm:hidden">⚙️</span>
              <span className="hidden sm:inline">⚙️ Admin</span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-base"
            style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {!loading && profile && (
            <>
              <div className="flex flex-col items-end cursor-pointer" onClick={() => navigate('/profile')}>
                <span className="text-sm font-medium hidden sm:block truncate max-w-[100px] leading-tight" style={{ color: 'var(--c-text)' }}>
                  {profile.displayName}
                </span>
                {profile.isGuest ? (
                  <span className="text-xs text-amber-400 font-semibold hidden sm:block leading-tight">
                    👤 Invitado · ver perfil
                  </span>
                ) : (
                  <span className="text-xs hidden sm:block leading-tight" style={{ color: 'var(--c-text3)' }}>ver perfil</span>
                )}
              </div>

              {profile.isGuest && (
                <button
                  onClick={() => setShowLink(true)}
                  className="sm:hidden text-xs bg-amber-500 hover:bg-amber-400 text-white px-2 py-1 rounded-lg font-bold transition-colors"
                >
                  👤
                </button>
              )}

              <button
                onClick={handleSignOut}
                className="text-xs px-2 py-1.5 rounded-lg transition-colors text-white"
                style={{ background: '#FF5714' }}
              >
                Salir
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Modal: Ver mi puntaje / tabla */}
      {showMyScore && myPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMyScore(false)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Tabs */}
            <div className="flex" style={{ borderBottom: '1px solid var(--c-border)' }}>
              {(['mine', 'table'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setScoreTab(tab)}
                  className="flex-1 py-3 text-sm font-bold transition-colors"
                  style={scoreTab === tab
                    ? { color: '#FF5714', borderBottom: '2px solid #FF5714' }
                    : { color: 'var(--c-text3)' }}
                >
                  {tab === 'mine' ? '⭐ Mi puntaje' : '📊 Tabla'}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {scoreTab === 'mine' && (
                <>
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--c-text3)' }}>
                      Mi puntaje
                    </p>
                    <p className="text-6xl font-black tabular-nums" style={{ color: '#FF5714' }}>
                      {myPlayer.score}
                    </p>
                    <p className="text-lg font-bold mt-1" style={{ color: 'var(--c-text)' }}>
                      {profile?.displayName}
                    </p>
                    {myPlayer.status === 'eliminated' && (
                      <p className="text-xs mt-1 font-semibold" style={{ color: '#E8AA14' }}>
                        ⚠️ Eliminado en esta categoría
                      </p>
                    )}
                  </div>

                  {game?.currentCategory && (
                    <div className="rounded-xl px-4 py-2 text-center" style={{ background: 'var(--c-surface2)' }}>
                      <p className="text-xs" style={{ color: 'var(--c-text3)' }}>Categoría actual</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>{game.currentCategory}</p>
                    </div>
                  )}

                  {players.length > 1 && (() => {
                    const sorted = [...players].sort((a, b) => b.score - a.score)
                    const rank = sorted.findIndex(p => p.uid === profile?.uid) + 1
                    return (
                      <p className="text-sm text-center" style={{ color: 'var(--c-text2)' }}>
                        Posición <span className="font-black" style={{ color: '#FF5714' }}>#{rank}</span> de {players.length} jugadores
                      </p>
                    )
                  })()}
                </>
              )}

              {scoreTab === 'table' && (
                <div className="space-y-1.5">
                  {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                    <div key={p.uid}
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={p.uid === profile?.uid
                        ? { background: 'rgba(255,87,20,0.08)', border: '2px solid #FF5714' }
                        : i === 0
                          ? { background: 'rgba(232,170,20,0.12)', border: '1px solid rgba(232,170,20,0.4)' }
                          : { border: '1px solid var(--c-border)' }}>
                      <span className="text-base w-6 text-center shrink-0">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className="flex-1 font-semibold truncate" style={{ color: 'var(--c-text)' }}>
                        {p.displayName}
                        {p.uid === profile?.uid && <span className="text-xs ml-1" style={{ color: '#FF5714' }}>(tú)</span>}
                        {p.status === 'eliminated' && <span className="text-xs ml-1" style={{ color: 'var(--c-text3)' }}>·elim.</span>}
                      </span>
                      <span className="font-black tabular-nums shrink-0" style={{ color: '#FF5714' }}>{p.score}pts</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowMyScore(false)}
                className="w-full text-white font-display font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: '#FF5714' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vincular cuenta */}
      {showLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm" style={{ background: 'var(--c-surface)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#FF5714' }}>Vincular cuenta</h2>
            <LinkAccountForm onClose={() => setShowLink(false)} />
          </div>
        </div>
      )}
    </>
  )
}
