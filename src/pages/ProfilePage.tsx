import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import LinkAccountForm from '../components/auth/LinkAccountForm'
import { updateDisplayName } from '../services/authService'

export default function ProfilePage() {
  const { profile, setProfile } = useAuthStore()
  const navigate = useNavigate()
  const [showLink, setShowLink] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!profile) { navigate('/auth'); return null }

  const avg = profile.gamesPlayed > 0
    ? Math.round(profile.totalScore / profile.gamesPlayed)
    : 0

  function startEditing() {
    setNameInput(profile!.displayName)
    setSaveError(null)
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setSaveError(null)
  }

  async function handleSave() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateDisplayName(profile!.uid, trimmed)
      setProfile({ ...profile!, displayName: trimmed })
      setEditing(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar el nombre')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto p-4 space-y-4">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-6 text-white text-center">
        <div className="text-5xl mb-2">{profile.isGuest ? '👤' : '🎮'}</div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              disabled={saving}
              autoFocus
              style={{
                background: 'var(--c-input, rgba(255,255,255,0.15))',
                border: '1px solid var(--c-border, rgba(255,255,255,0.4))',
                color: 'var(--c-text, #fff)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '1.1rem',
                fontWeight: 700,
                textAlign: 'center',
                width: '100%',
                outline: 'none',
              }}
            />
            {saveError && (
              <p style={{ color: '#fca5a5', fontSize: '0.75rem', margin: 0 }}>{saveError}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={handleSave}
                disabled={saving || !nameInput.trim()}
                style={{
                  background: 'var(--c-surface, rgba(255,255,255,0.9))',
                  color: 'var(--c-text, #1e3a5f)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 14px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                style={{
                  background: 'transparent',
                  color: 'var(--c-text3, rgba(255,255,255,0.7))',
                  border: '1px solid var(--c-border, rgba(255,255,255,0.4))',
                  borderRadius: '8px',
                  padding: '5px 14px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <h1 className="text-2xl font-black">{profile.displayName}</h1>
            <button
              onClick={startEditing}
              title="Editar nombre"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                padding: '2px 4px',
                borderRadius: '4px',
                opacity: 0.8,
              }}
            >
              ✏️
            </button>
          </div>
        )}

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
