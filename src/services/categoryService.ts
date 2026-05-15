import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_CATEGORIES } from '../constants'
import type { Category } from '../types'

export async function seedCategories() {
  const snap = await getDocs(collection(db, 'categories'))
  if (!snap.empty) return
  for (const cat of DEFAULT_CATEGORIES) {
    await addDoc(collection(db, 'categories'), {
      name: cat.name,
      isCustom: false,
      addedBy: 'system',
      isActive: true,
      excludeFromRandom: false,
      createdAt: Date.now(),
    })
  }
}

// Agrega categorías nuevas que no existan todavía en la BD
export async function seedMissingCategories() {
  const snap = await getDocs(collection(db, 'categories'))
  const existingNames = new Set(snap.docs.map(d => (d.data().name as string).toLowerCase()))
  for (const cat of DEFAULT_CATEGORIES) {
    if (!existingNames.has(cat.name.toLowerCase())) {
      await addDoc(collection(db, 'categories'), {
        name: cat.name,
        isCustom: false,
        addedBy: 'system',
        isActive: true,
        excludeFromRandom: false,
        createdAt: Date.now(),
      })
    }
  }
}

export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(collection(db, 'categories'))
  const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category)
  return cats.sort((a, b) => {
    const aHas = a.order !== undefined
    const bHas = b.order !== undefined
    if (aHas && bHas) return a.order! - b.order!
    if (!aHas && !bHas) return a.createdAt - b.createdAt
    return aHas ? -1 : 1   // las ordenadas manualmente van primero
  })
}

export async function addCategory(name: string, addedBy: string, order?: number): Promise<Category> {
  const now = Date.now()
  const data: Record<string, unknown> = {
    name,
    isCustom: true,
    addedBy,
    isActive: true,
    excludeFromRandom: false,
    createdAt: now,
  }
  if (order !== undefined) data.order = order
  const ref = await addDoc(collection(db, 'categories'), data)
  return { id: ref.id, name, isCustom: true, addedBy, isActive: true, excludeFromRandom: false, createdAt: now, order }
}

export async function toggleCategory(id: string, isActive: boolean) {
  await updateDoc(doc(db, 'categories', id), { isActive })
}

export async function toggleExcludeFromRandom(id: string, exclude: boolean) {
  await updateDoc(doc(db, 'categories', id), { excludeFromRandom: exclude })
}

export async function updateCategoryName(id: string, name: string) {
  await updateDoc(doc(db, 'categories', id), { name: name.trim() })
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, 'categories', id))
}

/** Guarda el campo `order` para todas las categorías recibidas en una sola operación. */
export async function reorderCategories(updates: Array<{ id: string; order: number }>) {
  const batch = writeBatch(db)
  for (const { id, order } of updates) {
    batch.update(doc(db, 'categories', id), { order })
  }
  await batch.commit()
}

/** Elimina varias categorías en un solo batch. */
export async function deleteManyCategories(ids: string[]) {
  const batch = writeBatch(db)
  for (const id of ids) {
    batch.delete(doc(db, 'categories', id))
  }
  await batch.commit()
}

/** Cambia `excludeFromRandom` en varias categorías en un solo batch. */
export async function bulkSetExcludeFromRandom(ids: string[], exclude: boolean) {
  const batch = writeBatch(db)
  for (const id of ids) {
    batch.update(doc(db, 'categories', id), { excludeFromRandom: exclude })
  }
  await batch.commit()
}
