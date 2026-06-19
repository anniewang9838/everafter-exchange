'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { getOrder, confirmOrder, cancelOrder } from '@/services/orders.service'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'

function CheckIcon({ filled }: { filled: boolean }) {
  return (
    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
      filled ? 'bg-sage-500 text-white' : 'border-2 border-stone-200 text-stone-300'
    }`}>
      {filled ? '✓' : ''}
    </span>
  )
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id),
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmOrder(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })

  const isBusy = confirmMutation.isPending || cancelMutation.isPending

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="py-24 text-center">
        <p className="text-stone-500">Order not found.</p>
        <Link href="/my-orders" className="btn-ghost mt-4 text-sm">← Back to orders</Link>
      </div>
    )
  }

  const isBuyer  = user?.id === order.buyerId
  const isSeller = user?.id === order.sellerId
  const listingImage = order.listing?.images[0]?.imageUrl

  const myConfirmed   = isBuyer ? order.buyerConfirmed : order.sellerConfirmed
  const theirConfirmed = isBuyer ? order.sellerConfirmed : order.buyerConfirmed
  const otherUsername  = isBuyer ? order.seller?.username : order.buyer?.username

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-taupe-200 bg-white px-4 py-3">
        <button onClick={() => router.back()} className="text-sm text-stone-400 hover:text-stone-700">←</button>
        <h1 className="font-serif text-lg text-stone-800">Order Details</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">

        {/* Listing summary */}
        <Link href={`/listings/${order.listingId}`} className="card flex items-center gap-4 p-4 hover:bg-beige-100 transition-colors">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-beige-200">
            {listingImage ? (
              <img src={listingImage} alt={order.listing?.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-stone-400">No photo</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-stone-800">{order.listing?.title}</p>
            <p className="mt-0.5 text-sm font-semibold text-stone-800">${order.agreedPrice.toFixed(2)}</p>
          </div>
          <span className="ml-auto shrink-0 text-stone-300">→</span>
        </Link>

        {/* Order details */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-1">Agreed price</p>
              <p className="text-2xl font-semibold text-stone-800">${order.agreedPrice.toFixed(2)}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="border-t border-beige-200 pt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-0.5">Buyer</p>
              <p className="text-stone-700">@{order.buyer?.username}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-0.5">Seller</p>
              <p className="text-stone-700">@{order.seller?.username}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-0.5">Created</p>
              <p className="text-stone-700">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Dual-confirm status */}
        {order.status === 'pending' && (
          <div className="card p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-400">Handoff confirmation</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckIcon filled={order.buyerConfirmed} />
                <span className="text-sm text-stone-700">
                  @{order.buyer?.username} <span className="text-stone-400">(buyer)</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon filled={order.sellerConfirmed} />
                <span className="text-sm text-stone-700">
                  @{order.seller?.username} <span className="text-stone-400">(seller)</span>
                </span>
              </div>
            </div>
            {!myConfirmed && theirConfirmed && (
              <p className="mt-3 text-xs text-amber-600">@{otherUsername} confirmed — waiting on you.</p>
            )}
            {!myConfirmed && !theirConfirmed && (
              <p className="mt-3 text-xs text-stone-400">Both parties must confirm once the handoff is complete.</p>
            )}
          </div>
        )}

        {/* Completed */}
        {order.status === 'completed' && (
          <div className="rounded-xl border border-sage-200 bg-sage-50 p-4 text-center">
            <p className="font-medium text-sage-700">Handoff complete!</p>
            <p className="mt-1 text-sm text-sage-600">This order has been marked as completed by both parties.</p>
          </div>
        )}

        {/* Cancelled */}
        {order.status === 'cancelled' && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center">
            <p className="font-medium text-stone-600">Order cancelled</p>
            <p className="mt-1 text-sm text-stone-400">The listing is back on the marketplace.</p>
          </div>
        )}

        {(confirmMutation.isError || cancelMutation.isError) && (
          <p className="text-center text-sm text-red-500">Something went wrong. Please try again.</p>
        )}

        {/* Actions */}
        {order.status === 'pending' && (isBuyer || isSeller) && (
          <div className="space-y-2">
            {!myConfirmed && (
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={isBusy}
                className="btn-primary w-full py-3"
              >
                {confirmMutation.isPending ? 'Confirming…' : 'Confirm Handoff'}
              </button>
            )}
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={isBusy}
              className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default function OrderDetailPage() {
  return <OrderDetail />
}
