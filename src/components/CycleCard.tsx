import { useState } from 'react'
import {
  HORMONAL,
  LUTEAL_SHIFT,
  PHASE_LABEL,
  cycleAdvice,
  cycleDays,
  cycleState,
  logPeriodEnd,
  logPeriodStart,
  type Cycle,
  type Phase,
} from '../engine/cycle'
import { useHealthStore } from '../store/useHealthStore'
import { useToastStore } from '../store/useToastStore'
import { SectionTitle } from './Card'
import { Icon } from './Icon'

const SHOWN = 3

/** Each phase's colour on the strip: the period in rose, the luteal phase in lavender, the rest in teal. */
const SWATCH: Partial<Record<Phase, string>> = {
  period: 'bg-period',
  follicular: 'bg-sea/55',
  ovulation: 'bg-accent',
  luteal: 'bg-luteal/70',
  active: 'bg-sea/55',
  late: 'bg-mist/15',
}
const LEGEND: { phase: Phase; label: string }[] = [
  { phase: 'period', label: 'Period' },
  { phase: 'follicular', label: 'Follicular' },
  { phase: 'ovulation', label: 'Ovulation' },
  { phase: 'luteal', label: 'Luteal' },
]

const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const inDays = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`)

/**
 * The astronaut's cycle at a glance: where she is in it, the days ahead as a strip, the next
 * period, and what to do today. One button logs a period starting or ending.
 */
export function CycleCard({ cycle, now }: { cycle: Cycle; now: number }) {
  const updateCycle = useHealthStore((s) => s.updateCycle)
  const updateMission = useHealthStore((s) => s.updateMission)
  const showToast = useToastStore((s) => s.show)
  const [expanded, setExpanded] = useState(false)

  const state = cycleState(cycle, now)
  const advice = cycleAdvice(cycle, state)
  const visible = expanded ? advice : advice.slice(0, SHOWN)
  const days = state.day !== null && state.mode !== 'suppressed' ? cycleDays(cycle, state) : null

  // Logging replaces the cycle, so Undo puts the one from before back.
  const log = (kind: 'start' | 'end') => {
    const before = cycle
    updateCycle((c) => (kind === 'start' ? logPeriodStart(c, now) : logPeriodEnd(c, now)))
    showToast({
      message: kind === 'start' ? 'Period start logged for today' : 'Period end logged for today',
      action: { label: 'Undo', run: () => updateMission({ cycle: before }) },
    })
  }

  const subtitle =
    state.day === null
      ? state.mode === 'suppressed'
        ? 'Periods suppressed'
        : 'No period logged yet'
      : state.mode === 'suppressed'
        ? state.bleeding
          ? `Bleeding, day ${state.day}`
          : 'Periods suppressed'
        : `Day ${state.day} of ${state.length} · ${PHASE_LABEL[state.phase]}`

  const facts: { label: string; value: string; detail: string }[] = []
  if (state.nextStart !== null && state.daysUntil !== null)
    facts.push(
      state.daysUntil >= 0
        ? { label: 'Next period', value: inDays(state.daysUntil), detail: `${shortDate(state.nextStart)} ± ${state.window} days` }
        : { label: 'Next period', value: `${-state.daysUntil} days late`, detail: `Expected ${shortDate(state.nextStart)}` },
    )
  if (state.ovulationDay !== null && state.day !== null && state.day < state.ovulationDay - 1)
    facts.push({ label: 'Ovulation', value: inDays(state.ovulationDay - state.day), detail: cycle.pattern === 'irregular' ? 'A rough estimate' : `Around day ${state.ovulationDay}` })
  if (state.phase === 'luteal')
    facts.push({ label: 'Baselines', value: `+${LUTEAL_SHIFT.temperature} °C · +${LUTEAL_SHIFT.heartRate} bpm`, detail: 'Allowed for in trends' })
  facts.push({
    label: 'Method',
    value: cycle.hormonal ? HORMONAL.find((h) => h.id === cycle.hormonal)!.label : 'Natural cycle',
    detail: state.learned ? `Length learned from your periods` : cycle.pattern === 'irregular' ? 'Irregular, so wider estimates' : `Typical ${cycle.cycleLength}-day cycle`,
  })

  return (
    <section id="cycle" aria-labelledby="cycle-title" className="surface @container scroll-mt-20 p-4 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <SectionTitle id="cycle-title">Your cycle</SectionTitle>
          <p className="mt-1.5 text-sm text-fg-muted tabular-nums">{subtitle}</p>
        </div>
        <button type="button" onClick={() => log(state.bleeding ? 'end' : 'start')} className="btn btn-tinted btn-sm shrink-0">
          {state.bleeding ? (
            <>
              <Icon name="check" className="size-3.5" /> Period ended
            </>
          ) : (
            <>
              <Icon name="drop" className="size-3.5" /> {state.mode === 'suppressed' ? 'Log bleeding' : 'Period started'}
            </>
          )}
        </button>
      </header>

      <div className="mt-4 grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @3xl:gap-8">
        <div>
          {days && state.day !== null && (
            <figure className="mb-4">
              <ol className="flex h-4 items-center gap-[3px]" aria-label={`Cycle strip, today is day ${state.day}`}>
                {days.map((phase, i) => {
                  const today = i + 1 === state.day
                  return (
                    <li
                      key={i}
                      aria-hidden={!today}
                      className={`min-w-0 flex-1 rounded-full ${SWATCH[phase] ?? 'bg-mist/15'} ${
                        today ? 'h-4 ring-2 ring-fg ring-offset-2 ring-offset-ink-900' : i + 1 < state.day! ? 'h-2 opacity-45' : 'h-2'
                      }`}
                    >
                      {today && <span className="sr-only">Today, day {state.day}: {PHASE_LABEL[phase]}</span>}
                    </li>
                  )
                })}
              </ol>
              <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
                {LEGEND.filter((l) => state.mode === 'natural' || l.phase === 'period').map((l) => (
                  <span key={l.phase} className="inline-flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${SWATCH[l.phase]}`} aria-hidden />
                    {l.label}
                  </span>
                ))}
                {state.mode === 'withdrawal' && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${SWATCH.active}`} aria-hidden />
                    Between bleeds
                  </span>
                )}
              </figcaption>
            </figure>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-xs text-fg-subtle">{f.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-fg tabular-nums">{f.value}</dd>
                <dd className="truncate text-xs text-fg-subtle tabular-nums">{f.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        {advice.length > 0 && (
          <div className="border-t border-line pt-4 @3xl:border-t-0 @3xl:border-l @3xl:pt-0 @3xl:pl-8">
            <h3 className="text-xs font-medium text-fg-muted">For today</h3>
            <ul className="mt-2 grid gap-3">
              {visible.map((a) => {
                const warn = a.id === 'clot' || (a.id === 'late' && /a week or more/.test(a.body))
                return (
                  <li key={a.id} className="flex gap-3">
                    <span
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${warn ? 'bg-caution/14 text-caution' : 'bg-accent/12 text-accent'}`}
                      aria-hidden
                    >
                      <Icon name={warn ? 'alert' : 'info'} className="size-3.5" />
                    </span>
                    <p className="min-w-0 text-sm">
                      <span className="block font-medium text-fg">{a.title}</span>
                      <span className="mt-0.5 block leading-snug text-fg-muted">{a.body}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
            {advice.length > SHOWN && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="mt-3 flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                {expanded ? 'Show less' : `Show ${advice.length - SHOWN} more`}
                <Icon name="chevron" className={`size-3.5 transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
