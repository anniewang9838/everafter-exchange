import { apiClient } from '@/lib/api/client'
import type { Offer, PaginatedResponse } from '@everafter/types'

export async function submitOffer(listingId: string, price: number): Promise<Offer> {
  return apiClient.post<Offer>('/offers', { listingId, price })
}

export async function buyNow(listingId: string): Promise<{ offer: Offer; orderId: string }> {
  return apiClient.post<{ offer: Offer; orderId: string }>('/offers/buy-now', { listingId })
}

export async function getMyOffers(
  role?: 'buyer' | 'seller',
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Offer>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (role) params.set('role', role)
  return apiClient.get<PaginatedResponse<Offer>>(`/offers/my?${params}`)
}

export async function getOffer(id: string): Promise<Offer> {
  return apiClient.get<Offer>(`/offers/${id}`)
}

export async function acceptOffer(id: string): Promise<{ offer: Offer; orderId: string }> {
  return apiClient.patch<{ offer: Offer; orderId: string }>(`/offers/${id}/accept`)
}

export async function rejectOffer(id: string): Promise<Offer> {
  return apiClient.patch<Offer>(`/offers/${id}/reject`)
}

export async function cancelOffer(id: string): Promise<Offer> {
  return apiClient.patch<Offer>(`/offers/${id}/cancel`)
}
