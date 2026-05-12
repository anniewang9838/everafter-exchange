'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUp } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  name:     z.string().min(1, 'Name is required'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormValues = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intent = searchParams.get('intent') ?? 'buy'
  const { setUser } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      const user = await signUp(values.name, values.email, values.password)
      setUser(user)
      router.push(intent === 'sell' ? '/onboarding/seller' : '/onboarding/buyer')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-beige-100 px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <span className="font-serif text-2xl text-sage-600">EverAfterExchange</span>
          <p className="mt-2 text-sm text-stone-500">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-xs font-medium text-stone-600">Name</label>
            <input id="name" type="text" placeholder="Your name" className="input" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-stone-600">Email</label>
            <input id="email" type="email" placeholder="you@example.com" className="input" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-stone-600">Password</label>
            <input id="password" type="password" placeholder="At least 8 characters" className="input" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{serverError}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full py-3">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-sage-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
