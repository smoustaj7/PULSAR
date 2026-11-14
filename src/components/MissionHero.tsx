import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Evaluation, Status } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'
import { Icon, type IconName } from './Icon'
import { SpaceBackdrop } from './SpaceBackdrop'

const HEADLINE: Record<Exclude<Status, 'unknown'>, [string, string]> = {
  critical: ['Action', 'required'],
  caution: ['Needs', 'attention'],
  nominal: ['All', 'nominal'],
}
const ORDER: Status[] = ['critical', 'caution', 'nominal', 'unknown']
const CHIPS = 4
const SPRING = { type: 'spring', bounce: 0, duration: 0.7 } as const

/**
 * The first screen: where you are, how you are, and the one thing to do next — set as a
 * masthead over the nebula, so the most important line on the page is also the largest. It
 * fills the screen, so the day's cards start below the fold rather than peeking in. Before
 * the first reading it is a welcome instead: what the app does, and two ways in.
 */
export function MissionHero({
  status,
  evaluations,
  dueCount,
  model,
  onPick,
  onReport,
  onLog,
  onGoToday,
  onTryDemo,
}: {
  status: Status
  evaluations: Evaluation[]
  dueCount: number
  /** The body model: beside the welcome, or in the right column above the status counts. */
  model: ReactNode
  onPick: (indicatorId: string) => void
  onReport: () => void
  onLog: () => void
  onGoToday: () => void
  /** Fill the log with demo readings, to look around before logging anything. */
  onTryDemo: () => void
}) {
  const reduce = useReducedMotion()
  const m = STATUS_META[status]
  const flagged = evaluations
    .filter((e) => e.status === 'critical' || e.status === 'caution' || e.trend?.flagged)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
  const counts = ORDER.map((s) => [s, evaluations.filter((e) => e.status === s).length] as const)

  // Each block rises in on its own beat, so the eye lands on the masthead first.
  const rise = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay } }
      : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { ...SPRING, delay } }

  return (
    <section
      aria-labelledby="status-headline"
      className="relative isolate -mt-[calc(4rem+env(safe-area-inset-top))] flex min-h-svh overflow-hidden"
    >
      {/* The video fades out at the foot instead of ending on an edge, so the page's own
          ground and dot lattice carry on underneath it. */}
      <SpaceBackdrop className="absolute inset-0 -z-20 size-full [mask-image:linear-gradient(to_bottom,#000_62%,transparent)]" />
      {/* Grade the video into the page: a scrim behind the copy, and the foot melting into the ground. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `
            linear-gradient(to bottom, rgb(6 29 36 / 0.55) 0%, rgb(6 29 36 / 0) 22%),
            linear-gradient(to right, rgb(6 29 36 / 0.78) 0%, rgb(6 29 36 / 0.35) 45%, rgb(6 29 36 / 0) 70%),
            linear-gradient(to bottom, rgb(6 29 36 / 0) 45%, rgb(6 29 36 / 0.55) 80%, rgb(6 29 36 / 0) 100%)`,
        }}
      />
      {/* On narrow screens the welcome's copy runs across the nebula's bright clouds, so it
          gets a deeper shade there. Wide screens keep the copy on the darker left side. */}
      {status === 'unknown' && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 lg:hidden"
          style={{ background: 'linear-gradient(to bottom, rgb(6 29 36 / 0.3), rgb(6 29 36 / 0.72) 30%, rgb(6 29 36 / 0.82))' }}
        />
      )}

      <div
        className={`mx-auto flex w-full max-w-7xl flex-col px-4 pt-24 pb-10 sm:px-6 md:pb-14 ${status === 'unknown' ? 'justify-center' : 'justify-end'}`}
      >
        {status === 'unknown' ? (
          <Welcome model={model} rise={rise} reduce={reduce} onLog={onLog} onTryDemo={onTryDemo} />
        ) : (
        <div className="grid items-end gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h2 id="status-headline" role="status" className="display text-[clamp(3.5rem,11vw,8.5rem)] text-fg">
              {HEADLINE[status].map((word, i) => (
                <motion.span
                  key={word}
                  className="block"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.35em' }}
                  animate={{ opacity: 1, y: '0em' }}
                  transition={reduce ? { duration: 0.3 } : { ...SPRING, delay: 0.25 + i * 0.12 }}
                >
                  {word}
                  {i === 1 && <span className={m.text}>.</span>}
                </motion.span>
              ))}
            </h2>

            <motion.div {...rise(0.62)} className="mt-6 flex flex-wrap gap-3">
              {status === 'critical' && (
                <button type="button" onClick={onReport} className="btn btn-primary min-h-11 px-5">
                  <Icon name="send" className="size-4" /> Report to ground
                </button>
              )}
              {dueCount > 0 && (
                <button
                  type="button"
                  onClick={onGoToday}
                  className={`btn min-h-11 px-5 ${status === 'critical' ? 'btn-plain border border-mist/20 backdrop-blur-sm' : 'btn-primary'}`}
                >
                  {dueCount} {dueCount === 1 ? 'measurement' : 'measurements'} due today
                  <Icon name="chevron" className="size-4 rotate-90" />
                </button>
              )}
            </motion.div>

            {flagged.length > 0 && (
              <motion.div {...rise(0.74)} className="mt-9 max-w-3xl border-t border-mist/15 pt-6">
                {/* Three lines per reading: what it is, the value, and how it stands. Each reading
                    shares the row's tracks (subgrid), so a name that wraps keeps values level. */}
                <ul aria-label="Readings that need attention" className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
                  {flagged.slice(0, CHIPS).map((e) => {
                    const em = STATUS_META[e.status === 'nominal' ? 'caution' : e.status]
                    const state = e.status === 'nominal' && e.trend?.flagged ? 'Trending off' : em.label
                    return (
                      <li key={e.indicator.id} className="row-span-3 grid grid-rows-subgrid [&:nth-child(n+3)]:mt-7 sm:[&:nth-child(n+3)]:mt-0">
                        <button
                          type="button"
                          onClick={() => onPick(e.indicator.id)}
                          className="group row-span-3 grid grid-rows-subgrid text-left"
                        >
                          <span className="line-clamp-2 self-end text-[13px] leading-snug text-fg-muted transition-colors duration-150 group-hover:text-fg">
                            {e.indicator.label}
                          </span>
                          <span className={`display mt-2 block text-[2.5rem] tabular-nums ${em.text}`}>
                            {e.reading ? formatValue(e.indicator, e.reading.value) : '—'}
                            <span className="ml-1 font-sans text-sm font-normal tracking-normal text-fg-subtle">{e.indicator.unit}</span>
                          </span>
                          <span className={`mt-2 flex items-center gap-0.5 text-[13px] font-medium ${em.text}`}>
                            {state}
                            <Icon
                              name="chevron"
                              className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                            />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {flagged.length > CHIPS && (
                  <button
                    type="button"
                    onClick={() => document.getElementById('readings-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="mt-6 flex items-center gap-1 text-[13px] text-fg-subtle transition-colors duration-150 hover:text-accent"
                  >
                    {flagged.length - CHIPS} more in your readings
                    <Icon name="chevron" className="size-3.5 rotate-90" />
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* The right column: the body, and under it the readings counted by status. */}
          <motion.div {...rise(0.9)} className="flex flex-col gap-3 lg:col-span-4 lg:w-full lg:max-w-sm lg:justify-self-end">
            {/* The same unframed astronaut as the welcome, a little shorter to leave room for the counts. */}
            <div className="h-80 sm:h-[26rem] lg:h-[min(56svh,32rem)]">{model}</div>
            <aside aria-label="Readings by status" className="brackets rounded-sm bg-ink-950/45 px-5 py-4 backdrop-blur-md">
              <dl className="grid grid-cols-4 gap-3">
                {counts.map(([s, n]) => (
                  <div key={s} className="flex flex-col-reverse">
                    <dt className="mt-1 text-[11px] text-fg-muted">{STATUS_META[s].label}</dt>
                    <dd className={`display text-[2.75rem] tabular-nums ${n > 0 && s !== 'nominal' && s !== 'unknown' ? STATUS_META[s].text : 'text-fg'}`}>
                      {n}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          </motion.div>
        </div>
        )}
      </div>
    </section>
  )
}

const STEPS: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'heart', title: 'Log a reading', detail: 'Heart rate, sleep, mood and more.' },
  { icon: 'trends', title: 'Watch your trends', detail: 'Catch a drift before it becomes a problem.' },
  { icon: 'send', title: 'Report to ground', detail: 'Send the week to your flight surgeon.' },
]

type Rise = (delay: number) => object

/**
 * Before the first reading: a welcome, what the app will do once there is data (three steps,
 * in the order they happen), and two ways in — log for real, or look around with demo data.
 * The astronaut stands beside it at full height, unframed.
 */
function Welcome({
  model,
  rise,
  reduce,
  onLog,
  onTryDemo,
}: {
  model: ReactNode
  rise: Rise
  reduce: boolean | null
  onLog: () => void
  onTryDemo: () => void
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-7">
        <motion.p {...rise(0.1)} className="font-mono text-[13px] font-medium tracking-[0.28em] text-accent uppercase">
          Welcome aboard
        </motion.p>
        <h2 id="status-headline" className="display mt-5 text-[clamp(3rem,6.6vw,6rem)] text-fg">
          {['Your mission', 'starts with you'].map((line, i) => (
            <motion.span
              key={line}
              className="block"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.35em' }}
              animate={{ opacity: 1, y: '0em' }}
              transition={reduce ? { duration: 0.3 } : { ...SPRING, delay: 0.2 + i * 0.1 }}
            >
              {line}
              {i === 1 && <span className="text-accent">.</span>}
            </motion.span>
          ))}
        </h2>
        <motion.div {...rise(0.45)} className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
          <button type="button" onClick={onLog} className="group btn btn-primary min-h-12 px-6">
            Log first reading
            <Icon name="arrow" className="size-4.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={onTryDemo}
            className="min-h-11 text-[15px] font-medium text-fg-muted underline decoration-mist/30 underline-offset-4 transition-colors duration-150 hover:text-fg hover:decoration-fg"
          >
            Try it with demo data
          </button>
        </motion.div>

        <motion.ol
          {...rise(0.58)}
          aria-label="How it works"
          className="mt-12 grid max-w-2xl gap-5 border-t border-mist/15 pt-6 sm:grid-cols-3 sm:gap-0"
        >
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 sm:border-l sm:border-mist/15 sm:px-5 sm:first:border-l-0 sm:first:pl-0">
              <Icon name={step.icon} strokeWidth={1.6} className="mt-0.5 size-6 shrink-0 text-accent" />
              <div className="min-w-0">
                <span className="block font-mono text-[11px] tracking-[0.08em] text-accent" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mt-0.5 block text-[15px] font-medium text-fg">{step.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-fg-subtle">{step.detail}</span>
              </div>
            </li>
          ))}
        </motion.ol>
      </div>

      <motion.div {...rise(0.8)} className="h-80 sm:h-[28rem] lg:col-span-5 lg:h-[min(70svh,42rem)]">
        {model}
      </motion.div>
    </div>
  )
}
