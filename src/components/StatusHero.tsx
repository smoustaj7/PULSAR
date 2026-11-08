import type { EnvironmentConfig, Evaluation, Status } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'
import { Icon, type IconName } from './Icon'

const HEADLINE: Record<Status, string> = {
  nominal: 'All systems nominal',
  caution: 'Some readings need attention',
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
const CHIPS = 4

const listNames = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/**
 * The first thing to read: how am I doing, and the one thing to do about it. Readings that
 * need a look are listed underneath; everything else lives further down the dashboard.
 */
export function StatusHero({
  status,
  evaluations,
  environment,
  dueCount,
  onPick,
  onReport,
  onLog,
  onGoToday,
  onChangeEnvironment,
}: {
  status: Status
  evaluations: Evaluation[]
  environment: EnvironmentConfig
  /** Measurements due now, which the Today list holds. */
  dueCount: number
  onPick: (indicatorId: string) => void
  onReport: () => void
  onLog: () => void
  onGoToday: () => void
  onChangeEnvironment: () => void
}) {
  const m = STATUS_META[status]
  const flagged = evaluations
    .filter((e) => e.status === 'critical' || e.status === 'caution' || e.trend?.flagged)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
  const critical = flagged.filter((e) => e.status === 'critical').map((e) => e.indicator.label)

  const detail: Record<Status, string> = {
    nominal: 'Everything you have logged is inside its normal range. Keep up your routine.',
    caution: `${flagged.length} ${flagged.length === 1 ? 'reading is' : 'readings are'} outside the normal range or drifting from your baseline. Re-measure and follow the guidance.`,
    critical: `${listNames(critical)} ${critical.length === 1 ? 'is' : 'are'} critical. ${environment.escalation}`,
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
          <p className="eyebrow">Your status</p>
          <div role="status" className="mt-1">
            <h2 id="status-headline" className={`text-2xl leading-tight font-bold tracking-[-0.015em] ${m.text}`}>
              {HEADLINE[status]}
            </h2>
            <p className="mt-1 max-w-xl text-[15px] text-fg">{detail[status]}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {status === 'critical' && (
              <button type="button" onClick={onReport} className="btn btn-ember">
                <Icon name="send" className="size-4" /> Report to ground
              </button>
            )}
            {status === 'unknown' && (
              <button type="button" onClick={onLog} className="btn btn-primary">
                <Icon name="plus" className="size-4.5" /> Log first reading
              </button>
            )}
            {status !== 'unknown' && dueCount > 0 && (
              <button type="button" onClick={onGoToday} className={`btn ${status === 'critical' ? 'btn-plain' : 'btn-primary'}`}>
                {dueCount} {dueCount === 1 ? 'measurement' : 'measurements'} due today
                <Icon name="chevron" className="size-4 rotate-90" />
              </button>
            )}
          </div>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="eyebrow">Needs attention</div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {flagged.slice(0, CHIPS).map((e) => {
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
            {flagged.length > CHIPS && (
              <li className="self-center px-1 text-xs text-fg-subtle">+{flagged.length - CHIPS} more below</li>
            )}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-fg-subtle">
        {environment.label} · comms delay {environment.commsDelay.charAt(0).toLowerCase() + environment.commsDelay.slice(1)} ·{' '}
        <button type="button" onClick={onChangeEnvironment} className="font-medium text-accent hover:underline">
          Change
        </button>
      </p>
    </section>
  )
}
