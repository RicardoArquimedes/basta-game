import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { UserProfile } from '../types'

export async function register(email: string, password: string, displayName: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName })
  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    email,
    isAdmin: true,   // cualquier usuario registrado es admin
    isGuest: false,
    gamesPlayed: 0,
    totalScore: 0,
    createdAt: Date.now(),
  })
  return user
}

export async function login(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function loginAsGuest(displayName: string) {
  const { user } = await signInAnonymously(auth)
  await updateProfile(user, { displayName })
  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    email: '',
    isAdmin: false,
    isGuest: true,
    gamesPlayed: 0,
    totalScore: 0,
    createdAt: Date.now(),
  })
  return user
}

export async function linkGuestAccount(email: string, password: string, displayName: string) {
  const user = auth.currentUser
  if (!user) throw new Error('No hay sesión activa')
  const credential = EmailAuthProvider.credential(email, password)
  const { user: linked } = await linkWithCredential(user, credential)
  await updateProfile(linked, { displayName })
  await updateDoc(doc(db, 'users', linked.uid), {
    displayName,
    email,
    isGuest: false,
    isAdmin: true,   // convertir invitado a registrado = admin
  })
  return linked
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as UserProfile
}

export async function getOrCreateProfile(user: {
  uid: string
  displayName: string | null
  email: string | null
  isAnonymous: boolean
}): Promise<UserProfile> {
  const existing = await getUserProfile(user.uid)
  if (existing) {
    // Sincroniza isAdmin: cualquier usuario no-invitado es admin
    const shouldBeAdmin = !user.isAnonymous
    if (shouldBeAdmin !== existing.isAdmin) {
      await updateDoc(doc(db, 'users', user.uid), { isAdmin: shouldBeAdmin })
      return { ...existing, isAdmin: shouldBeAdmin }
    }
    return existing
  }
  const displayName = user.displayName || `Jugador_${user.uid.slice(0, 5)}`
  const profile = {
    displayName,
    email: user.email ?? '',
    isAdmin: !user.isAnonymous,
    isGuest: user.isAnonymous,
    gamesPlayed: 0,
    totalScore: 0,
    createdAt: Date.now(),
  }
  await setDoc(doc(db, 'users', user.uid), profile)
  return { uid: user.uid, ...profile }
}

export async function recordGameStats(uid: string, score: number) {
  await updateDoc(doc(db, 'users', uid), {
    gamesPlayed: increment(1),
    totalScore: increment(score),
  })
}

export async function updateDisplayName(uid: string, newName: string) {
  const trimmed = newName.trim()
  if (!trimmed) throw new Error('El nombre no puede estar vacío')
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: trimmed })
  }
  await updateDoc(doc(db, 'users', uid), { displayName: trimmed })
  return trimmed
}

export async function setAdminRole(uid: string, isAdmin: boolean) {
  await setDoc(doc(db, 'users', uid), { isAdmin }, { merge: true })
}

export async function resetPassword(email: string) {
  const trimmed = email.trim()
  if (!trimmed) throw new Error('Ingresa tu correo electrónico')
  await sendPasswordResetEmail(auth, trimmed)
}
