import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import LinkAccountForm from '../components/auth/LinkAccountForm'

export default function ProfilePage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [showLink, setShowLink] = useState(false)

  if (!profile) { navigate('/auth'); return null }

  const avg = profile.gamesPlayed > 0
    ? Math.round(profile.totalScore / profile.gamesPlayed)
    : 0

  return (
    <div className="max-w-sm mx-auto p-4 space-y-4">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-6 text-white text-center">
        <div className="text-5xl mb-2">{profile.isGuest ? '👤' : '🎮'}</div>
        <h1 className="text-2xl font-black">{profile.displayName}</h1>
        {profile.isGuest && (
          <span className="text-xs bg-amber-400 text-amber-900 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
            Invitado
          </span>
        )}
        {!profile.isGuest && (
          <p className="text-sm opacity-75 mt-1">{profile.email}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Partidas', value: profile.gamesPlayed },
          { label: 'Pts totales', value: profile.totalScore },
          { label: 'Promedio', value: avg },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow p-3 text-center">
            <p className="text-2xl font-black text-brand-700">{s.value}</p>
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {profile.isGuest && !showLink && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-bold text-amber-800">Eres invitado</p>
          <p className="text-xs text-amber-700">
            Tus estadísticas se perderán si limpias el navegador. Vincula una cuenta para guardarlas de forma permanente.
          </p>
          <button
            onClick={() => setShowLink(true)}
            className="w-full bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold py-2 rounded-xl text-sm transition-colors"
          >
            Vincular cuenta con correo
          </button>
        </div>
      )}

      {showLink && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-bold text-brand-700 mb-3">Vincular cuenta</h2>
          <LinkAccountForm onClose={() => setShowLink(false)} />
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
      >
        ← Volver al inicio
      </button>
    </div>
  )
}
