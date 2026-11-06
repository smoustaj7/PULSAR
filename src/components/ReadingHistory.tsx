import { useMemo, useState } from 'react'
import { indicatorsById } from '../config'
import { evaluateValue, seriesFor } from '../engine/rules'
import type { Reading } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'
import { useHealthStore } from '../store/useHealthStore'
import { Card } from './Card'

const PAGE = 8

export function ReadingHistory({ readings, indicatorId }: { readings: Reading[]; indicatorId: string }) {
  const removeReading = useHealthStore((s) => s.removeReading)
  const [showAll, setShowAll] = useState(false)
  const indicator = indicatorsById[indicatorId]
  const rows = useMemo(() => seriesFor(readings, indicatorId).reverse(), [readings, indicatorId])
  const visible = showAll ? rows : rows.slice(0, PAGE)

  return (
    <Card
      title={`History · ${indicator.label}`}
      action={
        rows.length > PAGE && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs text-sky-300 hover:underline">
            {showAll ? 'Show less' : `Show all ${rows.length}`}
          </button>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No readings yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {visible.map((r) => {
            const m = STATUS_META[evaluateValue(indicator, r.value).status]
            return (
              <li key={r.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className={`size-2 shrink-0 rounded-full ${m.dot}`} aria-label={m.label} />
                <span className="w-32 shrink-0 text-xs text-slate-400">
                  {new Date(r.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className={`w-20 shrink-0 font-mono ${m.text}`}>
                  {formatValue(indicator, r.value)} <span className="text-xs text-slate-500">{indicator.unit}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{r.note}</span>
                <button
                  type="button"
                  onClick={() => removeReading(r.id)}
                  className="rounded px-1.5 text-slate-500 hover:bg-critical/15 hover:text-critical"
                  aria-label={`Delete reading from ${new Date(r.timestamp).toLocaleString()}`}
                  title="Delete reading"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
