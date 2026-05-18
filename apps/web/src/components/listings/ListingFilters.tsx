'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export const CATEGORIES = [
  { value: 'centerpieces',  label: 'Centerpieces' },
  { value: 'table_runners', label: 'Table Runners' },
  { value: 'candles',       label: 'Candles' },
  { value: 'signage',       label: 'Signage' },
  { value: 'arch_arbor',    label: 'Arch & Arbor' },
  { value: 'linens',        label: 'Linens' },
  { value: 'lighting',      label: 'Lighting' },
  { value: 'floral',        label: 'Floral' },
  { value: 'other',         label: 'Other' },
]

export const VENUE_STYLES = [
  { value: 'modern',   label: 'Modern' },
  { value: 'rustic',   label: 'Rustic' },
  { value: 'garden',   label: 'Garden' },
  { value: 'vintage',  label: 'Vintage' },
  { value: 'boho',     label: 'Boho' },
  { value: 'ballroom', label: 'Ballroom' },
  { value: 'other',    label: 'Other' },
]

export const CONDITIONS = [
  { value: 'like_new',  label: 'Like New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
]

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function ListingFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      router.push(`/home?${params.toString()}`)
    },
    [router, searchParams],
  )

  function filterBtn(key: string, value: string, label: string) {
    const active = searchParams.get(key) === value
    return (
      <button
        key={value}
        onClick={() => update(key, active ? '' : value)}
        className={`block text-left text-sm transition-colors ${
          active ? 'font-medium text-sage-600' : 'text-stone-500 hover:text-stone-800'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <aside className="w-44 shrink-0 space-y-6">
      <FilterSection title="Category">
        {filterBtn('category', '', 'All categories')}
        {CATEGORIES.map(c => filterBtn('category', c.value, c.label))}
      </FilterSection>

      <FilterSection title="Venue Style">
        {filterBtn('venueStyle', '', 'All styles')}
        {VENUE_STYLES.map(s => filterBtn('venueStyle', s.value, s.label))}
      </FilterSection>

      <FilterSection title="Condition">
        {filterBtn('condition', '', 'Any condition')}
        {CONDITIONS.map(c => filterBtn('condition', c.value, c.label))}
      </FilterSection>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Price</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            min="0"
            defaultValue={searchParams.get('minPrice') ?? ''}
            className="input w-20 text-sm"
            onBlur={(e) => update('minPrice', e.target.value)}
          />
          <span className="text-stone-400 text-xs">–</span>
          <input
            type="number"
            placeholder="Max"
            min="0"
            defaultValue={searchParams.get('maxPrice') ?? ''}
            className="input w-20 text-sm"
            onBlur={(e) => update('maxPrice', e.target.value)}
          />
        </div>
      </div>
    </aside>
  )
}
