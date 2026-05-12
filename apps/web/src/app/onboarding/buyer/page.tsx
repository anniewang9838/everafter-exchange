'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth.store'
import type { AuthUser } from '@everafter/types'

const VENUE_STYLES = ['modern', 'rustic', 'garden', 'vintage', 'boho', 'ballroom', 'other'] as const

const schema = z.object({
  weddingDate:       z.string().optional(),
  venueStyle:        z.enum(VENUE_STYLES).optional(),
  guestCount:        z.coerce.number().int().positive().optional(),
  decorBudgetMin:    z.coerce.number().positive().optional(),
  decorBudgetMax:    z.coerce.number().positive().optional(),
  zipCode:           z.string().optional(),
  pickupRadiusMiles: z.coerce.number().int().positive().optional(),
})
type FormValues = z.infer<typeof schema>

export default function BuyerOnboardingPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await apiClient.patch('/auth/me/onboarding/buyer', values)
      const updated = await apiClient.get<AuthUser>('/auth/me')
      setUser(updated)
      router.push('/home')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-beige-100 px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-sage-500">Tell us about your event</p>
        <h1 className="mb-8 font-serif text-2xl text-stone-800">Personalize your experience</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div>
            <label htmlFor="weddingDate" className="mb-1 block text-xs font-medium text-stone-600">Wedding date</label>
            <input id="weddingDate" type="date" className="input" {...register('weddingDate')} />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-stone-600">Venue style</label>
            <div className="flex flex-wrap gap-2">
              {VENUE_STYLES.map((style) => (
                <label key={style} className="cursor-pointer">
                  <input type="radio" value={style} className="sr-only" {...register('venueStyle')} />
                  <span className="inline-flex rounded-full border border-taupe-300 px-3 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-sage-400">
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="guestCount" className="mb-1 block text-xs font-medium text-stone-600">Estimated guest count</label>
            <input id="guestCount" type="number" min={1} placeholder="100" className="input" {...register('guestCount')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="decorBudgetMin" className="mb-1 block text-xs font-medium text-stone-600">Budget min ($)</label>
              <input id="decorBudgetMin" type="number" min={0} placeholder="500" className="input" {...register('decorBudgetMin')} />
            </div>
            <div>
              <label htmlFor="decorBudgetMax" className="mb-1 block text-xs font-medium text-stone-600">Budget max ($)</label>
              <input id="decorBudgetMax" type="number" min={0} placeholder="3000" className="input" {...register('decorBudgetMax')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="zipCode" className="mb-1 block text-xs font-medium text-stone-600">ZIP code</label>
              <input id="zipCode" type="text" placeholder="98101" className="input" {...register('zipCode')} />
            </div>
            <div>
              <label htmlFor="pickupRadiusMiles" className="mb-1 block text-xs font-medium text-stone-600">Pickup radius (mi)</label>
              <input id="pickupRadiusMiles" type="number" min={1} placeholder="25" className="input" {...register('pickupRadiusMiles')} />
            </div>
          </div>

          {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{serverError}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? 'Saving…' : 'Complete setup'}
            </button>
            <button type="button" onClick={() => router.push('/home')} className="btn-ghost w-full py-2 text-xs text-stone-400">
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
