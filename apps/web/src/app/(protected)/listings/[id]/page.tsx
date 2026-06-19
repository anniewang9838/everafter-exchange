'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { getListing, deleteListing } from '@/services/listings.service'
import { getMyOffers, buyNow, cancelOffer } from '@/services/offers.service'
import { OfferModal } from '@/components/offers/OfferModal'
import { OfferStatusBadge } from '@/components/offers/OfferStatusBadge'

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
  const [showOfferModal, setShowOfferModal] = useState(false)

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
  })

  // Fetch buyer's existing offer on this listing (if any)
  const { data: myOffersData } = useQuery({
    queryKey: ['offers', 'my-on-listing', id],
    queryFn: () => getMyOffers('buyer', 1, 50),
    enabled: !!user && listing?.sellerId !== user.id,
  })
  const myOfferOnListing = myOffersData?.items.find(
    o => o.listingId === id && (o.status === 'pending' || o.status === 'accepted'),
  )

  const buyNowMutation = useMutation({
    mutationFn: () => buyNow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', id] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })

  const cancelOfferMutation = useMutation({
    mutationFn: (offerId: string) => cancelOffer(offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', id] })
      queryClient.invalidateQueries({ queryKey: ['offers', 'my-on-listing', id] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
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

  function handleBuyNow() {
    if (!listing) return
    if (!window.confirm(`Buy "${listing.title}" for $${listing.price.toFixed(2)}?`)) return
    buyNowMutation.mutate()
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
  const isAvailable = listing.status === 'active'

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-taupe-200 bg-white px-4 py-3">
        <button onClick={() => router.back()} className="text-sm text-stone-400 hover:text-stone-700">←</button>
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
            ) : myOfferOnListing ? (
              <div className="rounded-xl border border-taupe-300 p-4">
                <p className="mb-2 text-sm text-stone-500">Your offer</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-stone-800">
                    ${myOfferOnListing.price.toFixed(2)}
                  </span>
                  <OfferStatusBadge status={myOfferOnListing.status} />
                </div>
                <Link
                  href={`/offers/${myOfferOnListing.id}`}
                  className="mt-3 block text-center text-sm text-sage-600 hover:underline"
                >
                  View offer details →
                </Link>
                {myOfferOnListing.status === 'pending' && (
                  <button
                    onClick={() => cancelOfferMutation.mutate(myOfferOnListing.id)}
                    disabled={cancelOfferMutation.isPending}
                    className="mt-2 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelOfferMutation.isPending ? 'Cancelling…' : 'Cancel Offer'}
                  </button>
                )}
              </div>
            ) : buyNowMutation.isSuccess ? (
              <div className="rounded-xl border border-sage-200 bg-sage-50 p-4 text-center">
                <p className="font-medium text-sage-700">Purchase confirmed!</p>
                <p className="mt-1 text-sm text-sage-600">The seller will be in touch to arrange handoff.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {!isAvailable && (
                  <p className="text-center text-sm text-stone-400">
                    This listing is {listing.status} and no longer available.
                  </p>
                )}
                <button
                  onClick={handleBuyNow}
                  disabled={!isAvailable || buyNowMutation.isPending}
                  className="btn-primary w-full"
                >
                  {buyNowMutation.isPending ? 'Processing…' : `Buy · $${listing.price.toFixed(2)}`}
                </button>
                <button
                  onClick={() => setShowOfferModal(true)}
                  disabled={!isAvailable}
                  className="btn-ghost w-full"
                >
                  Make an Offer
                </button>
                {buyNowMutation.isError && (
                  <p className="text-center text-sm text-red-500">
                    {(buyNowMutation.error as Error).message ?? 'Purchase failed. Please try again.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showOfferModal && (
        <OfferModal
          listingId={id}
          listingTitle={listing.title}
          listingPrice={listing.price}
          onClose={() => setShowOfferModal(false)}
        />
      )}
    </>
  )
}

export default function ListingDetailPage() {
  return <DetailPage />
}
