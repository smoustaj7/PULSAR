import hazards from '../config/hazards.json'
import type { IndicatorConfig, Range, Status } from '../engine/types'
import { STATUS_META, formatRange } from '../lib/status'
import { useActiveConfig } from '../lib/useActiveConfig'
import { Card } from './Card'
import { StatusBadge } from './StatusBadge'

const STATUS_HELP: [Status, string][] = [
  ['nominal', 'Inside the normal range. Keep up your routine.'],
  ['caution', 'Outside the normal range, or trending away from your personal baseline. Re-measure, follow the guidance, and keep watching it.'],
  ['critical', "Well outside the expected range. Act on the guidance now and escalate using your environment's plan."],
  ['unknown', 'No reading yet, so the status cannot be assessed. Take the measurement.'],
]

const rangeText = (r: Range, unit: string) =>
  r.min !== null && r.max !== null ? `${r.min}–${r.max} ${unit}` : r.min !== null ? `≥ ${r.min} ${unit}` : `≤ ${r.max} ${unit}`

function trendText(i: IndicatorConfig): string | null {
  if (!i.trend) return null
  const parts = [
    i.trend.rise !== undefined && `rises ${i.trend.rise} ${i.unit}`,
    i.trend.drop !== undefined && `drops ${i.trend.drop} ${i.unit}`,
  ].filter(Boolean)
  return `Early warning if it ${parts.join(' or ')} vs. your ${i.trend.baselineDays ?? 7}-day average.`
}

export function FieldManual() {
  const { config, environment } = useActiveConfig()
  const regionLabel = (id: string) => config.regions.find((r) => r.id === id)?.label ?? id

  return (
    <div className="space-y-4">
      <Card title="How to read your status">
        <ul className="grid gap-3 sm:grid-cols-2">
          {STATUS_HELP.map(([status, text]) => (
            <li key={status} className={`rounded-xl border p-3 ${STATUS_META[status].border}`}>
              <StatusBadge status={status} />
              <p className="mt-2 text-sm text-slate-300">{text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-critical/30 bg-critical/5 p-3 text-sm">
          <div className="font-semibold text-critical">When to call the ground: {environment.label}</div>
          <p className="mt-1 text-slate-300">{environment.escalation}</p>
          <p className="mt-1 text-xs text-slate-400">
            Comms delay: {environment.commsDelay}. {environment.support}
          </p>
        </div>
      </Card>

      <Card title="The five hazards of human spaceflight">
        <p className="mb-3 text-sm text-slate-400">From NASA's Human Research Program. Each hazard affects the body systems listed.</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hazards.map((h) => {
            const affected = config.regions.filter((r) => r.hazards.includes(h.label))
            return (
              <article key={h.label} className="rounded-xl border border-white/10 bg-space-800/50 p-3 text-sm">
                <h3 className="font-semibold text-sky-300">{h.label}</h3>
                <p className="mt-1 text-slate-300">{h.summary}</p>
                <p className="mt-2 text-slate-400">
                  <span className="text-slate-300">Effects: </span>
                  {h.effects}
                </p>
                <p className="mt-1 text-slate-400">
                  <span className="text-slate-300">What you can do: </span>
                  {h.actions}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {affected.map((r) => (
                    <span key={r.id} className="rounded bg-space-700 px-1.5 py-0.5 text-[11px] text-slate-300">
                      {r.label}
                    </span>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </Card>

      <Card title="Indicator reference">
        <div className="grid gap-3 md:grid-cols-2">
          {config.indicators.map((i) => (
            <article key={i.id} className="rounded-xl border border-white/10 bg-space-800/50 p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{i.label}</h3>
                <span className="text-xs text-slate-400">{regionLabel(i.regionId)}</span>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-slate-500">Normal</dt>
                  <dd className="text-nominal">{formatRange(i)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Caution</dt>
                  <dd className="text-caution">{rangeText(i.caution, i.unit)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Measure every</dt>
                  <dd className="text-slate-300">{i.cadenceHours >= 48 ? `${i.cadenceHours / 24} days` : `${i.cadenceHours} h`}</dd>
                </div>
              </dl>
              <p className="mt-2 text-slate-300">
                <span className="font-medium text-sky-300">How: </span>
                {i.howToMeasure}
              </p>
              <p className="mt-1 text-slate-400">
                <span className="font-medium text-slate-300">Why: </span>
                {i.whyItMatters}
              </p>
              {trendText(i) && <p className="mt-1 text-xs text-caution/80">{trendText(i)}</p>}
            </article>
          ))}
        </div>
      </Card>
    </div>
  )
}
