import { motion } from 'framer-motion'
import { useState } from 'react'
import { checksBetween } from '../content/nasaSchedule'
import type { Progress } from '../engine/gamification'
import type { DueItem } from '../engine/types'
import { timeAgo } from '../lib/status'
import { SectionTitle } from './Card'
import { Icon } from './Icon'

const SHOWN = 6

type Task =
  | { kind: 'log'; id: string; title: string; detail: string }
  | { kind: 'nasa'; id: string; title: string; detail: string }

/**
 * One list for the day: measurements that are due, then NASA's checks scheduled for today.
 * The first few show (two columns when the card is wide); the rest are one tap away, so the
 * list never fills the screen.
 */
export function TodayCard({
  due,
  progress,
  missionDay,
  now,
  onLog,
  onOpenRequirement,
  onOpenPlan,
}: {
  due: DueItem[]
  progress: Progress
  missionDay: number
  now: number
  onLog: (indicatorId: string) => void
  onOpenRequirement: (requirementId: string) => void
  onOpenPlan: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const tasks: Task[] = [
    ...due.map(({ indicator, lastTimestamp }) => ({
      kind: 'log' as const,
      id: indicator.id,
      title: indicator.label,
      detail: lastTimestamp ? `Last logged ${timeAgo(lastTimestamp, now)}` : 'Not logged yet',
    })),
    ...checksBetween(missionDay, 0).map((i) => ({
      kind: 'nasa' as const,
      id: i.requirement.id,
      title: i.title,
      detail: `NASA check${i.check.minutes ? ` · about ${i.check.minutes} min` : ''}`,
    })),
  ]
  const visible = expanded ? tasks : tasks.slice(0, SHOWN)
  const hidden = tasks.length - visible.length
  const { done, total } = progress.today
  const pct = total ? (done / total) * 100 : 0

  return (
    <section id="today" aria-labelledby="today-title" className="surface @container flex h-full scroll-mt-20 flex-col p-4 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <SectionTitle id="today-title">Today</SectionTitle>
          <p className="mt-1.5 text-sm text-fg-muted tabular-nums">
            {total === 0 ? (
              'No measurements scheduled'
            ) : (
              <>
                {done === total ? `All ${total}` : `${done} of ${total}`}
                <span className="hidden @sm:inline"> measurements</span> logged
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={onOpenPlan} className="btn btn-plain btn-sm shrink-0">
          NASA’s plan <Icon name="chevron" className="size-3.5" />
        </button>
      </header>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/8" aria-hidden>
        <motion.div
          className={`h-full rounded-full ${pct === 100 ? 'bg-nominal' : 'bg-accent'}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
        />
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 items-center gap-3 pt-5 pb-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-nominal/12 text-nominal" aria-hidden>
            <Icon name="check" className="size-4.5" />
          </span>
          <p className="text-sm">
            <span className="block font-medium text-fg">All done for today</span>
            <span className="block text-fg-subtle">Nothing else is due. Nice work.</span>
          </p>
        </div>
      ) : (
        <ul className="-mx-2 mt-3 grid gap-x-3 gap-y-0.5 @2xl:grid-cols-2">
          {visible.map((t) => (
            <li key={`${t.kind}-${t.id}`}>
              <button
                type="button"
                onClick={() => (t.kind === 'log' ? onLog(t.id) : onOpenRequirement(t.id))}
                className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-mist/8"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    t.kind === 'log' ? 'bg-accent/12 text-accent' : 'bg-mist/8 text-fg-muted'
                  }`}
                  aria-hidden
                >
                  <Icon name={t.kind === 'log' ? 'plus' : 'resources'} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block truncate text-xs text-fg-subtle">{t.detail}</span>
                </span>
                {t.kind === 'log' ? (
                  <span className="btn btn-tinted btn-sm pointer-events-none group-hover:bg-accent/20">Log</span>
                ) : (
                  <Icon name="chevron" className="size-4 shrink-0 text-fg-subtle group-hover:text-fg" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {tasks.length > SHOWN && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 flex items-center gap-1 self-start text-xs font-medium text-accent hover:underline"
        >
          {expanded ? 'Show less' : `Show ${hidden} more`}
          <Icon name="chevron" className={`size-3.5 transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      )}
    </section>
  )
}
