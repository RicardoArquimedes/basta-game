import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { useThemeStore } from '../../store/themeStore'
import LinkAccountForm from '../auth/LinkAccountForm'

export default function Navbar() {
  const { profile, loading } = useAuthStore()
  const { reset } = useGameStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()
  const [showLink, setShowLink] = useState(false)

  async function handleSignOut() {
    reset()
    await signOut()
    navigate('/auth')
  }

  return (
    <>
      <nav
        className="text-white px-4 py-2 flex items-center justify-between shadow-lg"
        style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)' }}
      >
        <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo.svg" alt="BASTA" className="h-9 w-9" />
          <span className="text-2xl font-display font-semibold tracking-wide" style={{ color: 'var(--c-text)' }}>
            ¡BASTA!
          </span>
        </button>

        <div className="flex items-center gap-2">
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
                <span className="text-sm font-medium hidden sm:block truncate max-w-[120px] leading-tight" style={{ color: 'var(--c-text)' }}>
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
                className="text-xs px-3 py-1.5 rounded-lg transition-colors text-white"
                style={{ background: '#FF5714' }}
              >
                Salir
              </button>
            </>
          )}
        </div>
      </nav>

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
