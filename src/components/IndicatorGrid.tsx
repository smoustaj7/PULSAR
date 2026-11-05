import type { Evaluation } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'

export function IndicatorGrid({
  evaluations,
  selectedId,
  onSelect,
}: {
  evaluations: Evaluation[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9">
      {evaluations.map((e) => {
        const m = STATUS_META[e.status]
        const selected = e.indicator.id === selectedId
        return (
          <button
            key={e.indicator.id}
            type="button"
            onClick={() => onSelect(e.indicator.id)}
            aria-pressed={selected}
            className={`rounded-xl border p-3 text-left transition ${m.bg} ${m.border} ${
              selected ? 'ring-2 ring-white/70' : 'hover:brightness-125'
            }`}
          >
            <div className="flex min-h-8 items-start gap-1.5 text-xs leading-4 text-slate-300">
              <span className={`mt-1 size-2 shrink-0 rounded-full ${m.dot}`} />
              <span className="line-clamp-2">{e.indicator.label}</span>
            </div>
            <div className={`mt-1 font-mono text-2xl ${m.text}`}>
              {e.reading ? formatValue(e.indicator, e.reading.value) : '—'}
              <span className="ml-1 text-xs text-slate-400">{e.indicator.unit}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
