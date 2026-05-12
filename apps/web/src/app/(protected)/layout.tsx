import { RouteGuard } from '@/components/auth/RouteGuard'
import { BottomNav } from '@/components/layout/BottomNav'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <div className="min-h-screen bg-beige-100 pb-20">
        {children}
        <BottomNav />
      </div>
    </RouteGuard>
  )
}
