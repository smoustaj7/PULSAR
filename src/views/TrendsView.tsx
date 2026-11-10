import { Card, PageHeader } from '../components/Card'
import { Icon } from '../components/Icon'
import { ReadingHistory } from '../components/ReadingHistory'
import { StatusBadge } from '../components/StatusBadge'
import { TrendChart } from '../components/TrendChart'
import { findingsForIndicator } from '../content/findings'
import { INDICATOR_NASA } from '../content/indicatorNasa'
import { requirementsById } from '../content/lsah'
import type { Evaluation, Reading } from '../engine/types'
import { STATUS_META, formatRange } from '../lib/status'

const cadence = (hours: number) => (hours >= 48 ? `Every ${hours / 24} days` : hours === 24 ? 'Daily' : `Every ${hours} h`)

/** One reading at a time: pick it, see how it moves against its normal band, review or fix the log. */
export function TrendsView({
  readings,
  evaluations,
  indicatorId,
  onSelect,
  onLog,
  onOpenRequirement,
  onOpenResearch,
}: {
  readings: Reading[]
  evaluations: Evaluation[]
  indicatorId: string
  onSelect: (id: string) => void
  onLog: (indicatorId: string) => void
  onOpenRequirement: (requirementId: string) => void
  onOpenResearch: () => void
}) {
  const current = evaluations.find((e) => e.indicator.id === indicatorId) ?? evaluations[0]
  const indicator = current.indicator

  return (
    <div>
      <PageHeader title="Trends">How each reading changes over time, against its normal range and your own baseline.</PageHeader>

      <div
        role="group"
        aria-label="Reading to chart"
        className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {evaluations.map((e) => {
          const active = e.indicator.id === indicatorId
          return (
            <button
              key={e.indicator.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(e.indicator.id)}
              className={`btn btn-sm shrink-0 border ${
                active ? 'border-accent bg-accent text-ink-950' : 'border-line bg-white/4 text-fg-muted hover:text-fg'
              }`}
            >
              <span className={`size-2 rounded-full ${STATUS_META[e.status].dot} ${active ? 'ring-2 ring-ink-950/30' : ''}`} />
              {e.indicator.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-8">
          <TrendChart readings={readings} indicatorId={indicatorId} />
          <ReadingHistory readings={readings} indicatorId={indicatorId} />
        </div>

        <div className="space-y-4 lg:col-span-4">
        <Card title="About this measurement">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
            <div className="bg-ink-900 p-3">
              <dt className="text-xs text-fg-subtle">Normal</dt>
              <dd className="mt-0.5 font-medium text-nominal">{formatRange(indicator)}</dd>
            </div>
            <div className="bg-ink-900 p-3">
              <dt className="text-xs text-fg-subtle">Measure</dt>
              <dd className="mt-0.5 font-medium">{cadence(indicator.cadenceHours)}</dd>
            </div>
          </dl>
          <h3 className="mt-4 text-sm font-medium text-accent">How to measure</h3>
          <p className="mt-1 text-sm text-fg">{indicator.howToMeasure}</p>
          <h3 className="mt-4 text-sm font-medium text-accent">Why it matters in space</h3>
          <p className="mt-1 text-sm text-fg-muted">{indicator.whyItMatters}</p>
          <div className={`mt-4 rounded-2xl border p-3 text-sm ${STATUS_META[current.status].border} ${STATUS_META[current.status].bg}`}>
            <StatusBadge status={current.status} />
            <p className="mt-2 text-fg">{current.guidance}</p>
          </div>
          <button type="button" onClick={() => onLog(indicator.id)} className="btn btn-primary mt-4 w-full">
            <Icon name="plus" className="size-4.5" /> Log a reading
          </button>
        </Card>
        <NasaContext indicatorId={indicator.id} onOpenRequirement={onOpenRequirement} onOpenResearch={onOpenResearch} />
        </div>
      </div>
    </div>
  )
}

/** How NASA itself tracks this reading, and what its data has shown about it. */
function NasaContext({
  indicatorId,
  onOpenRequirement,
  onOpenResearch,
}: {
  indicatorId: string
  onOpenRequirement: (id: string) => void
  onOpenResearch: () => void
}) {
  const nasa = INDICATOR_NASA[indicatorId]
  if (!nasa) return null
  const findings = findingsForIndicator(indicatorId).slice(0, 2)
  return (
    <Card title="How NASA tracks this" subtitle="From NASA’s astronaut medical requirements">
      <p className="text-sm text-fg">{nasa.protocol}</p>
      <ul className="-mx-2 mt-3 space-y-0.5">
        {nasa.requirementIds.map((id) => {
          const r = requirementsById[id]
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onOpenRequirement(id)}
                className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-white/5"
              >
                <span className="min-w-0 flex-1 text-sm font-medium">{r.title}</span>
                <span className="shrink-0 text-xs text-fg-subtle">{r.code}</span>
                <Icon name="chevron" className="size-4 shrink-0 text-fg-subtle group-hover:text-fg" />
              </button>
            </li>
          )
        })}
      </ul>
      {findings.length > 0 && (
        <>
          <h3 className="eyebrow mt-4">What NASA’s data shows</h3>
          <ul className="mt-2 space-y-2">
            {findings.map((f) => (
              <li key={f.id} className="rounded-2xl border border-line bg-white/3 p-3">
                <p className="text-lg leading-tight font-bold text-accent tabular-nums">{f.stat}</p>
                <p className="mt-0.5 text-sm text-fg">{f.statLabel}</p>
                <p className="mt-1 text-xs text-fg-subtle">{f.source}</p>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onOpenResearch} className="btn btn-plain btn-sm mt-3">
            All research findings <Icon name="chevron" className="size-3.5" />
          </button>
        </>
      )}
    </Card>
  )
}
