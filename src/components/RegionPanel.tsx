import { AnimatePresence, motion } from 'framer-motion'
import type { RegionAssessment } from '../engine/types'
import { STATUS_META, formatRange, formatValue, timeAgo } from '../lib/status'
import { Card } from './Card'
import { StatusBadge } from './StatusBadge'

export function RegionPanel({
  assessment,
  onPickIndicator,
}: {
  assessment: RegionAssessment | null
  onPickIndicator: (id: string) => void
}) {
  return (
    <Card title="System detail" className="h-full">
      <AnimatePresence mode="wait">
        {!assessment ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-slate-400"
          >
            Select a part of the body to see its health indicators, what they mean, and what to do next.
          </motion.p>
        ) : (
          <motion.div
            key={assessment.region.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-xl font-semibold">{assessment.region.label}</h3>
                <p className="text-xs text-slate-400">{assessment.region.system}</p>
              </div>
              <StatusBadge status={assessment.status} />
            </div>

            <p className="text-sm text-slate-300">{assessment.region.description}</p>

            <div className="flex flex-wrap gap-1.5">
              {assessment.region.hazards.map((h) => (
                <span key={h} className="rounded-md bg-space-700 px-2 py-0.5 text-xs text-slate-300">
                  {h}
                </span>
              ))}
            </div>

            <ul className="space-y-2">
              {assessment.evaluations.length === 0 && (
                <li className="text-sm text-slate-400">No indicators tracked for this system yet.</li>
              )}
              {assessment.evaluations.map((e) => {
                const m = STATUS_META[e.status]
                return (
                  <li key={e.indicator.id}>
                    <button
                      type="button"
                      onClick={() => onPickIndicator(e.indicator.id)}
                      className={`w-full rounded-xl border p-3 text-left transition hover:bg-white/5 ${m.border}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{e.indicator.label}</span>
                        <span className={`font-mono text-lg ${m.text}`}>
                          {e.reading ? formatValue(e.indicator, e.reading.value) : '—'}
                          <span className="ml-1 text-xs text-slate-400">{e.indicator.unit}</span>
                        </span>
                      </div>
                      <div className="mt-0.5 flex justify-between text-xs text-slate-400">
                        <span>Normal: {formatRange(e.indicator)}</span>
                        {e.reading && <span>{timeAgo(e.reading.timestamp)}</span>}
                      </div>
                      <p className={`mt-2 text-sm ${e.status === 'nominal' ? 'text-slate-300' : m.text}`}>
                        {e.guidance}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
