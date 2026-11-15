import { motion } from 'framer-motion'
import { useState } from 'react'
import { DOSE_ID, radiationAdvice, type LimitUse, type RadiationState } from '../engine/radiation'
import { STATUS_META, timeAgo } from '../lib/status'
import { SectionTitle } from './Card'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'

const SHOWN = 3

const mSv = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1))
const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const inDays = (n: number) => (n < 1 ? 'Today' : n < 2 ? 'Tomorrow' : `In ${Math.floor(n).toLocaleString()} days`)

/** When a limit is reached at this rate, in words. */
function when(l: LimitUse): { value: string; detail: string } {
  if (l.daysLeft === 0) return { value: 'Reached', detail: 'Tell the flight surgeon' }
  if (l.daysLeft === null) return { value: 'Not at this rate', detail: '' }
  return { value: inDays(l.daysLeft), detail: shortDate(l.reachedAt!) }
}

/**
 * How much radiation the astronaut has taken in and how long until each of NASA's limits at
 * this rate. The dose is the headline; the limit reached first gets the sentence under it,
 * because "how long do I have" is the question the card answers.
 */
export function RadiationCard({
  state,
  missionDay,
  environmentLabel,
  now,
  onLog,
}: {
  state: RadiationState
  missionDay: number
  environmentLabel: string
  now: number
  onLog: (indicatorId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const advice = radiationAdvice(state, now)
  const visible = expanded ? advice : advice.slice(0, SHOWN)
  const first = state.nearest
  const firstWhen = when(first)

  const headline =
    first.daysLeft === 0
      ? `You are past NASA’s ${first.label.toLowerCase()}.`
      : first.daysLeft === null
        ? 'At this rate you stay under all of NASA’s limits.'
        : `At this rate you reach NASA’s ${first.label.toLowerCase()} on mission day ${(missionDay + Math.floor(first.daysLeft)).toLocaleString()}.`

  return (
    <section id="radiation" aria-labelledby="radiation-title" className="surface @container scroll-mt-20 p-4 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTitle id="radiation-title">Radiation</SectionTitle>
            <StatusBadge status={state.status} />
          </div>
          <p className="mt-1.5 text-sm text-fg-muted">{environmentLabel}</p>
        </div>
        <button type="button" onClick={() => onLog(DOSE_ID)} className="btn btn-tinted btn-sm shrink-0">
          <Icon name="radiation" className="size-3.5" /> Log dosimeter
        </button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @3xl:gap-8">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-4xl leading-none font-semibold tracking-[-0.02em] text-fg tabular-nums">{mSv(state.total)}</span>
            <span className="text-sm text-fg-muted">mSv since launch</span>
          </p>
          <p className="mt-1.5 text-xs text-fg-subtle tabular-nums">
            {state.measured && state.lastReadingAt !== null
              ? `Dosimeter read ${timeAgo(state.lastReadingAt, now)}`
              : 'Estimated: no dosimeter reading yet'}
            {' · '}
            {state.ratePerDay.toFixed(state.ratePerDay >= 10 ? 0 : 2)} mSv a day{' '}
            {state.rateFrom === 'dosimeter' ? 'from your dosimeter' : 'typical here'}
          </p>
          <p className="mt-3 text-sm text-fg">
            {headline}{' '}
            {first.daysLeft !== null && first.daysLeft > 0 && (
              <span className="text-fg-muted tabular-nums">
                That’s {inDays(first.daysLeft).toLowerCase()}, around {firstWhen.detail}.
              </span>
            )}
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-3.5" aria-label="NASA’s dose limits">
            {state.limits.map((l) => (
              <LimitRow key={l.id} limit={l} />
            ))}
          </ul>
        </div>

        <div className="border-t border-line pt-4 @3xl:border-t-0 @3xl:border-l @3xl:pt-0 @3xl:pl-8">
          <h3 className="text-xs font-medium text-fg-muted">What to do</h3>
          <ul className="mt-2 grid gap-3">
            {visible.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${a.warn ? 'bg-caution/14 text-caution' : 'bg-accent/12 text-accent'}`}
                  aria-hidden
                >
                  <Icon name={a.warn ? 'alert' : 'info'} className="size-3.5" />
                </span>
                <p className="min-w-0 text-sm">
                  <span className="block font-medium text-fg">{a.title}</span>
                  <span className="mt-0.5 block leading-snug text-fg-muted">{a.body}</span>
                </p>
              </li>
            ))}
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
          <p className="mt-4 text-xs leading-5 text-fg-subtle">
            Limits from NASA-STD-3001. The career limit is the same for every astronaut, whatever their age or sex.
          </p>
        </div>
      </div>
    </section>
  )
}

/** One limit: how full it is, as a bar, and when it fills at this rate. */
function LimitRow({ limit: l }: { limit: LimitUse }) {
  const meta = STATUS_META[l.status]
  const w = when(l)
  const fill = Math.min(l.fraction, 1)
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-fg">{l.label}</span>
        <span className="text-xs text-fg-muted tabular-nums">
          {mSv(l.used)} of {l.mSv} mSv
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist/15"
        role="meter"
        aria-label={l.label}
        aria-valuemin={0}
        aria-valuemax={l.mSv}
        aria-valuenow={Math.round(l.used)}
        aria-valuetext={`${mSv(l.used)} of ${l.mSv} mSv, ${meta.label.toLowerCase()}`}
      >
        <motion.div
          className={`h-full origin-left rounded-full ${meta.dot}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(fill, 0.01) }}
          transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
        />
      </div>
      <p className="mt-1 flex justify-between gap-3 text-xs leading-snug text-fg-subtle tabular-nums">
        <span className="min-w-0">{l.protects}</span>
        <span className={`shrink-0 ${l.daysLeft !== null && l.daysLeft < 30 ? meta.text : ''}`}>
          {w.value}
          {l.daysLeft !== null && l.daysLeft > 0 && ` · ${w.detail}`}
        </span>
      </p>
    </li>
  )
}
