import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, orderBy, serverTimestamp,
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
      createdAt: Date.now(),
    })
  }
}

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, 'categories'), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Category)
}

export async function addCategory(name: string, addedBy: string): Promise<Category> {
  const ref = await addDoc(collection(db, 'categories'), {
    name,
    isCustom: true,
    addedBy,
    isActive: true,
    createdAt: Date.now(),
  })
  return { id: ref.id, name, isCustom: true, addedBy, isActive: true, createdAt: Date.now() }
}

export async function toggleCategory(id: string, isActive: boolean) {
  await updateDoc(doc(db, 'categories', id), { isActive })
}
