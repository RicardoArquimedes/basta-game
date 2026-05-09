import { useState } from 'react'
import { linkGuestAccount } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'

export default function LinkAccountForm({ onClose }: { onClose: () => void }) {
  const { profile, setProfile } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState(profile?.displayName ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await linkGuestAccount(email, password, name.trim())
      setProfile({ ...profile!, displayName: name.trim(), email, isGuest: false })
      setDone(true)
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/email-already-in-use': 'Ese correo ya tiene una cuenta',
        'auth/invalid-email':        'Correo inválido',
        'auth/weak-password':        'Contraseña muy débil (mín. 6 caracteres)',
        'auth/provider-already-linked': 'Esta cuenta ya está vinculada',
      }
      setError(msg[err.code] ?? 'Error al vincular, intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-3 py-2">
        <div className="text-4xl">🎉</div>
        <p className="font-bold text-green-600">¡Cuenta vinculada!</p>
        <p className="text-sm text-gray-500">Tus estadísticas están guardadas de forma permanente.</p>
        <button onClick={onClose} className="bg-brand-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-brand-700 transition-colors">
          Cerrar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-gray-500">Vincula un correo para no perder tus estadísticas aunque cambies de dispositivo.</p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
        />
      </div>
      {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg p-2">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-xl hover:bg-gray-200 transition-colors text-sm">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl transition-colors text-sm">
          {loading ? 'Vinculando...' : 'Vincular cuenta'}
        </button>
      </div>
    </form>
  )
}
