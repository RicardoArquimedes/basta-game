import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { getOrCreateProfile, signOut } from './services/authService'
import { seedCategories } from './services/categoryService'
import { useAuthStore } from './store/authStore'
import Navbar from './components/layout/Navbar'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import GamePage from './pages/GamePage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-charcoal z-50">
      <img src="/logo.svg" alt="BASTA" className="w-28 h-28 mb-4 animate-bounce-in" />
      <p className="text-4xl font-display font-semibold text-white tracking-wide mb-6">¡BASTA!</p>
      <div className="h-8 w-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  async function handleSignOut() {
    await signOut()
    window.location.reload()
  }

  const isPermissions = message.toLowerCase().includes('permission')

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-charcoal z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-black text-gray-800">Algo salió mal</h2>

        {isPermissions ? (
          <div className="text-left space-y-2">
            <p className="text-sm text-gray-600">
              Firestore no tiene permisos configurados. Ve a Firebase Console y actualiza las reglas:
            </p>
            <a
              href="https://console.firebase.google.com/project/basta-ya-app/firestore/rules"
              target="_blank"
              rel="noreferrer"
              className="block bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-700 font-mono break-all hover:bg-orange-100 transition-colors"
            >
              Firebase Console → Firestore → Reglas
            </a>
            <div className="bg-gray-900 rounded-xl p-3 text-left">
              <p className="text-xs text-gray-400 mb-1">Pega estas reglas:</p>
              <pre className="text-xs text-green-400 whitespace-pre-wrap">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{message}</p>
        )}

        <button
          onClick={handleSignOut}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm font-body"
        >
          Cerrar sesión e intentar de nuevo
        </button>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { firebaseUser, loading } = useAuthStore()
  if (loading) return <FullScreenLoader />
  if (!firebaseUser) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  const { setFirebaseUser, setProfile, setLoading, setError, error } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setFirebaseUser(user)
      setError(null)
      if (user) {
        try {
          const profile = await getOrCreateProfile(user)
          setProfile(profile)
          // Solo seed cuando ya tenemos permisos
          seedCategories().catch(() => {})
        } catch (err: any) {
          console.error('Error cargando perfil:', err)
          setError(err?.message ?? 'Error desconocido')
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  if (error) return <ErrorScreen message={error} />

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/game/:gameId" element={<RequireAuth><GamePage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
