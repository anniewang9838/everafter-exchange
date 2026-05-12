'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { getListing, deleteListing } from '@/services/listings.service'

const CONDITION_LABEL: Record<string, string> = {
  like_new: 'Like New', excellent: 'Excellent', good: 'Good', fair: 'Fair',
}
const CATEGORY_LABEL: Record<string, string> = {
  centerpieces: 'Centerpieces', table_runners: 'Table Runners', candles: 'Candles',
  signage: 'Signage', arch_arbor: 'Arch & Arbor', linens: 'Linens',
  lighting: 'Lighting', floral: 'Floral', other: 'Other',
}

function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedImg, setSelectedImg] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
  })

  async function handleDelete() {
    if (!window.confirm('Remove this listing? It will be set to inactive.')) return
    setDeleting(true)
    try {
      await deleteListing(id)
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      router.push('/my-listings')
    } catch {
      alert('Failed to delete listing.')
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
      </div>
    )
  }

  if (isError || !listing) {
    return (
      <div className="py-24 text-center">
        <p className="text-stone-500">Listing not found.</p>
        <Link href="/home" className="btn-ghost mt-4 text-sm">← Back to browse</Link>
      </div>
    )
  }

  const isOwner = user?.id === listing.sellerId

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-taupe-200 bg-white px-4 py-3">
        <Link href="/home" className="text-sm text-stone-400 hover:text-stone-700">←</Link>
        <h1 className="font-serif text-lg text-stone-800 line-clamp-1">{listing.title}</h1>
      </header>

    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-beige-200">
            {listing.images[selectedImg] ? (
              <img
                src={listing.images[selectedImg].imageUrl}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-400">No photo</div>
            )}
          </div>

          {listing.images.length > 1 && (
            <div className="flex gap-2">
              {listing.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImg(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === selectedImg ? 'border-sage-500' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <h1 className="font-serif text-2xl text-stone-800">{listing.title}</h1>
            <span className="shrink-0 rounded-full bg-sage-100 px-2.5 py-1 text-xs font-medium text-sage-700">
              {CONDITION_LABEL[listing.condition]}
            </span>
          </div>

          <p className="mb-1 text-3xl font-semibold text-stone-800">${listing.price.toFixed(2)}</p>
          {listing.originalRetailPrice && (
            <p className="mb-4 text-sm text-stone-400 line-through">${listing.originalRetailPrice.toFixed(2)} retail</p>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-beige-200 px-3 py-1 text-xs text-stone-600">
              {CATEGORY_LABEL[listing.category]}
            </span>
            {listing.venueStyle && (
              <span className="rounded-full bg-beige-200 px-3 py-1 text-xs capitalize text-stone-600">
                {listing.venueStyle}
              </span>
            )}
          </div>

          <p className="mb-8 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{listing.description}</p>

          {listing.seller && (
            <div className="mb-6 rounded-xl border border-taupe-300 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">Seller</p>
              <p className="font-medium text-stone-800">
                {listing.seller.name}
                {listing.seller.isVerified && (
                  <span className="ml-1.5 text-xs text-sage-500">✓ Verified</span>
                )}
              </p>
              <p className="text-sm text-stone-400">@{listing.seller.username}</p>
            </div>
          )}

          {isOwner ? (
            <div className="flex gap-3">
              <Link href={`/listings/${id}/edit`} className="btn-ghost flex-1 text-center">
                Edit listing
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Remove listing'}
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-sage-500 py-3 text-sm font-medium text-white opacity-60"
              title="Offers coming in Phase 4"
            >
              Make an Offer — coming soon
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

export default function ListingDetailPage() {
  return <DetailPage />
}
