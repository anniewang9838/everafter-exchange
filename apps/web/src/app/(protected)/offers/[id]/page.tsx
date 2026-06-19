'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { getOffer, acceptOffer, rejectOffer, cancelOffer } from '@/services/offers.service'
import { OfferStatusBadge } from '@/components/offers/OfferStatusBadge'

function OfferDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: offer, isLoading, isError } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => getOffer(id),
  })

  const acceptMutation = useMutation({
    mutationFn: () => acceptOffer(id),
    onSuccess: ({ offer: updated }) => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] })
      queryClient.invalidateQueries({ queryKey: ['listing', updated.listingId] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => rejectOffer(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] })
      queryClient.invalidateQueries({ queryKey: ['listing', updated.listingId] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelOffer(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] })
      queryClient.invalidateQueries({ queryKey: ['listing', updated.listingId] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
  })

  const isBusy = acceptMutation.isPending || rejectMutation.isPending || cancelMutation.isPending

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
      </div>
    )
  }

  if (isError || !offer) {
    return (
      <div className="py-24 text-center">
        <p className="text-stone-500">Offer not found.</p>
        <Link href="/my-offers" className="btn-ghost mt-4 text-sm">← Back to offers</Link>
      </div>
    )
  }

  const isSeller = user?.id === offer.sellerId
  const isBuyer  = user?.id === offer.buyerId
  const listingImage = offer.listing?.images[0]?.imageUrl

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-taupe-200 bg-white px-4 py-3">
        <button onClick={() => router.back()} className="text-sm text-stone-400 hover:text-stone-700">←</button>
        <h1 className="font-serif text-lg text-stone-800">Offer Details</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Listing summary */}
        <Link href={`/listings/${offer.listingId}`} className="card flex items-center gap-4 p-4 hover:bg-beige-100 transition-colors">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-beige-200">
            {listingImage ? (
              <img src={listingImage} alt={offer.listing?.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-stone-400">No photo</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-stone-800">{offer.listing?.title}</p>
            <p className="text-sm text-stone-400">Listed at ${offer.listing?.price.toFixed(2)}</p>
          </div>
          <span className="ml-auto shrink-0 text-stone-300">→</span>
        </Link>

        {/* Offer details */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-1">Offer amount</p>
              <p className="text-2xl font-semibold text-stone-800">${offer.price.toFixed(2)}</p>
            </div>
            <OfferStatusBadge status={offer.status} />
          </div>

          <div className="border-t border-beige-200 pt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-0.5">Buyer</p>
              <p className="text-stone-700">@{offer.buyer?.username}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-0.5">Seller</p>
              <p className="text-stone-700">@{offer.seller?.username}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-0.5">Submitted</p>
              <p className="text-stone-700">{new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Seller actions */}
        {isSeller && offer.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={isBusy}
              className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Decline'}
            </button>
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={isBusy}
              className="btn-primary flex-1"
            >
              {acceptMutation.isPending ? 'Accepting…' : 'Accept Offer'}
            </button>
          </div>
        )}

        {/* Buyer cancel action */}
        {isBuyer && offer.status === 'pending' && (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={isBusy}
            className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Offer'}
          </button>
        )}

        {(acceptMutation.isError || rejectMutation.isError || cancelMutation.isError) && (
          <p className="text-center text-sm text-red-500">Something went wrong. Please try again.</p>
        )}

        {offer.status === 'accepted' && offer.orderId && (
          <Link
            href={`/orders/${offer.orderId}`}
            className="flex items-center justify-between rounded-xl border border-sage-200 bg-sage-50 p-4 hover:bg-sage-100 transition-colors"
          >
            <div>
              <p className="font-medium text-sage-700">Offer accepted!</p>
              <p className="mt-0.5 text-sm text-sage-600">View order details and confirm handoff.</p>
            </div>
            <span className="text-sage-500">→</span>
          </Link>
        )}
      </div>
    </>
  )
}

export default function OfferDetailPage() {
  return <OfferDetail />
}
