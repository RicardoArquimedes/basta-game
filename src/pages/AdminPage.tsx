import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { getCategories, seedCategories } from '../services/categoryService'
import CategoryManager from '../components/admin/CategoryManager'
import type { Category } from '../types'

export default function AdminPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) { navigate('/auth'); return }
    load()
  }, [profile])

  async function load() {
    setLoading(true)
    await seedCategories()
    const cats = await getCategories()
    setCategories(cats)
    setLoading(false)
  }

  if (!profile) return null

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-5 text-white">
        <h1 className="text-2xl font-black">Panel de Administración</h1>
        <p className="opacity-75 text-sm mt-1">Gestiona las categorías del juego</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 space-y-3">
        <h2 className="font-bold text-brand-700">Categorías</h2>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <CategoryManager categories={categories} adminUid={profile.uid} onRefresh={load} />
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 space-y-2 text-sm text-gray-500">
        <p className="font-semibold text-gray-700">Leyenda</p>
        <p>✦ = Categoría personalizada</p>
        <p>Activa = visible en el selector de rondas</p>
        <p>Inactiva = oculta del selector</p>
      </div>
    </div>
  )
}
