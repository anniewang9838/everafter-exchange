import { RouteGuard } from '@/components/auth/RouteGuard'

export default function HomePage() {
  return (
    <RouteGuard>
      <div className="flex min-h-screen flex-col items-center justify-center bg-beige-100">
        <span className="font-serif text-2xl text-sage-600">EverAfterExchange</span>
        <p className="mt-3 text-sm text-stone-500">Marketplace feed — Phase 3</p>
      </div>
    </RouteGuard>
  )
}
