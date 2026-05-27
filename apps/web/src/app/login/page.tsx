'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, getMe, logOut } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { ApiError } from '@/lib/api/client'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await signIn(values.email, values.password)
    } catch {
      setServerError('Invalid email or password')
      return
    }
    try {
      const user = await getMe()
      setUser(user)
      router.replace(
        user.onboardingComplete
          ? '/home'
          : user.role === 'seller' ? '/onboarding/seller' : '/onboarding/buyer'
      )
    } catch (err) {
      await logOut()
      if (err instanceof ApiError && err.code === 'USER_NOT_FOUND') {
        setServerError('Account setup was incomplete. Please sign up again.')
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-beige-100 px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <span className="font-serif text-2xl text-sage-600">EverAfterExchange</span>
          <p className="mt-2 text-sm text-stone-500">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-stone-600">Email</label>
            <input id="email" type="email" placeholder="you@example.com" className="input" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-stone-600">Password</label>
            <input id="password" type="password" placeholder="Your password" className="input" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{serverError}</p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full py-3">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-sage-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
