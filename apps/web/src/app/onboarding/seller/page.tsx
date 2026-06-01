'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth.store'
import type { AuthUser } from '@everafter/types'

const schema = z.object({
  zipCode:           z.string().optional(),
  pickupRadiusMiles: z.coerce.number().int().positive().optional(),
  sellerBio:         z.string().max(500).optional(),
})
type FormValues = z.infer<typeof schema>

export default function SellerOnboardingPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await apiClient.patch('/auth/me/onboarding/seller', values)
      const updated = await apiClient.get<AuthUser>('/auth/me')
      setUser(updated)
      router.push('/home')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function handleSkip() {
    try {
      await apiClient.patch('/auth/me/onboarding/seller', {})
      const updated = await apiClient.get<AuthUser>('/auth/me')
      setUser(updated)
      router.push('/home')
    } catch {
      router.push('/home')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-beige-100 px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-sage-500">Seller setup</p>
        <h1 className="mb-2 font-serif text-2xl text-stone-800">Set up your seller profile</h1>
        <p className="mb-8 text-sm text-stone-500">Helps buyers find your listings and coordinate pickups.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="zipCode" className="mb-1 block text-xs font-medium text-stone-600">ZIP code</label>
              <input id="zipCode" type="text" placeholder="98101" className="input" {...register('zipCode')} />
            </div>
            <div>
              <label htmlFor="pickupRadiusMiles" className="mb-1 block text-xs font-medium text-stone-600">Meetup radius (mi)</label>
              <input id="pickupRadiusMiles" type="number" min={1} placeholder="20" className="input" {...register('pickupRadiusMiles')} />
            </div>
          </div>

          <div>
            <label htmlFor="sellerBio" className="mb-1 block text-xs font-medium text-stone-600">
              Seller bio <span className="text-stone-400">(optional)</span>
            </label>
            <textarea id="sellerBio" rows={3} placeholder="Tell buyers about your wedding and the items you're selling…"
              className="input resize-none" {...register('sellerBio')} />
          </div>

          {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{serverError}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? 'Saving…' : 'Complete setup'}
            </button>
            <button type="button" onClick={handleSkip} className="btn-ghost w-full py-2 text-xs text-stone-400">
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
