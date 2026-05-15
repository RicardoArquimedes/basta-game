import { useState } from 'react'
import type { Category } from '../../types'
import {
  addCategory, toggleCategory, toggleExcludeFromRandom,
  updateCategoryName, deleteCategory,
} from '../../services/categoryService'

interface Props {
  categories: Category[]
  adminUid: string
  onRefresh: () => void
}

export default function CategoryManager({ categories, adminUid, onRefresh }: Props) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Confirmación eliminar
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setConfirmDeleteId(null)
  }

  async function handleSaveEdit(catId: string) {
    if (!editName.trim()) return
    setEditSaving(true)
    await updateCategoryName(catId, editName.trim())
    setEditingId(null)
    onRefresh()
    setEditSaving(false)
  }

  async function handleDelete(catId: string) {
    await deleteCategory(catId)
    setConfirmDeleteId(null)
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

      <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
        {categories.map(cat => {
          const isEditing = editingId === cat.id
          const isConfirmingDelete = confirmDeleteId === cat.id

          return (
            <div key={cat.id} className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--c-border)' }}>

              {/* Fila principal */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  background: cat.isActive ? 'var(--c-surface2)' : 'transparent',
                  opacity: cat.isActive ? 1 : 0.55,
                }}
              >
                {isEditing ? (
                  /* Input de edición */
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit(cat.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 text-sm rounded-md px-2 py-1 focus:outline-none"
                    style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                  />
                ) : (
                  <span
                    className="flex-1 text-sm truncate"
                    style={{
                      color: cat.isActive ? 'var(--c-text)' : 'var(--c-text3)',
                      textDecoration: cat.isActive ? 'none' : 'line-through',
                    }}
                  >
                    {cat.name}
                    {cat.isCustom && <span className="ml-1 text-xs" style={{ color: '#FF5714' }}>✦</span>}
                  </span>
                )}

                {isEditing ? (
                  /* Guardar / Cancelar edición */
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={editSaving || !editName.trim()}
                      className="text-xs font-bold px-2.5 py-1 rounded-md disabled:opacity-40 transition-colors text-white"
                      style={{ background: '#FF5714' }}
                    >
                      {editSaving ? '...' : '✓'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs font-bold px-2.5 py-1 rounded-md transition-colors"
                      style={{ background: 'var(--c-surface)', color: 'var(--c-text2)' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Excluir del sorteo */}
                    <button
                      onClick={() => handleToggleRandom(cat)}
                      disabled={!cat.isActive}
                      title={cat.excludeFromRandom ? 'Excluida del sorteo' : 'Incluida en el sorteo'}
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

                    {/* Editar nombre */}
                    <button
                      onClick={() => startEdit(cat)}
                      title="Editar nombre"
                      className="w-7 h-7 rounded-md text-sm transition-colors"
                      style={{ background: 'var(--c-surface)', color: 'var(--c-text3)', border: '1px solid var(--c-border)' }}
                    >
                      ✏️
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={() => { setConfirmDeleteId(cat.id); setEditingId(null) }}
                      title="Eliminar categoría"
                      className="w-7 h-7 rounded-md text-sm transition-colors"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>

              {/* Confirmación eliminar */}
              {isConfirmingDelete && (
                <div className="flex items-center gap-2 px-3 py-2"
                  style={{ background: 'rgba(239,68,68,0.06)', borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                  <span className="text-xs flex-1" style={{ color: '#ef4444' }}>
                    ¿Eliminar «{cat.name}»?
                  </span>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-xs text-white font-bold px-3 py-1 rounded-lg transition-colors"
                    style={{ background: '#ef4444' }}
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
