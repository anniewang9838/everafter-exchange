'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { getListings } from '@/services/listings.service'
import { ListingCard } from './ListingCard'

const CATEGORIES = [
  { value: '',             label: 'All' },
  { value: 'centerpieces', label: 'Centerpieces' },
  { value: 'table_runners',label: 'Table Runners' },
  { value: 'candles',      label: 'Candles' },
  { value: 'signage',      label: 'Signage' },
  { value: 'arch_arbor',   label: 'Arch & Arbor' },
  { value: 'linens',       label: 'Linens' },
  { value: 'lighting',     label: 'Lighting' },
  { value: 'floral',       label: 'Floral' },
  { value: 'other',        label: 'Other' },
]

export function FeedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')

  const filters = {
    page:       Number(searchParams.get('page')  ?? 1),
    category:   searchParams.get('category')   || undefined,
    venueStyle: searchParams.get('venueStyle')  || undefined,
    condition:  searchParams.get('condition')   || undefined,
    minPrice:   searchParams.get('minPrice')    ? Number(searchParams.get('minPrice'))  : undefined,
    maxPrice:   searchParams.get('maxPrice')    ? Number(searchParams.get('maxPrice'))  : undefined,
    search:     searchParams.get('search')      || undefined,
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['listings', filters],
    queryFn: () => getListings(filters),
  })

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/home?${params.toString()}`)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setParam('search', searchInput.trim() || null)
  }

  function changePage(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(next))
    router.push(`/home?${params.toString()}`)
  }

  const activeCategory = searchParams.get('category') ?? ''

  return (
    <div>
      {/* Sticky header: logo + search + category chips */}
      <header className="sticky top-0 z-40 border-b border-taupe-200 bg-beige-100 px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-serif text-xl text-sage-600">EverAfterExchange</span>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            placeholder="Search wedding décor…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input w-full pl-9"
          />
        </form>

        {/* Category chip strip */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setParam('category', cat.value || null)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.value
                  ? 'bg-sage-600 text-white'
                  : 'bg-white text-stone-600 shadow-sm hover:bg-sage-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Listing count */}
      {data && (
        <p className="px-4 pb-1 pt-3 text-xs text-stone-400">
          {data.total} listing{data.total !== 1 ? 's' : ''}
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="py-16 text-center text-stone-500">Failed to load listings. Try refreshing.</div>
      )}

      {data && data.items.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-stone-500">No listings match your filters.</p>
          <button onClick={() => router.push('/home')} className="btn-ghost mt-3 text-sm">
            Clear filters
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {(data.page > 1 || data.hasMore) && (
            <div className="mt-8 flex items-center justify-center gap-4 pb-4">
              <button
                onClick={() => changePage(data.page - 1)}
                disabled={data.page <= 1}
                className="btn-ghost disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-sm text-stone-500">Page {data.page}</span>
              <button
                onClick={() => changePage(data.page + 1)}
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
  )
}
