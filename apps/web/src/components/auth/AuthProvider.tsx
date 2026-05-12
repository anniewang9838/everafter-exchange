'use client'

import { useEffect } from 'react'
import { onAuthChange, getMe } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setInitialized, clearUser } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true)
        try {
          const user = await getMe()
          setUser(user)
        } catch {
          clearUser()
        } finally {
          setLoading(false)
          setInitialized(true)
        }
      } else {
        clearUser()
        setInitialized(true)
      }
    })
    return () => unsubscribe()
  }, [setUser, setLoading, setInitialized, clearUser])

  return <>{children}</>
}
