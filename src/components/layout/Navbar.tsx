import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import LinkAccountForm from '../auth/LinkAccountForm'

export default function Navbar() {
  const { profile, loading } = useAuthStore()
  const { reset } = useGameStore()
  const navigate = useNavigate()
  const [showLink, setShowLink] = useState(false)

  async function handleSignOut() {
    reset()
    await signOut()
    navigate('/')
  }

  return (
    <>
      <nav className="text-white px-4 py-2 flex items-center justify-between shadow-lg" style={{ background: '#353531' }}>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.svg" alt="BASTA" className="h-9 w-9" />
          <span className="text-2xl font-display font-semibold tracking-wide text-white">¡BASTA!</span>
        </button>

        {!loading && profile && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end cursor-pointer" onClick={() => navigate('/profile')}>
              <span className="text-sm font-medium hidden sm:block truncate max-w-[120px] leading-tight hover:text-brand-200 transition-colors">
                {profile.displayName}
              </span>
              {profile.isGuest ? (
                <span className="text-xs text-amber-300 font-semibold hidden sm:block leading-tight">
                  👤 Invitado · ver perfil
                </span>
              ) : (
                <span className="text-xs text-brand-200 hidden sm:block leading-tight">ver perfil</span>
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
              className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ background: '#016FB9' }}
            >
              Salir
            </button>
          </div>
        )}
      </nav>

      {/* Modal vincular cuenta */}
      {showLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-brand-700 mb-4">Vincular cuenta</h2>
            <LinkAccountForm onClose={() => setShowLink(false)} />
          </div>
        </div>
      )}
    </>
  )
}
