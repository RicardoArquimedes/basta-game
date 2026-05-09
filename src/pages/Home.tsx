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
    <div className="min-h-[calc(100vh-56px)] bg-charcoal flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <img src="/logo.svg" alt="BASTA" className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-3 drop-shadow-2xl" />
        <h1 className="text-6xl sm:text-8xl font-display font-semibold text-white tracking-wide drop-shadow-lg">
          ¡BASTA!
        </h1>
        <p className="text-gray-400 mt-3 font-body">
          Hola, <span className="text-saffron-400 font-bold">{profile.displayName}</span>
          {isAdmin && (
            <span className="ml-2 bg-paprika-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                🎲 Crear partida
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-lg border border-white/20 transition-all hover:scale-105 active:scale-95"
              >
                ⚙️ Categorías
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode('join')}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                🔑 Unirse a partida
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-lg border border-white/20 transition-all hover:scale-105 active:scale-95"
              >
                👤 Mi perfil
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'create' && (
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
          <h2 className="text-xl font-display font-semibold text-brand-700">Nueva partida</h2>
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-2">Máximo de jugadores</label>
            <div className="flex gap-2 flex-wrap">
              {[2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setMaxPlayers(n)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors
                    ${maxPlayers === n ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-brand-100'}`}>
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
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
          <h2 className="text-xl font-display font-semibold text-brand-700">Unirse a partida</h2>
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Código de partida</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123" maxLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setMode(null); setError('') }}
              className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button onClick={handleJoin} disabled={loading}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
              {loading ? 'Buscando...' : 'Unirse'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
