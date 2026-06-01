'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { logOut } from '@/services/auth.service'

export function Navbar() {
  const { user, clearUser } = useAuthStore()
  const router = useRouter()

  async function handleLogout() {
    await logOut()
    clearUser()
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-taupe-300 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/home" className="font-serif text-xl text-sage-600">
          EverAfterExchange
        </Link>

        <div className="flex items-center gap-5">
          <Link href="/home" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
            Browse
          </Link>
          <Link href="/my-listings" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
            My Listings
          </Link>
          <Link href="/listings/new" className="btn-primary text-sm">
            + New Listing
          </Link>
          <div className="flex items-center gap-3 border-l border-taupe-300 pl-5">
            <span className="text-sm text-stone-500">@{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
