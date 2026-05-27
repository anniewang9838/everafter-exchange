import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'
import { firebaseAuth } from '@/lib/auth/firebase'
import { apiClient } from '@/lib/api/client'
import type { AuthUser } from '@everafter/types'

export async function signUp(
  username: string,
  name: string,
  email: string,
  password: string,
  intent: 'buy' | 'sell',
): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
  try {
    return await apiClient.post<AuthUser>('/auth/signup', {
      username,
      name,
      email,
      firebaseUid: credential.user.uid,
      role: intent === 'sell' ? 'seller' : 'buyer',
    })
  } catch (err) {
    // API failed after Firebase user was created — delete the orphaned Firebase account
    await credential.user.delete().catch(() => {})
    throw err
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(firebaseAuth, email, password)
}

export async function logOut(): Promise<void> {
  await signOut(firebaseAuth)
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, callback)
}

export async function getMe(): Promise<AuthUser> {
  return apiClient.get<AuthUser>('/auth/me')
}
