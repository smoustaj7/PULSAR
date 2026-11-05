import type { Status } from '../engine/types'
import { STATUS_META } from '../lib/status'

export function StatusBadge({ status, className = '' }: { status: Status; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${m.bg} ${m.border} ${m.text} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}
