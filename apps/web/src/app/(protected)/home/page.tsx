import { Suspense } from 'react'
import { FeedContent } from '@/components/listings/FeedContent'

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent" />
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  )
}
