'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ListingForm, ListingFormValues } from '@/components/listings/ListingForm'
import { getListing, updateListing } from '@/services/listings.service'
import { useAuthStore } from '@/store/auth.store'

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
  })

  useEffect(() => {
    if (listing && user && listing.sellerId !== user.id) {
      router.replace(`/listings/${id}`)
    }
  }, [listing, user, id, router])

  async function handleSubmit(values: ListingFormValues) {
    await updateListing(id, {
      title:               values.title,
      description:         values.description,
      price:               values.price,
      originalRetailPrice: values.originalRetailPrice ?? null,
      condition:           values.condition,
      category:            values.category,
      venueStyle:          values.venueStyle ?? null,
      imageUrls:           values.imageUrls,
    })
    queryClient.invalidateQueries({ queryKey: ['listing', id] })
    queryClient.invalidateQueries({ queryKey: ['listings'] })
    router.push(`/listings/${id}`)
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
        <Link href="/my-listings" className="btn-ghost mt-4 text-sm">← My Listings</Link>
      </div>
    )
  }

  const defaultValues: Partial<ListingFormValues> = {
    imageUrls:           listing.images.map(img => img.imageUrl),
    title:               listing.title,
    description:         listing.description,
    category:            listing.category as ListingFormValues['category'],
    condition:           listing.condition as ListingFormValues['condition'],
    venueStyle:          (listing.venueStyle as ListingFormValues['venueStyle']) ?? null,
    price:               listing.price,
    originalRetailPrice: listing.originalRetailPrice ?? null,
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-taupe-200 bg-white px-4 py-3">
        <Link href={`/listings/${id}`} className="text-sm text-stone-400 hover:text-stone-700">←</Link>
        <h1 className="font-serif text-lg text-stone-800">Edit Listing</h1>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6">
        {/* key forces remount with fresh defaultValues once listing is loaded */}
        <ListingForm
          key={listing.id}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
        />
      </div>
    </>
  )
}
