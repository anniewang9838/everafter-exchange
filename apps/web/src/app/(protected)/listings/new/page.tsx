'use client'

import { useRouter } from 'next/navigation'
import { ListingForm, ListingFormValues } from '@/components/listings/ListingForm'
import { createListing } from '@/services/listings.service'
import Link from 'next/link'

export default function NewListingPage() {
  const router = useRouter()

  async function handleSubmit(values: ListingFormValues) {
    const listing = await createListing({
      title:               values.title,
      description:         values.description,
      price:               values.price,
      originalRetailPrice: values.originalRetailPrice ?? null,
      condition:           values.condition,
      category:            values.category,
      venueStyle:          values.venueStyle ?? null,
      imageUrls:           values.imageUrls,
    })
    router.push(`/listings/${listing.id}`)
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-taupe-200 bg-white px-4 py-3">
        <Link href="/my-listings" className="text-sm text-stone-400 hover:text-stone-700">←</Link>
        <h1 className="font-serif text-lg text-stone-800">New Listing</h1>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="mb-6 text-sm text-stone-500">
          Add photos, details, and pricing to list your wedding décor.
        </p>
        <ListingForm onSubmit={handleSubmit} submitLabel="Publish listing" />
      </div>
    </>
  )
}
