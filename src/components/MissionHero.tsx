import { motion, useReducedMotion } from 'framer-motion'
import type { EnvironmentConfig, Evaluation, Status } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'
import { Icon } from './Icon'
import { PlanetBackdrop } from './PlanetBackdrop'

const HEADLINE: Record<Status, [string, string]> = {
  critical: ['Action', 'required'],
  caution: ['Needs', 'attention'],
  nominal: ['All', 'nominal'],
  unknown: ['No data', 'yet'],
}
const ORDER: Status[] = ['critical', 'caution', 'nominal', 'unknown']
const CHIPS = 4
const SPRING = { type: 'spring', bounce: 0, duration: 0.7 } as const

const listNames = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/**
 * The first screen: where you are, how you are, and the one thing to do next — set as a
 * masthead over the planet, so the most important line on the page is also the largest.
 */
export function MissionHero({
  status,
  evaluations,
  environment,
  missionDay,
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
  missionDay: number
  dueCount: number
  onPick: (indicatorId: string) => void
  onReport: () => void
  onLog: () => void
  onGoToday: () => void
  onChangeEnvironment: () => void
}) {
  const reduce = useReducedMotion()
  const m = STATUS_META[status]
  const flagged = evaluations
    .filter((e) => e.status === 'critical' || e.status === 'caution' || e.trend?.flagged)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
  const critical = flagged.filter((e) => e.status === 'critical').map((e) => e.indicator.label)
  const counts = ORDER.map((s) => [s, evaluations.filter((e) => e.status === s).length] as const)

  const detail: Record<Status, string> = {
    nominal: 'Everything you have logged is inside its normal range. Keep up your routine.',
    caution: `${flagged.length} ${flagged.length === 1 ? 'reading is' : 'readings are'} outside the normal range or drifting from your baseline. Re-measure and follow the guidance.`,
    critical: `${listNames(critical)} ${critical.length === 1 ? 'is' : 'are'} critical. ${environment.escalation}`,
    unknown: 'Log a measurement to see your status, or load demo data from mission settings to explore.',
  }

  // Each block rises in on its own beat, so the eye lands on the masthead first.
  const rise = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay } }
      : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { ...SPRING, delay } }

  return (
    <section
      aria-labelledby="status-headline"
      className="relative isolate -mt-[calc(4rem+env(safe-area-inset-top))] flex min-h-[620px] overflow-hidden sm:min-h-[min(88svh,820px)]"
    >
      {/* The photo fades out at the foot instead of ending on an edge, so the page's own
          ground and dot lattice carry on underneath it. */}
      <PlanetBackdrop className="absolute inset-0 -z-20 size-full [mask-image:linear-gradient(to_bottom,#000_62%,transparent)]" />
      {/* Grade the photo into the page: a scrim behind the copy, and the foot melting into navy. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `
            linear-gradient(to bottom, rgb(11 19 43 / 0.55) 0%, rgb(11 19 43 / 0) 22%),
            linear-gradient(to right, rgb(11 19 43 / 0.78) 0%, rgb(11 19 43 / 0.35) 45%, rgb(11 19 43 / 0) 70%),
            linear-gradient(to bottom, rgb(11 19 43 / 0) 45%, rgb(11 19 43 / 0.55) 80%, rgb(11 19 43 / 0) 100%)`,
        }}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pt-28 pb-10 sm:px-6 md:pb-14">
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <motion.p {...rise(0.15)} className="eyebrow text-fg-muted">
              01 / Your status <span className="text-fg-subtle">—</span> Day {String(missionDay).padStart(2, '0')} ·{' '}
              {environment.label}
            </motion.p>

            <h2 id="status-headline" role="status" className="display mt-3 text-[clamp(3.5rem,11vw,8.5rem)] text-fg">
              {HEADLINE[status].map((word, i) => (
                <motion.span
                  key={word}
                  className="block"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.35em' }}
                  animate={{ opacity: 1, y: '0em' }}
                  transition={reduce ? { duration: 0.3 } : { ...SPRING, delay: 0.25 + i * 0.12 }}
                >
                  {word}
                  {i === 1 && <span className={status === 'unknown' ? 'text-accent' : m.text}>.</span>}
                </motion.span>
              ))}
            </h2>

            <motion.p {...rise(0.5)} className="mt-5 max-w-xl text-[15px] leading-relaxed text-fg sm:text-base">
              {detail[status]}
            </motion.p>

            <motion.div {...rise(0.62)} className="mt-6 flex flex-wrap gap-3">
              {status === 'critical' && (
                <button type="button" onClick={onReport} className="btn btn-ember min-h-11 px-5">
                  <Icon name="send" className="size-4" /> Report to ground
                </button>
              )}
              {status === 'unknown' && (
                <button type="button" onClick={onLog} className="btn btn-primary min-h-11 px-5">
                  <Icon name="plus" className="size-4.5" /> Log first reading
                </button>
              )}
              {status !== 'unknown' && dueCount > 0 && (
                <button
                  type="button"
                  onClick={onGoToday}
                  className={`btn min-h-11 px-5 ${status === 'critical' ? 'btn-plain border border-white/15 backdrop-blur-sm' : 'btn-primary'}`}
                >
                  {dueCount} {dueCount === 1 ? 'measurement' : 'measurements'} due today
                  <Icon name="chevron" className="size-4 rotate-90" />
                </button>
              )}
            </motion.div>

            {flagged.length > 0 && (
              <motion.div {...rise(0.74)} className="mt-7">
                <div className="eyebrow">Needs attention</div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {flagged.slice(0, CHIPS).map((e) => {
                    const em = STATUS_META[e.status === 'nominal' ? 'caution' : e.status]
                    return (
                      <li key={e.indicator.id}>
                        <button
                          type="button"
                          onClick={() => onPick(e.indicator.id)}
                          className={`btn btn-sm border ${em.border} bg-navy-950/55 text-fg backdrop-blur-sm hover:bg-navy-900/80`}
                        >
                          <span className={`size-2 rounded-full ${em.dot}`} />
                          {e.indicator.label}
                          {e.reading && (
                            <span className={`font-mono tabular-nums ${em.text}`}>
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
              </motion.div>
            )}
          </div>

          {status !== 'unknown' && (
            <motion.aside
              {...rise(0.9)}
              aria-label="Readings by status"
              className="brackets rounded-sm bg-navy-950/45 p-5 backdrop-blur-md lg:col-span-4 lg:max-w-sm lg:justify-self-end"
            >
              <div className="eyebrow">Readings by status</div>
              <dl className="mt-4 grid grid-cols-4 gap-3">
                {counts.map(([s, n]) => (
                  <div key={s} className="flex flex-col-reverse">
                    <dt className="mt-1 text-[11px] text-fg-muted">{STATUS_META[s].label}</dt>
                    <dd className={`display text-[2.75rem] tabular-nums ${n > 0 && s !== 'nominal' && s !== 'unknown' ? STATUS_META[s].text : 'text-fg'}`}>
                      {n}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 border-t border-white/10 pt-3 text-xs text-fg-subtle">
                Comms delay {environment.commsDelay.charAt(0).toLowerCase() + environment.commsDelay.slice(1)} ·{' '}
                <button type="button" onClick={onChangeEnvironment} className="font-medium text-accent hover:underline">
                  Change
                </button>
              </p>
            </motion.aside>
          )}
        </div>
      </div>
    </section>
  )
}
