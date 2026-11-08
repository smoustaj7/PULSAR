import { Card, PageHeader } from '../components/Card'
import { Icon } from '../components/Icon'
import { ReadingHistory } from '../components/ReadingHistory'
import { StatusBadge } from '../components/StatusBadge'
import { TrendChart } from '../components/TrendChart'
import type { Evaluation, Reading } from '../engine/types'
import { STATUS_META, formatRange } from '../lib/status'

const cadence = (hours: number) => (hours >= 48 ? `Every ${hours / 24} days` : hours === 24 ? 'Daily' : `Every ${hours} h`)

/** One vital at a time: pick it, see how it moves against its normal band, review or fix the log. */
export function TrendsView({
  readings,
  evaluations,
  indicatorId,
  onSelect,
  onLog,
}: {
  readings: Reading[]
  evaluations: Evaluation[]
  indicatorId: string
  onSelect: (id: string) => void
  onLog: (indicatorId: string) => void
}) {
  const current = evaluations.find((e) => e.indicator.id === indicatorId) ?? evaluations[0]
  const indicator = current.indicator

  return (
    <div>
      <PageHeader title="Trends">How each vital changes over time, against its normal range and your own baseline.</PageHeader>

      <div
        role="group"
        aria-label="Vital to chart"
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
                active ? 'border-accent bg-accent text-navy-950' : 'border-line bg-white/4 text-fg-muted hover:text-fg'
              }`}
            >
              <span className={`size-2 rounded-full ${STATUS_META[e.status].dot} ${active ? 'ring-2 ring-navy-950/30' : ''}`} />
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

        <Card title="About this measurement" className="lg:col-span-4">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
            <div className="bg-navy-900 p-3">
              <dt className="text-xs text-fg-subtle">Normal</dt>
              <dd className="mt-0.5 font-medium text-nominal">{formatRange(indicator)}</dd>
            </div>
            <div className="bg-navy-900 p-3">
              <dt className="text-xs text-fg-subtle">Measure</dt>
              <dd className="mt-0.5 font-medium">{cadence(indicator.cadenceHours)}</dd>
            </div>
          </dl>
          <h3 className="mt-4 text-sm font-medium text-accent">How to measure</h3>
          <p className="mt-1 text-sm text-fg">{indicator.howToMeasure}</p>
          <h3 className="mt-4 text-sm font-medium text-sand">Why it matters in space</h3>
          <p className="mt-1 text-sm text-fg-muted">{indicator.whyItMatters}</p>
          <div className={`mt-4 rounded-2xl border p-3 text-sm ${STATUS_META[current.status].border} ${STATUS_META[current.status].bg}`}>
            <StatusBadge status={current.status} />
            <p className="mt-2 text-fg">{current.guidance}</p>
          </div>
          <button type="button" onClick={() => onLog(indicator.id)} className="btn btn-primary mt-4 w-full">
            <Icon name="plus" className="size-4.5" /> Log a reading
          </button>
        </Card>
      </div>
    </div>
  )
}
