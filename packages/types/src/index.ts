// ── Users ─────────────────────────────────────────────────────────────────────

export type UserRole = 'buyer' | 'seller' | 'both'

export type VenueStyle =
  | 'modern'
  | 'rustic'
  | 'garden'
  | 'vintage'
  | 'boho'
  | 'ballroom'
  | 'other'

export interface User {
  id: string
  firebaseUid: string
  name: string
  email: string
  role: UserRole
  onboardingComplete: boolean
  weddingDate?: string | null
  venueStyle?: VenueStyle | null
  colorPalette?: string[] | null
  guestCount?: number | null
  decorBudgetMin?: number | null
  decorBudgetMax?: number | null
  zipCode?: string | null
  pickupRadiusMiles?: number | null
  sellerBio?: string | null
  isVerified: boolean
  createdAt: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  onboardingComplete: boolean
  isVerified: boolean
}

// ── Listings ──────────────────────────────────────────────────────────────────

export type ListingStatus = 'active' | 'reserved' | 'sold' | 'inactive'
export type ListingCondition = 'like_new' | 'excellent' | 'good' | 'fair'
export type ListingCategory =
  | 'centerpieces'
  | 'table_runners'
  | 'candles'
  | 'signage'
  | 'arch_arbor'
  | 'linens'
  | 'lighting'
  | 'floral'
  | 'other'

export interface ListingImage {
  id: string
  listingId: string
  imageUrl: string
  displayOrder: number
}

export interface Listing {
  id: string
  sellerId: string
  title: string
  description: string
  price: number
  originalRetailPrice?: number | null
  status: ListingStatus
  condition: ListingCondition
  category: ListingCategory
  venueStyle?: VenueStyle | null
  images: ListingImage[]
  createdAt: string
  updatedAt: string
  seller?: Pick<User, 'id' | 'name' | 'isVerified'>
}

// ── Offers ────────────────────────────────────────────────────────────────────

export type OfferStatus = 'pending' | 'accepted' | 'rejected'

export interface Offer {
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  price: number
  status: OfferStatus
  createdAt: string
  updatedAt: string
  listing?: Pick<Listing, 'id' | 'title' | 'price' | 'images'>
  buyer?: Pick<User, 'id' | 'name'>
  seller?: Pick<User, 'id' | 'name'>
}

// ── Orders ────────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'completed' | 'cancelled'

export interface Order {
  id: string
  listingId: string
  offerId: string
  buyerId: string
  sellerId: string
  agreedPrice: number
  status: OrderStatus
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  createdAt: string
  updatedAt: string
  listing?: Pick<Listing, 'id' | 'title' | 'images' | 'price'>
  buyer?: Pick<User, 'id' | 'name'>
  seller?: Pick<User, 'id' | 'name'>
}

// ── Messages ──────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  orderId?: string | null
  listingId?: string | null
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  sender?: Pick<User, 'id' | 'name'>
}

export interface Conversation {
  id: string
  otherUser: Pick<User, 'id' | 'name' | 'isVerified'>
  listing: Pick<Listing, 'id' | 'title' | 'images'>
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

// ── API envelope ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: { code: string; message: string }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
