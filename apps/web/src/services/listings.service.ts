import { apiClient } from '@/lib/api/client'
import type { Listing, PaginatedResponse } from '@everafter/types'

export interface ListingFilters {
  page?: number
  limit?: number
  category?: string
  venueStyle?: string
  condition?: string
  minPrice?: number
  maxPrice?: number
  search?: string
}

export interface CreateListingInput {
  title: string
  description: string
  price: number
  originalRetailPrice?: number | null
  condition: string
  category: string
  venueStyle?: string | null
  imageUrls: string[]
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; imageUrl: string }> {
  return apiClient.post('/listings/upload-url', { filename, contentType })
}

export async function uploadImageToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
  if (!res.ok) throw new Error('Image upload to S3 failed')
}

export async function createListing(data: CreateListingInput): Promise<Listing> {
  return apiClient.post<Listing>('/listings', data)
}

export async function getListings(filters: ListingFilters = {}): Promise<PaginatedResponse<Listing>> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  })
  const qs = params.toString()
  return apiClient.get<PaginatedResponse<Listing>>(`/listings${qs ? `?${qs}` : ''}`)
}

export async function getListing(id: string): Promise<Listing> {
  return apiClient.get<Listing>(`/listings/${id}`)
}

export async function getMyListings(page = 1, limit = 20): Promise<PaginatedResponse<Listing>> {
  return apiClient.get<PaginatedResponse<Listing>>(`/listings/my?page=${page}&limit=${limit}`)
}

export async function updateListing(
  id: string,
  data: Partial<CreateListingInput & { status: 'active' | 'inactive' }>,
): Promise<Listing> {
  return apiClient.patch<Listing>(`/listings/${id}`, data)
}

export async function deleteListing(id: string): Promise<void> {
  return apiClient.delete(`/listings/${id}`)
}
