import { AnimatePresence, motion } from 'framer-motion'
import { systemsForRegion } from '../content/lsah'
import type { Evaluation, RegionAssessment } from '../engine/types'
import { STATUS_META, formatRange, formatValue, timeAgo } from '../lib/status'
import { Card } from './Card'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'

/** Detail for one body system, or a list of all systems when none is chosen yet. */
export function RegionPanel({
  assessment,
  regions,
  now,
  onSelectRegion,
  onLog,
  onTrend,
  onOpenNasa,
}: {
  assessment: RegionAssessment | null
  regions: RegionAssessment[]
  now: number
  onSelectRegion: (id: string | null) => void
  onLog: (indicatorId: string) => void
  onTrend: (indicatorId: string) => void
  /** Open the NASA resources view at one LSAH body system. */
  onOpenNasa: (systemId: string) => void
}) {
  return (
    <Card
      title={assessment ? assessment.region.label : 'Body systems'}
      subtitle={assessment ? assessment.region.system : 'Choose a system, here or on the body map'}
      action={
        assessment && (
          <button type="button" onClick={() => onSelectRegion(null)} className="btn btn-plain btn-sm">
            All systems
          </button>
        )
      }
      className="h-full"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!assessment ? (
          <motion.ul
            key="all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="-mx-2 space-y-0.5"
          >
            {regions.map((r) => (
              <li key={r.region.id}>
                <button
                  type="button"
                  onClick={() => onSelectRegion(r.region.id)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-white/5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{r.region.label}</span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {r.evaluations.map((e) => e.indicator.label).join(', ') || 'No indicators yet'}
                    </span>
                  </span>
                  <StatusBadge status={r.status} className="shrink-0" />
                  <Icon name="chevron" className="size-4 shrink-0 text-fg-subtle" />
                </button>
              </li>
            ))}
          </motion.ul>
        ) : (
          <motion.div
            key={assessment.region.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={assessment.status} />
              {assessment.region.hazards.map((h) => (
                <span key={h} className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-fg-muted">
                  {h}
                </span>
              ))}
            </div>

            <p className="text-sm text-fg-muted">{assessment.region.description}</p>

            <ul className="space-y-2.5">
              {assessment.evaluations.length === 0 && (
                <li className="text-sm text-fg-subtle">No indicators tracked for this system yet.</li>
              )}
              {assessment.evaluations.map((e) => (
                <IndicatorRow key={e.indicator.id} evaluation={e} now={now} onLog={onLog} onTrend={onTrend} />
              ))}
            </ul>

            <NasaMonitoring regionId={assessment.region.id} onOpen={onOpenNasa} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

/** What NASA's LSAH program measures for this system in the clinic, beyond what crew log here. */
function NasaMonitoring({ regionId, onOpen }: { regionId: string; onOpen: (systemId: string) => void }) {
  const systems = systemsForRegion(regionId)
  if (systems.length === 0) return null
  return (
    <div className="rounded-2xl border border-ember/30 bg-ember/10 p-3.5">
      <div className="eyebrow text-sand">Monitored by NASA</div>
      <ul className="mt-2 space-y-2">
        {systems.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onOpen(s.id)} className="group flex w-full items-start gap-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium group-hover:text-sand">{s.label}</span>
                <span className="block text-xs text-fg-muted">
                  {s.examples.slice(0, 2).join(' · ')} · {s.documents} requirement {s.documents === 1 ? 'doc' : 'docs'}
                </span>
              </span>
              <Icon name="chevron" className="mt-0.5 size-4 shrink-0 text-fg-subtle group-hover:text-sand" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function IndicatorRow({
  evaluation: e,
  now,
  onLog,
  onTrend,
}: {
  evaluation: Evaluation
  now: number
  onLog: (id: string) => void
  onTrend: (id: string) => void
}) {
  const m = STATUS_META[e.status]
  const off = e.status === 'caution' || e.status === 'critical'
  return (
    <li className={`rounded-2xl border p-3.5 ${off ? `${m.border} ${m.bg}` : 'border-line bg-white/3'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{e.indicator.label}</span>
        <span className={`text-lg font-semibold tabular-nums ${off ? m.text : 'text-fg'}`}>
          {e.reading ? formatValue(e.indicator, e.reading.value) : '—'}
          <span className="ml-1 text-xs font-normal text-fg-subtle">{e.indicator.unit}</span>
        </span>
      </div>
      <div className="mt-0.5 flex justify-between gap-2 text-xs text-fg-subtle">
        <span>Normal {formatRange(e.indicator)}</span>
        {e.reading && <span>{timeAgo(e.reading.timestamp, now)}</span>}
      </div>
      {e.trend && <TrendLine evaluation={e} />}
      <p className={`mt-2 text-sm ${off ? 'text-fg' : 'text-fg-muted'}`}>{e.guidance}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onLog(e.indicator.id)} className="btn btn-tinted btn-sm">
          <Icon name="plus" className="size-3.5" /> Log
        </button>
        <button type="button" onClick={() => onTrend(e.indicator.id)} className="btn btn-plain btn-sm">
          <Icon name="trends" className="size-3.5" /> See trend
        </button>
      </div>
    </li>
  )
}

function TrendLine({ evaluation: e }: { evaluation: Evaluation }) {
  const t = e.trend!
  const arrow = t.delta > 0 ? '↑' : t.delta < 0 ? '↓' : '→'
  const digits = Math.max(e.indicator.decimals, 1)
  return (
    <div className={`mt-0.5 text-xs ${t.flagged ? 'font-medium text-caution' : 'text-fg-subtle'}`}>
      {t.baselineDays}-day avg {t.baseline.toFixed(digits)} {e.indicator.unit} · {arrow} {t.delta >= 0 ? '+' : ''}
      {t.delta.toFixed(digits)}
      {t.flagged && ' · trend alert'}
    </div>
  )
}
