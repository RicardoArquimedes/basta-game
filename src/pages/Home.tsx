import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { createGame, findGameByCode, joinGame } from '../services/gameService'

export default function Home() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<null | 'create' | 'join'>(null)
  const [code, setCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(6)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!profile) return null

  const isAdmin = profile.isAdmin

  async function handleCreate() {
    setError('')
    setLoading(true)
    try {
      const game = await createGame(profile!.uid, profile!.displayName, maxPlayers)
      navigate(`/game/${game.id}`)
    } catch {
      setError('Error al crear la partida')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    setError('')
    if (!code.trim()) { setError('Ingresa el código'); return }
    setLoading(true)
    try {
      const game = await findGameByCode(code.trim())
      if (!game) { setError('Partida no encontrada o ya inició'); setLoading(false); return }
      await joinGame(game.id, profile!.uid, profile!.displayName)
      navigate(`/game/${game.id}`)
    } catch (e: any) {
      setError(e.message ?? 'Error al unirse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center p-4" style={{ background: 'var(--c-bg)' }}>
      <div className="text-center mb-8">
        <img src="/logo.svg" alt="BASTA" className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-4 drop-shadow-2xl" />
        <h1
          className="text-6xl sm:text-8xl font-display font-semibold text-white drop-shadow-lg"
          style={{ letterSpacing: '0.12em' }}
        >
          ¡BASTA!
        </h1>
        <p className="mt-3" style={{ color: 'var(--c-text2)' }}>
          Hola, <span className="font-bold" style={{ color: '#E8AA14' }}>{profile.displayName}</span>
          {isAdmin && (
            <span className="ml-2 text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FF5714' }}>
              Admin
            </span>
          )}
        </p>
        {isAdmin && (
          <p className="text-xs text-gray-500 mt-1">Como admin, diriges la partida pero no juegas</p>
        )}
      </div>

      {!mode && (
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          {isAdmin ? (
            <>
              <button
                onClick={() => setMode('create')}
                className="flex-1 text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{ background: '#FF5714' }}
              >
                🎲 Crear partida
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex-1 text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(27,231,255,0.15)', border: '1px solid rgba(27,231,255,0.35)', color: '#1BE7FF' }}
              >
                ⚙️ Categorías
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode('join')}
                className="flex-1 text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{ background: '#FF5714' }}
              >
                🔑 Unirse a partida
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="flex-1 font-display font-semibold text-lg py-4 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(27,231,255,0.15)', border: '1px solid rgba(27,231,255,0.35)', color: '#1BE7FF' }}
              >
                👤 Mi perfil
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'create' && (
        <div className="rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <h2 className="text-xl font-display font-semibold" style={{ color: '#FF5714' }}>Nueva partida</h2>
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--c-text2)' }}>Máximo de jugadores</label>
            <div className="flex gap-2 flex-wrap">
              {[2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setMaxPlayers(n)}
                  className="w-10 h-10 rounded-lg font-bold text-sm transition-colors"
                  style={maxPlayers === n
                    ? { background: '#FF5714', color: 'white' }
                    : { background: '#f3f4f6', color: '#374151' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setMode(null); setError('') }}
              className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={loading}
              className="flex-1 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors"
              style={{ background: '#FF5714' }}>
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <h2 className="text-xl font-display font-semibold" style={{ color: '#FF5714' }}>Unirse a partida</h2>
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Código de partida</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123" maxLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-xl font-bold tracking-widest focus:outline-none"
              style={{ '--tw-ring-color': '#016FB9' } as React.CSSProperties} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setMode(null); setError('') }}
              className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button onClick={handleJoin} disabled={loading}
              className="flex-1 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors"
              style={{ background: '#FF5714' }}>
              {loading ? 'Buscando...' : 'Unirse'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
