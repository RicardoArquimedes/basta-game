import { useState } from 'react'
import type { Category } from '../../types'
import { addCategory, toggleCategory } from '../../services/categoryService'

interface Props {
  categories: Category[]
  adminUid: string
  onRefresh: () => void
}

export default function CategoryManager({ categories, adminUid, onRefresh }: Props) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    await addCategory(newName.trim(), adminUid)
    setNewName('')
    onRefresh()
    setSaving(false)
  }

  async function handleToggle(cat: Category) {
    await toggleCategory(cat.id, !cat.isActive)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nueva categoría..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
        >
          + Agregar
        </button>
      </form>

      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
            <span className={`flex-1 text-sm truncate ${cat.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
              {cat.name}
              {cat.isCustom && <span className="ml-1 text-xs text-brand-400">✦</span>}
            </span>
            <button
              onClick={() => handleToggle(cat)}
              className={`text-xs font-bold px-2 py-1 rounded-md transition-colors
                ${cat.isActive
                  ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-500'
                  : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'}
              `}
            >
              {cat.isActive ? 'Activa' : 'Inactiva'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
