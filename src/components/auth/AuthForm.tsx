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

  const FLAME = '#FF5714'
  const AQUA  = '#1BE7FF'

  return (
    <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-auto" style={{ background: '#1a1a1a' }}>
      {/* Tab selector */}
      <div className="flex rounded-xl overflow-hidden mb-6" style={{ border: '1px solid #333' }}>
        {(['login', 'register', 'guest'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); clear() }}
            className="flex-1 py-2.5 text-sm font-bold transition-colors"
            style={mode === m
              ? { background: FLAME, color: 'white' }
              : { color: '#888', background: 'transparent' }}
          >
            {m === 'login' ? 'Entrar' : m === 'register' ? 'Registro' : '👤 Invitado'}
          </button>
        ))}
      </div>

      {mode === 'guest' && (
        <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: 'rgba(232,170,20,0.15)', color: '#E8AA14', border: '1px solid rgba(232,170,20,0.3)' }}>
          Como invitado puedes jugar y acumular estadísticas. Si limpias el navegador perderás tu sesión, pero puedes vincular un correo después.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {(mode === 'register' || mode === 'guest') && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#aaa' }}>
              {mode === 'guest' ? 'Apodo / Nickname' : 'Nombre'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={mode === 'guest' ? 'Ej: ElRápido99' : '¿Cómo te llamas?'}
              className="w-full rounded-xl px-4 py-3 text-white focus:outline-none transition-colors"
              style={{ background: '#2a2a2a', border: '1px solid #444' }}
              required
            />
          </div>
        )}

        {mode !== 'guest' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#aaa' }}>Correo</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-xl px-4 py-3 text-white focus:outline-none transition-colors"
                style={{ background: '#2a2a2a', border: '1px solid #444' }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#aaa' }}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full rounded-xl px-4 py-3 text-white focus:outline-none transition-colors"
                style={{ background: '#2a2a2a', border: '1px solid #444' }}
                required
              />
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-center rounded-xl p-2" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full disabled:opacity-50 text-white font-display font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
          style={{ background: FLAME, fontSize: '1.05rem', letterSpacing: '0.03em' }}
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
        <p className="text-center text-sm mt-4" style={{ color: '#666' }}>
          ¿No tienes cuenta?{' '}
          <button onClick={() => { setMode('register'); clear() }} className="font-semibold hover:underline" style={{ color: AQUA }}>
            Regístrate
          </button>
        </p>
      )}
    </div>
  )
}
