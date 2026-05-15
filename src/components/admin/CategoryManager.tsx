import { useRef, useState } from 'react'
import type { Category } from '../../types'
import {
  addCategory, toggleCategory, toggleExcludeFromRandom,
  updateCategoryName, deleteCategory, reorderCategories,
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

  // Drag & drop
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    const maxOrder = categories.reduce((m, c, i) => Math.max(m, c.order ?? i), -1)
    await addCategory(newName.trim(), adminUid, maxOrder + 1)
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

  // ── Drag & drop handlers ────────────────────────────────────────────────────
  function handleDragStart(index: number) {
    dragIndex.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex.current !== null && dragIndex.current !== index) {
      setDragOverIndex(index)
    }
  }

  function handleDragLeave() {
    setDragOverIndex(null)
  }

  async function handleDrop(dropIndex: number) {
    const fromIndex = dragIndex.current
    dragIndex.current = null
    setDragOverIndex(null)
    if (fromIndex === null || fromIndex === dropIndex) return

    // Reordenar array localmente
    const reordered = [...categories]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)

    // Persistir todos los nuevos órdenes
    await reorderCategories(reordered.map((c, i) => ({ id: c.id, order: i })))
    onRefresh()
  }

  function handleDragEnd() {
    dragIndex.current = null
    setDragOverIndex(null)
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
        🎲 {activeCount} categorías en el sorteo aleatorio · <span style={{ color: 'var(--c-text3)' }}>arrastra ⠿ para reordenar</span>
      </p>

      <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
        {categories.map((cat, index) => {
          const isEditing = editingId === cat.id
          const isConfirmingDelete = confirmDeleteId === cat.id
          const isDragTarget = dragOverIndex === index

          return (
            <div
              key={cat.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className="rounded-lg overflow-hidden transition-all"
              style={{
                border: isDragTarget
                  ? '2px solid #FF5714'
                  : '1px solid var(--c-border)',
                transform: isDragTarget ? 'scale(1.01)' : 'scale(1)',
                opacity: dragIndex.current === index ? 0.45 : 1,
              }}
            >
              {/* Fila principal */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  background: cat.isActive ? 'var(--c-surface2)' : 'transparent',
                  opacity: cat.isActive ? 1 : 0.55,
                }}
              >
                {/* Handle de arrastre */}
                <span
                  title="Arrastrar para reordenar"
                  className="text-base shrink-0 cursor-grab active:cursor-grabbing select-none"
                  style={{ color: 'var(--c-text3)', lineHeight: 1 }}
                >
                  ⠿
                </span>

                {isEditing ? (
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
