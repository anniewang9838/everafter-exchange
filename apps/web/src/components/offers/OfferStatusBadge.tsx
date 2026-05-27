import type { OfferStatus } from '@everafter/types'
import { cn } from '@/lib/utils/cn'

const CONFIG: Record<OfferStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-amber-50 text-amber-700' },
  accepted:  { label: 'Accepted',  className: 'bg-sage-100 text-sage-700' },
  rejected:  { label: 'Declined',  className: 'bg-stone-100 text-stone-500' },
  cancelled: { label: 'Cancelled', className: 'bg-stone-100 text-stone-400' },
}

interface Props {
  status: OfferStatus
  className?: string
}

export function OfferStatusBadge({ status, className }: Props) {
  const { label, className: colorClass } = CONFIG[status]
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', colorClass, className)}>
      {label}
    </span>
  )
}
