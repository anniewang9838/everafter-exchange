'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { logOut } from '@/services/auth.service'

export default function ProfilePage() {
  const { user, clearUser } = useAuthStore()
  const router = useRouter()

  async function handleLogout() {
    await logOut()
    clearUser()
    router.push('/')
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-taupe-200 bg-white px-4 py-3">
        <h1 className="font-serif text-lg text-stone-800">My Profile</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="card p-5">
          <p className="text-sm font-medium text-stone-800">{user?.name}</p>
          <p className="text-xs text-stone-400 mt-0.5">@{user?.username}</p>
          <p className="text-xs text-stone-400 mt-0.5">{user?.email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="btn-ghost w-full py-3 text-sm text-red-500 hover:text-red-600"
        >
          Log out
        </button>
      </div>
    </>
  )
}
