import { Navigate } from 'react-router-dom'
import AuthForm from '../components/auth/AuthForm'
import { useAuthStore } from '../store/authStore'

export default function AuthPage() {
  const { firebaseUser, loading } = useAuthStore()

  if (loading) return null
  if (firebaseUser) return <Navigate to="/" replace />

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-brand-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-6xl font-black text-brand-700 tracking-tighter">¡BASTA!</h1>
        <p className="text-gray-500 mt-1">El juego de palabras más rápido</p>
      </div>
      <AuthForm onSuccess={() => {}} />
    </div>
  )
}
