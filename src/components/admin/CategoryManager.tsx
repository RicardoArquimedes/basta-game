import { useState } from 'react'
import type { Category } from '../../types'
import { addCategory, toggleCategory, toggleExcludeFromRandom } from '../../services/categoryService'

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

  async function handleToggleActive(cat: Category) {
    await toggleCategory(cat.id, !cat.isActive)
    onRefresh()
  }

  async function handleToggleRandom(cat: Category) {
    await toggleExcludeFromRandom(cat.id, !cat.excludeFromRandom)
    onRefresh()
  }

  const activeCount = categories.filter(c => c.isActive && !c.excludeFromRandom).length

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nueva categoría..."
          className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          style={{ background: '#FF5714' }}
        >
          + Agregar
        </button>
      </form>

      <p className="text-xs" style={{ color: 'var(--c-text3)' }}>
        🎲 {activeCount} categorías en el sorteo aleatorio
      </p>

      <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
        {categories.map(cat => (
          <div
            key={cat.id}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: cat.isActive ? 'var(--c-surface2)' : 'transparent',
              border: '1px solid var(--c-border)',
              opacity: cat.isActive ? 1 : 0.5,
            }}
          >
            <span
              className="flex-1 text-sm truncate"
              style={{ color: cat.isActive ? 'var(--c-text)' : 'var(--c-text3)', textDecoration: cat.isActive ? 'none' : 'line-through' }}
            >
              {cat.name}
              {cat.isCustom && <span className="ml-1 text-xs" style={{ color: '#FF5714' }}>✦</span>}
            </span>

            {/* Excluir del sorteo */}
            <button
              onClick={() => handleToggleRandom(cat)}
              disabled={!cat.isActive}
              title={cat.excludeFromRandom ? 'Excluida del sorteo — clic para incluir' : 'Incluida en el sorteo — clic para excluir'}
              className="w-7 h-7 rounded-md text-sm transition-colors disabled:opacity-30"
              style={cat.excludeFromRandom
                ? { background: 'var(--c-surface)', color: 'var(--c-text3)', border: '1px solid var(--c-border)' }
                : { background: 'rgba(110,235,131,0.15)', color: '#6EEB83', border: '1px solid rgba(110,235,131,0.4)' }}
            >
              🎲
            </button>

            {/* Activa / Inactiva */}
            <button
              onClick={() => handleToggleActive(cat)}
              className="text-xs font-bold px-2 py-1 rounded-md transition-colors"
              style={cat.isActive
                ? { background: 'rgba(110,235,131,0.12)', color: '#6EEB83' }
                : { background: 'var(--c-surface)', color: 'var(--c-text3)' }}
            >
              {cat.isActive ? 'Activa' : 'Inactiva'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
