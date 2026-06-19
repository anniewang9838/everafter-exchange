'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getMyOrders } from '@/services/orders.service'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import type { Order } from '@everafter/types'

type Tab = 'buyer' | 'seller'

function OrderRow({ order, role }: { order: Order; role: Tab }) {
  const image        = order.listing?.images[0]?.imageUrl
  const otherParty   = role === 'buyer' ? order.seller : order.buyer

  return (
    <Link href={`/orders/${order.id}`} className="flex items-center gap-3 border-b border-beige-200 px-4 py-3.5 hover:bg-beige-100 transition-colors last:border-b-0">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-beige-200">
        {image ? (
          <img src={image} alt={order.listing?.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-stone-400">—</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-800">{order.listing?.title}</p>
        <p className="text-xs text-stone-400 mt-0.5">@{otherParty?.username}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-semibold text-stone-800">${order.agreedPrice.toFixed(2)}</span>
        <OrderStatusBadge status={order.status} />
      </div>
    </Link>
  )
}

function OrdersList({ role }: { role: Tab }) {
  const { data, isLoading } = useQuery({
    queryKey: ['orders', role],
    queryFn: () => getMyOrders(role),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
      </div>
    )
  }

  if (!data?.items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-400">
          {role === 'buyer' ? 'No purchases yet.' : 'No sales yet.'}
        </p>
        {role === 'buyer' && (
          <Link href="/home" className="btn-ghost mt-4 text-sm">Browse listings</Link>
        )}
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {data.items.map(order => (
        <OrderRow key={order.id} order={order} role={role} />
      ))}
    </div>
  )
}

export default function MyOrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('buyer')

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-taupe-200 bg-white px-4 py-3">
        <h1 className="font-serif text-lg text-stone-800">My Orders</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4">
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
              {tab === 'buyer' ? 'Buying' : 'Selling'}
            </button>
          ))}
        </div>

        <OrdersList role={activeTab} />
      </div>
    </>
  )
}
