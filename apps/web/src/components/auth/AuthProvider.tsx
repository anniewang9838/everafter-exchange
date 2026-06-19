'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onAuthChange, getMe } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setInitialized, clearUser } = useAuthStore()
  const queryClient = useQueryClient()

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
        queryClient.clear()
        clearUser()
        setInitialized(true)
      }
    })
    return () => unsubscribe()
  }, [setUser, setLoading, setInitialized, clearUser, queryClient])

  return <>{children}</>
}
