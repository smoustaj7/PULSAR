import hazards from '../config/hazards.json'
import type { IndicatorConfig, Range, Status } from '../engine/types'
import { STATUS_META, formatRange } from '../lib/status'
import { useActiveConfig } from '../lib/useActiveConfig'
import { Card, PageHeader } from './Card'
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
      <PageHeader title="Field manual">What each status means, the hazards behind them, and how to take every measurement.</PageHeader>
      <Card title="How to read your status">
        <ul className="grid gap-3 sm:grid-cols-2">
          {STATUS_HELP.map(([status, text]) => (
            <li key={status} className={`rounded-2xl border p-3.5 ${STATUS_META[status].border} ${STATUS_META[status].bg}`}>
              <StatusBadge status={status} />
              <p className="mt-2 text-sm text-fg">{text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl border border-critical/35 bg-critical/8 p-4 text-sm">
          <div className="font-semibold text-critical">When to call the ground: {environment.label}</div>
          <p className="mt-1 text-fg">{environment.escalation}</p>
          <p className="mt-1 text-xs text-fg-muted">
            Comms delay: {environment.commsDelay}. {environment.support}
          </p>
        </div>
      </Card>

      <Card title="The five hazards of human spaceflight" subtitle="From NASA's Human Research Program. Each hazard affects the body systems listed.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hazards.map((h) => {
            const affected = config.regions.filter((r) => r.hazards.includes(h.label))
            return (
              <article key={h.label} className="rounded-2xl border border-line bg-white/3 p-4 text-sm">
                <h3 className="font-semibold text-sand">{h.label}</h3>
                <p className="mt-1 text-fg">{h.summary}</p>
                <p className="mt-2 text-fg-muted">
                  <span className="font-medium text-fg">Effects: </span>
                  {h.effects}
                </p>
                <p className="mt-1 text-fg-muted">
                  <span className="font-medium text-fg">What you can do: </span>
                  {h.actions}
                </p>
                <p className="mt-2 rounded-xl bg-ember/10 px-3 py-2 text-fg">
                  <span className="font-medium text-sand">NASA data: </span>
                  {h.nasa}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {affected.map((r) => (
                    <span key={r.id} className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-fg-muted">
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
            <article key={i.id} className="rounded-2xl border border-line bg-white/3 p-4 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{i.label}</h3>
                <span className="text-xs text-fg-subtle">{regionLabel(i.regionId)}</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-navy-950/50 p-2.5 text-xs">
                <div>
                  <dt className="text-fg-subtle">Normal</dt>
                  <dd className="text-nominal">{formatRange(i)}</dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">Caution</dt>
                  <dd className="text-caution">{rangeText(i.caution, i.unit)}</dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">Measure every</dt>
                  <dd className="text-fg">{i.cadenceHours >= 48 ? `${i.cadenceHours / 24} days` : `${i.cadenceHours} h`}</dd>
                </div>
              </dl>
              <p className="mt-3 text-fg">
                <span className="font-medium text-accent">How: </span>
                {i.howToMeasure}
              </p>
              <p className="mt-1 text-fg-muted">
                <span className="font-medium text-fg">Why: </span>
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
