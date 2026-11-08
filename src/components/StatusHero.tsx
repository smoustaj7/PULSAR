import type { EnvironmentConfig, Evaluation, Status } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'
import { Icon, type IconName } from './Icon'

const HEADLINE: Record<Status, string> = {
  nominal: 'All systems nominal',
  caution: 'Some vitals need attention',
  critical: 'Action required',
  unknown: 'No readings yet',
}

const ICON: Record<Status, IconName> = {
  nominal: 'check',
  caution: 'alert',
  critical: 'alert',
  unknown: 'clock',
}

const ORDER: Status[] = ['critical', 'caution', 'nominal', 'unknown']

/** The answer to "how am I doing, and what should I do now?" in one card. */
export function StatusHero({
  status,
  evaluations,
  environment,
  onPick,
  onReport,
  onLog,
  onChangeEnvironment,
}: {
  status: Status
  evaluations: Evaluation[]
  environment: EnvironmentConfig
  onPick: (indicatorId: string) => void
  onReport: () => void
  onLog: () => void
  onChangeEnvironment: () => void
}) {
  const m = STATUS_META[status]
  const counts = ORDER.map((s) => [s, evaluations.filter((e) => e.status === s).length] as const).filter(([, n]) => n > 0)
  const flagged = evaluations
    .filter((e) => e.status === 'critical' || e.status === 'caution' || e.trend?.flagged)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))

  const detail: Record<Status, string> = {
    nominal: 'Everything you have logged is inside its normal range. Keep up your routine.',
    caution: `${flagged.length} ${flagged.length === 1 ? 'vital is' : 'vitals are'} outside the normal range or drifting from your baseline. Re-measure and follow the guidance.`,
    critical: environment.escalation,
    unknown: 'Log a measurement to see your status, or load demo data from mission settings to explore.',
  }

  return (
    <section
      className="surface relative overflow-hidden p-5 sm:p-6"
      style={{
        backgroundImage: `radial-gradient(36rem 14rem at 0% 0%, color-mix(in oklab, ${m.color} 16%, transparent), transparent 70%)`,
      }}
      aria-labelledby="status-headline"
    >
      <div className="flex items-start gap-4">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl ${m.bg} ${m.text} ${status === 'critical' ? 'motion-safe:animate-pulse' : ''}`}
        >
          <Icon name={ICON[status]} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div role="status">
            <h2 id="status-headline" className={`text-2xl leading-tight font-bold tracking-[-0.015em] ${m.text}`}>
              {HEADLINE[status]}
            </h2>
            <p className="mt-1 max-w-xl text-[15px] text-fg">{detail[status]}</p>
          </div>
          {status === 'critical' && (
            <button type="button" onClick={onReport} className="btn btn-ember mt-4">
              <Icon name="send" className="size-4" /> Report to ground
            </button>
          )}
          {status === 'unknown' && (
            <button type="button" onClick={onLog} className="btn btn-primary mt-4">
              <Icon name="plus" className="size-4.5" /> Log first reading
            </button>
          )}
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow">Needs attention</div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {flagged.map((e) => {
              const em = STATUS_META[e.status === 'nominal' ? 'caution' : e.status]
              return (
                <li key={e.indicator.id}>
                  <button
                    type="button"
                    onClick={() => onPick(e.indicator.id)}
                    className={`btn btn-sm border ${em.border} ${em.bg} text-fg hover:brightness-125`}
                  >
                    <span className={`size-2 rounded-full ${em.dot}`} />
                    {e.indicator.label}
                    {e.reading && (
                      <span className={`tabular-nums ${em.text}`}>
                        {formatValue(e.indicator, e.reading.value)} {e.indicator.unit}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {counts.length > 0 && status !== 'unknown' && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted" aria-label="Vitals by status">
          {counts.map(([s, n]) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${STATUS_META[s].dot}`} />
              <span className="font-semibold text-fg tabular-nums">{n}</span> {STATUS_META[s].label.toLowerCase()}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm sm:grid-cols-3">
        <Context label="Gravity" value={environment.gravity} />
        <Context label="Comms delay to Earth" value={environment.commsDelay} />
        <Context label="Medical support" value={environment.support} />
      </dl>
      <p className="mt-3 text-xs text-fg-subtle">
        Environment: <span className="text-fg-muted">{environment.label}</span> ·{' '}
        <button type="button" onClick={onChangeEnvironment} className="font-medium text-accent hover:underline">
          Change
        </button>
      </p>
    </section>
  )
}

function Context({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-900 px-3.5 py-2.5">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-fg">{value}</dd>
    </div>
  )
}
