import { useMemo, useState } from 'react'
import { useActiveConfig } from '../lib/useActiveConfig'
import { evaluateValue, seriesFor } from '../engine/rules'
import type { Reading } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'
import { useHealthStore } from '../store/useHealthStore'
import { useToastStore } from '../store/useToastStore'
import { Card } from './Card'
import { Icon } from './Icon'

const PAGE = 8

export function ReadingHistory({ readings, indicatorId }: { readings: Reading[]; indicatorId: string }) {
  const removeReading = useHealthStore((s) => s.removeReading)
  const replaceReadings = useHealthStore((s) => s.replaceReadings)
  const showToast = useToastStore((s) => s.show)
  const { indicatorsById } = useActiveConfig()
  const [showAll, setShowAll] = useState(false)
  const indicator = indicatorsById[indicatorId]
  const rows = useMemo(() => seriesFor(readings, indicatorId).reverse(), [readings, indicatorId])
  const visible = showAll ? rows : rows.slice(0, PAGE)

  return (
    <Card
      title="History"
      subtitle={rows.length ? `${rows.length} readings, newest first` : undefined}
      action={
        rows.length > PAGE && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="btn btn-plain btn-sm">
            {showAll ? 'Show less' : `Show all ${rows.length}`}
          </button>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-fg-subtle">No readings yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((r) => {
            const m = STATUS_META[evaluateValue(indicator, r.value).status]
            return (
              <li key={r.id} className="flex min-h-11 items-center gap-3 py-1 text-sm">
                <span className={`size-2 shrink-0 rounded-full ${m.dot}`} aria-label={m.label} />
                <span className="w-28 shrink-0 text-xs text-fg-muted tabular-nums sm:w-32">
                  {new Date(r.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className={`w-24 shrink-0 font-semibold tabular-nums ${m.text}`}>
                  {formatValue(indicator, r.value)} <span className="text-xs font-normal text-fg-subtle">{indicator.unit}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-fg-subtle">{r.note}</span>
                <button
                  type="button"
                  onClick={() => {
                    const before = readings
                    removeReading(r.id)
                    showToast({ message: 'Reading deleted', action: { label: 'Undo', run: () => replaceReadings(before) } })
                  }}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-critical/15 hover:text-critical"
                  aria-label={`Delete reading from ${new Date(r.timestamp).toLocaleString()}`}
                  title="Delete reading"
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
