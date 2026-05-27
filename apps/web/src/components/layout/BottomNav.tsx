'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Tag, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/home',        label: 'Home',    Icon: Home },
  { href: '/my-listings', label: 'Sell',    Icon: Tag },
  { href: '/inbox',       label: 'Inbox',   Icon: MessageCircle },
  { href: '/profile',     label: 'Profile', Icon: User },
]

function isTabActive(tabHref: string, pathname: string): boolean {
  if (tabHref === '/my-listings') {
    return (
      pathname.startsWith('/my-listings') ||
      pathname.startsWith('/listings/new') ||
      pathname.endsWith('/edit')
    )
  }
  if (tabHref === '/inbox') {
    return pathname.startsWith('/inbox') || pathname.startsWith('/messages') || pathname.startsWith('/offers/')
  }
  if (tabHref === '/profile') {
    return pathname.startsWith('/profile') || pathname.startsWith('/settings')
  }
  if (tabHref === '/home') {
    return pathname === '/home' || pathname.startsWith('/listings/')
  }
  return false
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-taupe-300 bg-white">
      <div className="flex h-16 items-center">
        {TABS.map(({ href, label, Icon }) => {
          const active = isTabActive(href, pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
                active ? 'text-sage-600' : 'text-stone-400 hover:text-stone-600',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
              <span className={cn('text-xs', active && 'font-medium')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
