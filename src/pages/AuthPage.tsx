import { Navigate } from 'react-router-dom'
import AuthForm from '../components/auth/AuthForm'
import { useAuthStore } from '../store/authStore'

export default function AuthPage() {
  const { firebaseUser, loading } = useAuthStore()

  if (loading) return null
  if (firebaseUser) return <Navigate to="/" replace />

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center p-4" style={{ background: 'var(--c-bg)' }}>
      <div className="text-center mb-8">
        <img src="/logo.svg" alt="BASTA" className="w-24 h-24 mx-auto mb-4 drop-shadow-2xl" />
        <h1
          className="text-6xl font-display font-semibold text-white"
          style={{ letterSpacing: '0.15em' }}
        >
          ¡BASTA!
        </h1>
        <p className="mt-2 text-sm font-medium" style={{ color: 'var(--c-text2)' }}>
          El juego de palabras más rápido
        </p>
      </div>
      <AuthForm onSuccess={() => {}} />
    </div>
  )
}
