'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isInitialized) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!user.onboardingComplete) {
      const dest = user.role === 'seller' ? '/onboarding/seller' : '/onboarding/buyer'
      router.replace(dest)
    }
  }, [user, isInitialized, router])

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-beige-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
      </div>
    )
  }

  if (!user || !user.onboardingComplete) return null

  return <>{children}</>
}
