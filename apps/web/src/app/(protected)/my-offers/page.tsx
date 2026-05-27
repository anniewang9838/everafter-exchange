'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { getMyOffers } from '@/services/offers.service'
import { OfferStatusBadge } from '@/components/offers/OfferStatusBadge'
import type { Offer } from '@everafter/types'

type Tab = 'buyer' | 'seller'

function OfferRow({ offer }: { offer: Offer }) {
  const image = offer.listing?.images[0]?.imageUrl
  return (
    <Link href={`/offers/${offer.id}`} className="card flex items-center gap-4 p-4 hover:bg-beige-100 transition-colors">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-beige-200">
        {image ? (
          <img src={image} alt={offer.listing?.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-stone-400">—</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-800">{offer.listing?.title}</p>
        <p className="text-sm font-semibold text-stone-800 mt-0.5">${offer.price.toFixed(2)}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          {new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
      <OfferStatusBadge status={offer.status} />
    </Link>
  )
}

function OffersTab({ role }: { role: Tab }) {
  const { data, isLoading } = useQuery({
    queryKey: ['offers', role],
    queryFn: () => getMyOffers(role),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
      </div>
    )
  }

  if (!data?.items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-stone-400">
          {role === 'buyer' ? 'You haven\'t made any offers yet.' : 'No offers received yet.'}
        </p>
        {role === 'buyer' && (
          <Link href="/home" className="btn-ghost mt-4 text-sm">Browse listings</Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.items.map(offer => <OfferRow key={offer.id} offer={offer} />)}
    </div>
  )
}

export default function MyOffersPage() {
  const { user } = useAuthStore()
  const isSeller = user?.role === 'seller' || user?.role === 'both'
  const [activeTab, setActiveTab] = useState<Tab>('buyer')

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-taupe-200 bg-white px-4 py-3">
        <h1 className="font-serif text-lg text-stone-800">Offers</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4">
        {isSeller && (
          <div className="mb-4 flex rounded-lg border border-taupe-300 bg-white p-1">
            {(['buyer', 'seller'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-sage-500 text-white'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab === 'buyer' ? 'Sent' : 'Received'}
              </button>
            ))}
          </div>
        )}

        <OffersTab role={isSeller ? activeTab : 'buyer'} />
      </div>
    </>
  )
}
