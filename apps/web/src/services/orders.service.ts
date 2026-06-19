import { apiClient } from '@/lib/api/client'
import type { Order, PaginatedResponse } from '@everafter/types'

export async function getMyOrders(
  role: 'buyer' | 'seller' = 'buyer',
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Order>> {
  const params = new URLSearchParams({ role, page: String(page), limit: String(limit) })
  return apiClient.get<PaginatedResponse<Order>>(`/orders/my?${params}`)
}

export async function getOrder(id: string): Promise<Order> {
  return apiClient.get<Order>(`/orders/${id}`)
}

export async function confirmOrder(id: string): Promise<Order> {
  return apiClient.patch<Order>(`/orders/${id}/confirm`)
}

export async function cancelOrder(id: string): Promise<Order> {
  return apiClient.patch<Order>(`/orders/${id}/cancel`)
}
