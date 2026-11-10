import { PHASE_LABEL, requirementsForSystem, systemsForRegion, type Requirement } from '../content/lsah'
import type { Evaluation, RegionAssessment } from '../engine/types'
import { STATUS_META, formatRange, formatValue, timeAgo } from '../lib/status'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import { StatusBadge } from './StatusBadge'

/** Everything about one body system: each reading with its guidance, and how NASA checks it. */
export function SystemSheet({
  assessment,
  now,
  onClose,
  onLog,
  onTrend,
  onOpenNasa,
  onOpenRequirement,
}: {
  assessment: RegionAssessment | null
  now: number
  onClose: () => void
  onLog: (indicatorId: string) => void
  onTrend: (indicatorId: string) => void
  /** Open the NASA guide at one LSAH body system. */
  onOpenNasa: (systemId: string) => void
  onOpenRequirement: (requirementId: string) => void
}) {
  return (
    <Sheet open={!!assessment} onClose={onClose} title={assessment?.region.label ?? ''} description={assessment?.region.system}>
      {assessment && (
        <div className="space-y-4">
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
            {assessment.evaluations.length === 0 && <li className="text-sm text-fg-subtle">No readings tracked for this system yet.</li>}
            {assessment.evaluations.map((e) => (
              <IndicatorRow key={e.indicator.id} evaluation={e} now={now} onLog={onLog} onTrend={onTrend} />
            ))}
          </ul>

          <NasaMonitoring
            regionId={assessment.region.id}
            indicatorIds={assessment.evaluations.map((e) => e.indicator.id)}
            onOpenSystem={onOpenNasa}
            onOpenRequirement={onOpenRequirement}
          />
        </div>
      )}
    </Sheet>
  )
}

/**
 * NASA's own checks for this body system, each opening its details. Checks tied to this
 * system's readings come first, then in-flight ones.
 */
function NasaMonitoring({
  regionId,
  indicatorIds,
  onOpenSystem,
  onOpenRequirement,
}: {
  regionId: string
  indicatorIds: string[]
  onOpenSystem: (systemId: string) => void
  onOpenRequirement: (requirementId: string) => void
}) {
  const systems = systemsForRegion(regionId)
  if (systems.length === 0) return null
  return (
    <div className="rounded-2xl border border-sea/30 bg-sea/10 p-3.5">
      <div className="eyebrow text-accent">How NASA checks this</div>
      {systems.map((s) => {
        const all = requirementsForSystem(s.id)
        const score = (r: Requirement) =>
          (r.indicatorIds?.some((id) => indicatorIds.includes(id)) ? 2 : 0) + (r.when.some((w) => w.phase === 'inflight') ? 1 : 0)
        const top = [...all].sort((a, b) => score(b) - score(a)).slice(0, 3)
        return (
          <section key={s.id} className="mt-3 first-of-type:mt-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">{s.label}</h3>
              <button type="button" onClick={() => onOpenSystem(s.id)} className="shrink-0 text-xs font-medium text-accent hover:underline">
                All {all.length} checks
              </button>
            </div>
            <ul className="-mx-1.5 mt-1">
              {top.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onOpenRequirement(r.id)}
                    className="group flex min-h-10 w-full items-center gap-2 rounded-lg px-1.5 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="text-fg">{r.title}</span>
                      <span className="text-xs text-fg-muted"> · {r.when.map((w) => PHASE_LABEL[w.phase]).join(', ')}</span>
                    </span>
                    <Icon name="chevron" className="size-3.5 shrink-0 text-fg-subtle group-hover:text-accent" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
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
