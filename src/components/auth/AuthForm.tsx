import { useState } from 'react'
import { register, login, loginAsGuest, resetPassword } from '../../services/authService'

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

  // Recuperar contraseña
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  function clear() { setError(''); setName(''); setEmail(''); setPassword('') }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)
    try {
      await resetPassword(resetEmail)
      setResetSent(true)
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/invalid-email':  'Correo inválido',
        'auth/user-not-found': 'No existe una cuenta con ese correo',
      }
      setResetError(msg[err.code] ?? 'No se pudo enviar el correo, intenta de nuevo')
    } finally {
      setResetLoading(false)
    }
  }

  function closeReset() {
    setShowReset(false)
    setResetEmail('')
    setResetSent(false)
    setResetError('')
  }

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
    <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-auto" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
      {/* Tab selector */}
      <div className="flex rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--c-border)' }}>
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
              className="w-full rounded-xl px-4 py-3 focus:outline-none transition-colors"
              style={{ background: 'var(--c-input)', border: '1px solid var(--c-input-border)', color: 'var(--c-text)' }}
              required
            />
          </div>
        )}

        {mode !== 'guest' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--c-text2)' }}>Correo</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-xl px-4 py-3 focus:outline-none transition-colors"
                style={{ background: 'var(--c-input)', border: '1px solid var(--c-input-border)', color: 'var(--c-text)' }}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium" style={{ color: 'var(--c-text2)' }}>Contraseña</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setShowReset(true); setResetEmail(email) }}
                    className="text-xs hover:underline"
                    style={{ color: '#1BE7FF' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full rounded-xl px-4 py-3 focus:outline-none transition-colors"
                style={{ background: 'var(--c-input)', border: '1px solid var(--c-input-border)', color: 'var(--c-text)' }}
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
        <p className="text-center text-sm mt-4" style={{ color: 'var(--c-text2)' }}>
          ¿No tienes cuenta?{' '}
          <button onClick={() => { setMode('register'); clear() }} className="font-semibold hover:underline" style={{ color: '#1BE7FF' }}>
            Regístrate
          </button>
        </p>
      )}

      {/* Modal recuperar contraseña */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeReset}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="text-center">
              <div className="text-4xl mb-2">🔑</div>
              <h2 className="text-lg font-display font-semibold" style={{ color: '#FF5714' }}>
                Recuperar contraseña
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--c-text3)' }}>
                Te enviaremos un enlace para restablecer tu contraseña
              </p>
            </div>

            {resetSent ? (
              <div className="space-y-4">
                <div className="rounded-xl p-4 text-center space-y-1"
                  style={{ background: 'rgba(110,235,131,0.1)', border: '1px solid rgba(110,235,131,0.3)' }}>
                  <p className="text-2xl">✅</p>
                  <p className="text-sm font-bold" style={{ color: '#6EEB83' }}>¡Correo enviado!</p>
                  <p className="text-xs" style={{ color: 'var(--c-text3)' }}>
                    Revisa tu bandeja de entrada en <strong>{resetEmail}</strong> y sigue las instrucciones.
                  </p>
                </div>
                <button
                  onClick={closeReset}
                  className="w-full text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: '#FF5714' }}>
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--c-text2)' }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    autoFocus
                    required
                    className="w-full rounded-xl px-4 py-3 focus:outline-none"
                    style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                  />
                </div>

                {resetError && (
                  <p className="text-sm text-center rounded-xl p-2"
                    style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)' }}>
                    {resetError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail.trim()}
                  className="w-full disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: '#FF5714' }}>
                  {resetLoading ? 'Enviando...' : '📧 Enviar enlace de recuperación'}
                </button>

                <button
                  type="button"
                  onClick={closeReset}
                  className="w-full font-bold py-2.5 rounded-xl text-sm transition-colors"
                  style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}>
                  Cancelar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
