import Link from 'next/link'
import type { Listing } from '@everafter/types'

const CONDITION_LABEL: Record<string, string> = {
  like_new:  'Like New',
  excellent: 'Excellent',
  good:      'Good',
  fair:      'Fair',
}

const CONDITION_COLOR: Record<string, string> = {
  like_new:  'bg-sage-100 text-sage-700',
  excellent: 'bg-blue-50 text-blue-600',
  good:      'bg-amber-50 text-amber-700',
  fair:      'bg-stone-100 text-stone-600',
}

interface Props {
  listing: Listing
  actions?: React.ReactNode
}

const STATUS_OVERLAY: Partial<Record<string, string>> = {
  reserved: 'Reserved',
  sold:     'Sold',
  inactive: 'Inactive',
}

export function ListingCard({ listing, actions }: Props) {
  const firstImage = listing.images[0]?.imageUrl
  const statusLabel = STATUS_OVERLAY[listing.status]

  return (
    <div className="card overflow-hidden">
      <Link href={`/listings/${listing.id}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden bg-beige-200">
          {firstImage ? (
            <img
              src={firstImage}
              alt={listing.title}
              className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${statusLabel ? 'opacity-60' : ''}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-stone-400">
              No photo
            </div>
          )}
          {statusLabel && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm">
                {statusLabel}
              </span>
            </div>
          )}
        </div>

        <div className="p-3">
          <span className={`mb-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${CONDITION_COLOR[listing.condition]}`}>
            {CONDITION_LABEL[listing.condition]}
          </span>
          <h3 className="line-clamp-2 text-xs font-medium leading-snug text-stone-800">{listing.title}</h3>
          <p className="mt-1 text-sm font-semibold text-stone-800">${listing.price.toFixed(2)}</p>
          {listing.originalRetailPrice && (
            <p className="text-xs text-stone-400 line-through">${listing.originalRetailPrice.toFixed(2)}</p>
          )}
          {listing.seller && (
            <p className="mt-1.5 text-xs text-stone-400">
              @{listing.seller.username}
              {listing.seller.isVerified && <span className="ml-1 text-sage-500">✓</span>}
            </p>
          )}
        </div>
      </Link>

      {actions && (
        <div className="border-t border-beige-200 px-4 py-2.5">{actions}</div>
      )}
    </div>
  )
}
