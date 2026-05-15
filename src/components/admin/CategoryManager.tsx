import { useRef, useState } from 'react'
import type { Category } from '../../types'
import {
  addCategory, toggleCategory, toggleExcludeFromRandom,
  updateCategoryName, deleteCategory, reorderCategories,
  deleteManyCategories, bulkSetExcludeFromRandom,
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

  // Confirmación eliminar individual
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Drag & drop
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // ── Selección múltiple ────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkWorking, setBulkWorking] = useState(false)

  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() { setSelectedIds(new Set(categories.map(c => c.id))) }
  function selectNone() { setSelectedIds(new Set()) }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setConfirmBulkDelete(false)
  }

  async function handleBulkDelete() {
    setBulkWorking(true)
    await deleteManyCategories([...selectedIds])
    exitSelectionMode()
    onRefresh()
    setBulkWorking(false)
  }

  async function handleBulkRandom(exclude: boolean) {
    setBulkWorking(true)
    await bulkSetExcludeFromRandom([...selectedIds], exclude)
    exitSelectionMode()
    onRefresh()
    setBulkWorking(false)
  }

  // ── Individual ────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    const maxOrder = categories.reduce((m, c, i) => Math.max(m, c.order ?? i), -1)
    const newCat = await addCategory(newName.trim(), adminUid, 0)
    await reorderCategories([
      { id: newCat.id, order: 0 },
      ...categories.map((c, i) => ({ id: c.id, order: i + 1 })),
    ])
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

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function handleDragStart(index: number) { dragIndex.current = index }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex.current !== null && dragIndex.current !== index) setDragOverIndex(index)
  }

  function handleDragLeave() { setDragOverIndex(null) }

  async function handleDrop(dropIndex: number) {
    const fromIndex = dragIndex.current
    dragIndex.current = null
    setDragOverIndex(null)
    if (fromIndex === null || fromIndex === dropIndex) return
    const reordered = [...categories]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    await reorderCategories(reordered.map((c, i) => ({ id: c.id, order: i })))
    onRefresh()
  }

  function handleDragEnd() { dragIndex.current = null; setDragOverIndex(null) }

  const activeCount = categories.filter(c => c.isActive && !c.excludeFromRandom).length
  const selectedCount = selectedIds.size

  return (
    <div className="space-y-3">
      {/* Formulario agregar */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nueva categoría..."
          className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="shrink-0 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          style={{ background: '#FF5714' }}
        >
          + Agregar
        </button>
      </form>

      {/* Barra de estado + botón seleccionar */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--c-text3)' }}>
          🎲 {activeCount} en el sorteo aleatorio
        </p>
        {!selectionMode ? (
          <button
            onClick={() => setSelectionMode(true)}
            className="text-xs font-bold px-3 py-1 rounded-lg transition-colors"
            style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
          >
            ☑ Seleccionar
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={selectAll} className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--c-text3)' }}>Todas</button>
            <button onClick={selectNone} className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--c-text3)' }}>Ninguna</button>
            <button
              onClick={exitSelectionMode}
              className="text-xs font-bold px-3 py-1 rounded-lg transition-colors"
              style={{ background: 'var(--c-surface2)', color: 'var(--c-text2)' }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Barra de acciones bulk (solo en modo selección con algo seleccionado) */}
      {selectionMode && selectedCount > 0 && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--c-text2)' }}>
            {selectedCount} categoría{selectedCount !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
          </p>

          {!confirmBulkDelete ? (
            <div className="flex flex-wrap gap-2">
              {/* Incluir en sorteo */}
              <button
                onClick={() => handleBulkRandom(false)}
                disabled={bulkWorking}
                className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(110,235,131,0.15)', color: '#6EEB83', border: '1px solid rgba(110,235,131,0.4)' }}
              >
                {bulkWorking ? '...' : '🎲 Incluir en sorteo'}
              </button>
              {/* Excluir del sorteo */}
              <button
                onClick={() => handleBulkRandom(true)}
                disabled={bulkWorking}
                className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'var(--c-surface)', color: 'var(--c-text3)', border: '1px solid var(--c-border)' }}
              >
                {bulkWorking ? '...' : '🚫 Excluir del sorteo'}
              </button>
              {/* Eliminar */}
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={bulkWorking}
                className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                🗑 Eliminar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: '#ef4444' }}>
                ¿Eliminar {selectedCount} categoría{selectedCount !== 1 ? 's' : ''}? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkWorking}
                  className="text-xs text-white font-bold px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  style={{ background: '#ef4444' }}
                >
                  {bulkWorking ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  disabled={bulkWorking}
                  className="text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'var(--c-surface)', color: 'var(--c-text2)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
        {categories.map((cat, index) => {
          const isEditing = editingId === cat.id
          const isConfirmingDelete = confirmDeleteId === cat.id
          const isDragTarget = dragOverIndex === index
          const isSelected = selectedIds.has(cat.id)

          return (
            <div
              key={cat.id}
              draggable={!selectionMode}
              onDragStart={() => !selectionMode && handleDragStart(index)}
              onDragOver={e => !selectionMode && handleDragOver(e, index)}
              onDragLeave={() => !selectionMode && handleDragLeave()}
              onDrop={() => !selectionMode && handleDrop(index)}
              onDragEnd={() => !selectionMode && handleDragEnd()}
              className="rounded-lg overflow-hidden transition-all"
              style={{
                border: isSelected
                  ? '2px solid #FF5714'
                  : isDragTarget
                    ? '2px solid rgba(110,235,131,0.8)'
                    : '1px solid var(--c-border)',
                transform: isDragTarget ? 'scale(1.01)' : 'scale(1)',
                opacity: dragIndex.current === index ? 0.45 : 1,
                background: isSelected ? 'rgba(255,87,20,0.04)' : undefined,
              }}
            >
              {/* Fila principal */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  background: !isSelected && cat.isActive ? 'var(--c-surface2)' : 'transparent',
                  opacity: cat.isActive ? 1 : 0.55,
                }}
              >
                {/* Checkbox (modo selección) o handle (modo normal) */}
                {selectionMode ? (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(cat.id)}
                    className="w-4 h-4 shrink-0 accent-orange-500 cursor-pointer"
                  />
                ) : (
                  <span
                    title="Arrastrar para reordenar"
                    className="text-base shrink-0 cursor-grab active:cursor-grabbing select-none"
                    style={{ color: 'var(--c-text3)', lineHeight: 1 }}
                  >
                    ⠿
                  </span>
                )}

                {/* Nombre / input edición — clickeable para seleccionar en modo bulk */}
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
                    className={`flex-1 text-sm truncate ${selectionMode ? 'cursor-pointer' : ''}`}
                    onClick={() => selectionMode && toggleSelection(cat.id)}
                    style={{
                      color: cat.isActive ? 'var(--c-text)' : 'var(--c-text3)',
                      textDecoration: cat.isActive ? 'none' : 'line-through',
                    }}
                  >
                    {cat.name}
                    {cat.isCustom && <span className="ml-1 text-xs" style={{ color: '#FF5714' }}>✦</span>}
                  </span>
                )}

                {/* Acciones (ocultas en modo selección) */}
                {!selectionMode && (
                  isEditing ? (
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
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className="text-xs font-bold px-2 py-1 rounded-md transition-colors"
                        style={cat.isActive
                          ? { background: 'rgba(110,235,131,0.12)', color: '#6EEB83' }
                          : { background: 'var(--c-surface)', color: 'var(--c-text3)' }}
                      >
                        {cat.isActive ? 'Activa' : 'Inactiva'}
                      </button>
                      <button
                        onClick={() => startEdit(cat)}
                        title="Editar nombre"
                        className="w-7 h-7 rounded-md text-sm transition-colors"
                        style={{ background: 'var(--c-surface)', color: 'var(--c-text3)', border: '1px solid var(--c-border)' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => { setConfirmDeleteId(cat.id); setEditingId(null) }}
                        title="Eliminar categoría"
                        className="w-7 h-7 rounded-md text-sm transition-colors"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        🗑
                      </button>
                    </div>
                  )
                )}

                {/* Indicador sorteo en modo selección */}
                {selectionMode && (
                  <span className="shrink-0 text-base" title={cat.excludeFromRandom ? 'Excluida del sorteo' : 'Incluida en el sorteo'}>
                    {cat.excludeFromRandom ? '🚫' : '🎲'}
                  </span>
                )}
              </div>

              {/* Confirmación eliminar individual */}
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
