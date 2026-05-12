'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ListingCard } from '@/components/listings/ListingCard'
import { getMyListings, deleteListing } from '@/services/listings.service'
import { useAuthStore } from '@/store/auth.store'

const STATUS_LABEL: Record<string, string> = {
  active:   'Active',
  inactive: 'Inactive',
  reserved: 'Reserved',
  sold:     'Sold',
}
const STATUS_COLOR: Record<string, string> = {
  active:   'text-sage-600 bg-sage-50',
  inactive: 'text-stone-500 bg-stone-100',
  reserved: 'text-amber-600 bg-amber-50',
  sold:     'text-blue-600 bg-blue-50',
}

function MyListingsContent() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isSeller = user?.role === 'seller' || user?.role === 'both'

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings', page],
    queryFn: () => getMyListings(page),
    enabled: isSeller,
  })

  async function handleDelete(id: string) {
    if (!window.confirm('Remove this listing? It will be set to inactive.')) return
    setDeletingId(id)
    try {
      await deleteListing(id)
      queryClient.invalidateQueries({ queryKey: ['my-listings'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    } catch {
      alert('Failed to remove listing.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isSeller) {
    return (
      <div className="py-24 text-center">
        <p className="text-stone-500">Only sellers have listings.</p>
        <Link href="/home" className="btn-ghost mt-4 text-sm">Browse the marketplace</Link>
      </div>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-taupe-200 bg-white px-4 py-3">
        <h1 className="font-serif text-lg text-stone-800">My Listings</h1>
        <Link href="/listings/new" className="btn-primary py-1.5 text-sm">+ New</Link>
      </header>

    <div className="px-4 py-6">
      <div className="mb-4">
          {data && <p className="text-sm text-stone-400">{data.total} listing{data.total !== 1 ? 's' : ''}</p>}
      </div>

      {isLoading && (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
        </div>
      )}

      {data?.items.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-stone-500">You haven't listed anything yet.</p>
          <Link href="/listings/new" className="btn-primary mt-4">Create your first listing</Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.items.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                actions={
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[listing.status]}`}>
                      {STATUS_LABEL[listing.status]}
                    </span>
                    <div className="flex gap-3">
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="text-xs text-stone-400 hover:text-stone-700"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(listing.id)}
                        disabled={deletingId === listing.id}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === listing.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                }
              />
            ))}
          </div>

          {(page > 1 || data.hasMore) && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1}
                className="btn-ghost disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-sm text-stone-500">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!data.hasMore}
                className="btn-ghost disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  )
}

export default function MyListingsPage() {
  return <MyListingsContent />
}
