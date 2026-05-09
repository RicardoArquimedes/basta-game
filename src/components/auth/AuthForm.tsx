import { useState } from 'react'
import { register, login, loginAsGuest } from '../../services/authService'

interface Props {
  onSuccess: () => void
}

type Mode = 'login' | 'register' | 'guest'

export default function AuthForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function clear() { setError(''); setName(''); setEmail(''); setPassword('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'guest') {
        if (!name.trim()) { setError('Ingresa un apodo'); setLoading(false); return }
        await loginAsGuest(name.trim())
      } else if (mode === 'register') {
        if (!name.trim()) { setError('Ingresa tu nombre'); setLoading(false); return }
        await register(email, password, name.trim())
      } else {
        await login(email, password)
      }
      onSuccess()
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/email-already-in-use': 'El correo ya está registrado',
        'auth/invalid-email':        'Correo inválido',
        'auth/weak-password':        'Contraseña muy débil (mín. 6 caracteres)',
        'auth/user-not-found':       'Usuario no encontrado',
        'auth/wrong-password':       'Contraseña incorrecta',
        'auth/invalid-credential':   'Credenciales incorrectas',
      }
      setError(msg[err.code] ?? 'Ocurrió un error, intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-auto">
      {/* Tab selector */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
        {(['login', 'register', 'guest'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); clear() }}
            className={`flex-1 py-2 text-sm font-bold transition-colors
              ${mode === m ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50'}
            `}
          >
            {m === 'login' ? 'Entrar' : m === 'register' ? 'Registro' : '👤 Invitado'}
          </button>
        ))}
      </div>

      {mode === 'guest' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
          Como invitado puedes jugar y acumular estadísticas. Si limpias el navegador perderás tu sesión, pero puedes vincular un correo después.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {(mode === 'register' || mode === 'guest') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'guest' ? 'Apodo / Nickname' : 'Nombre'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={mode === 'guest' ? 'Ej: ElRápido99' : '¿Cómo te llamas?'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
        )}

        {mode !== 'guest' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
          </>
        )}

        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors"
        >
          {loading
            ? 'Cargando...'
            : mode === 'login'
              ? 'Iniciar sesión'
              : mode === 'register'
                ? 'Crear cuenta'
                : 'Entrar como invitado'}
        </button>
      </form>

      {mode === 'login' && (
        <p className="text-center text-sm text-gray-500 mt-4">
          ¿No tienes cuenta?{' '}
          <button onClick={() => { setMode('register'); clear() }} className="text-brand-600 font-semibold hover:underline">
            Regístrate
          </button>
        </p>
      )}
    </div>
  )
}
