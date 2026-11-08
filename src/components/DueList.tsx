import type { DueItem } from '../engine/types'
import { timeAgo } from '../lib/status'
import { Card } from './Card'
import { Icon } from './Icon'

/** What to measure next, each one a single tap from the log sheet. */
export function DueList({ items, now, onLog }: { items: DueItem[]; now: number; onLog: (indicatorId: string) => void }) {
  return (
    <Card
      title="Up next"
      subtitle={items.length ? `${items.length} measurement${items.length === 1 ? '' : 's'} due` : 'Based on how often each vital is measured'}
    >
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-nominal">
          <Icon name="check" className="size-4.5" /> All measurements are up to date. Nice work.
        </p>
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {items.map(({ indicator, lastTimestamp }) => (
            <li key={indicator.id}>
              <button
                type="button"
                onClick={() => onLog(indicator.id)}
                className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-white/5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{indicator.label}</span>
                  <span className="block text-xs text-fg-subtle">
                    {lastTimestamp ? `Last logged ${timeAgo(lastTimestamp, now)}` : 'Never logged'}
                  </span>
                </span>
                <span className="btn btn-tinted btn-sm pointer-events-none group-hover:bg-accent/20">
                  <Icon name="plus" className="size-3.5" /> Log
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
