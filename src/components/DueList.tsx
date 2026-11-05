import type { DueItem } from '../engine/types'
import { timeAgo } from '../lib/status'
import { Card } from './Card'

export function DueList({ items, onPick }: { items: DueItem[]; onPick: (indicatorId: string) => void }) {
  return (
    <Card title={`Measurements due (${items.length})`}>
      {items.length === 0 ? (
        <p className="text-sm text-nominal">All measurements are up to date. Nice work.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(({ indicator, lastTimestamp }) => (
            <li key={indicator.id}>
              <button
                type="button"
                onClick={() => onPick(indicator.id)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
              >
                <span>{indicator.label}</span>
                <span className="text-xs text-slate-400">
                  {lastTimestamp ? `last ${timeAgo(lastTimestamp)}` : 'never'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
