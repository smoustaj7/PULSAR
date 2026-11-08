import type { Evaluation } from '../engine/types'
import { STATUS_META, formatValue, timeAgo } from '../lib/status'

/** Every vital at a glance. Color only marks what's off; the status is also spelled out. */
export function IndicatorGrid({
  evaluations,
  selectedId,
  onSelect,
  now,
}: {
  evaluations: Evaluation[]
  selectedId: string
  onSelect: (id: string) => void
  now: number
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {evaluations.map((e) => {
        const m = STATUS_META[e.status]
        const selected = e.indicator.id === selectedId
        const off = e.status === 'caution' || e.status === 'critical'
        return (
          <li key={e.indicator.id}>
            <button
              type="button"
              onClick={() => onSelect(e.indicator.id)}
              aria-pressed={selected}
              className={`surface flex h-full w-full flex-col p-3.5 text-left transition-[transform,box-shadow,background-color] duration-150 hover:bg-navy-900 active:scale-[0.98] ${
                selected ? 'ring-2 ring-accent' : ''
              } ${off ? m.border : ''}`}
            >
              <span className="line-clamp-2 min-h-10 text-sm leading-5 text-fg-muted">{e.indicator.label}</span>
              <span className={`mt-1 text-[26px] leading-8 font-semibold tracking-tight tabular-nums ${off ? m.text : 'text-fg'}`}>
                {e.reading ? formatValue(e.indicator, e.reading.value) : '—'}
                <span className="ml-1 text-xs font-normal tracking-normal text-fg-subtle">{e.indicator.unit}</span>
              </span>
              <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-2 text-xs">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className={`size-2 shrink-0 rounded-full ${m.dot}`} />
                  <span className={off ? m.text : 'text-fg-muted'}>{m.label}</span>
                  {e.trend?.flagged && <span className="text-caution">· trend</span>}
                </span>
                {e.reading && <span className="ml-auto whitespace-nowrap text-fg-subtle">{timeAgo(e.reading.timestamp, now)}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
